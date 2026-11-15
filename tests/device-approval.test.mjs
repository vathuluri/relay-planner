import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {createVaultKeys,seal,open} from '../public/crypto.js';
import {createDeviceRequest,approveDevice,receiveDevice,deviceCode} from '../public/pairing-crypto.js';
import {wireDeviceRequest,wireDeviceApprovals} from '../public/device-approval.js';
import {createPairingHandler} from '../server/pairings.mjs';

const keys=await createVaultKeys('alice');
test('device exchange decrypts only on the requesting device and binds account, vault, transcript and expiry',async()=>{
 const now=Date.now(),phone=await createDeviceRequest(keys.record.keyId,now),other=await createDeviceRequest(keys.record.keyId,now);
 assert.equal(phone.privateKey.extractable,false);const response=await approveDevice(phone.request,keys.recovery,'alice',now);
 assert.ok(!JSON.stringify(response).includes(keys.recovery));const received=await receiveDevice(phone,response,keys.record,'alice',now);assert.equal(received.extractable,false);
 const envelope=await seal({tasks:['synthetic']},keys.record.publicKey,'alice','schedule');assert.deepEqual((await open(envelope,received,'alice','schedule')).tasks,['synthetic']);
 await assert.rejects(receiveDevice(other,response,keys.record,'alice',now));await assert.rejects(receiveDevice(phone,response,keys.record,'bob',now));
 await assert.rejects(receiveDevice(phone,response,{...keys.record,keyId:other.request.nonce},'alice',now));
 const changed={...phone,request:{...phone.request,nonce:other.request.nonce}};assert.notEqual(await deviceCode('alice',phone.request),await deviceCode('alice',changed.request));await assert.rejects(receiveDevice(changed,response,keys.record,'alice',now));
 await assert.rejects(receiveDevice(phone,{...response,iv:other.request.nonce.slice(0,16)},keys.record,'alice',now));
 await assert.rejects(approveDevice(phone.request,keys.recovery,'alice',phone.request.expiresAt));await assert.rejects(receiveDevice(phone,response,keys.record,'alice',phone.request.expiresAt));
});

function server(){
 let user={id:'alice'},clock=Date.now(),serial=0;const rows=new Map([['users/alice/schedule',{etag:'vault',data:{format:'relay-e2ee-v1',keys:keys.record}}],['users/bob/schedule',{etag:'vault-b',data:{format:'relay-e2ee-v1',keys:keys.record}}]]);
 const store={async getWithMetadata(k){const r=rows.get(k);return r?structuredClone(r):null;},async setJSON(k,value,options){const old=rows.get(k);if(options.onlyIfNew&&old||options.onlyIfMatch&&options.onlyIfMatch!==old?.etag)return {modified:false};const etag=String(++serial);rows.set(k,{etag,data:structuredClone(value)});return {modified:true,etag};}};
 const handler=createPairingHandler({getUser:async()=>user,getStore:()=>store,now:()=>clock});
 const call=(body,origin='https://relay.example')=>handler(new Request('https://relay.example/pairings',{method:body?'POST':'GET',headers:{origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify({accountId:user?.id,...body})}:{})}));
 return {call,rows,user:value=>user=value,now:()=>clock,advance:ms=>clock+=ms};
}
test('pairing API scopes accounts, expires requests, refuses plaintext and consumes once',async()=>{
 const f=server(),phone=await createDeviceRequest(keys.record.keyId,f.now());assert.equal((await f.call({action:'request',request:phone.request})).status,200);
 assert.equal((await f.call({action:'request',request:phone.request})).status,409);
 f.user({id:'bob'});assert.deepEqual((await(await f.call()).json()).requests,[]);assert.equal((await f.call({action:'approve',id:phone.request.id,response:{}})).status,400);
 f.user({id:'alice'});const response=await approveDevice(phone.request,keys.recovery,'alice',f.now());
 assert.equal((await f.call({action:'approve',id:phone.request.id,response:{...response,recovery:keys.recovery}})).status,400);
 assert.equal((await f.call({action:'approve',id:phone.request.id,response},'https://other.example')).status,403);
 assert.equal((await f.call({action:'approve',id:phone.request.id,response})).status,200);assert.equal((await f.call({action:'approve',id:phone.request.id,response})).status,409);
 assert.ok(!JSON.stringify([...f.rows]).includes(keys.recovery));assert.equal((await f.call({action:'consume',id:phone.request.id})).status,200);assert.equal((await f.call({action:'consume',id:phone.request.id})).status,200);
 assert.equal((await(await f.call()).json()).requests[0].response,undefined);assert.equal((await f.call({action:'approve',id:phone.request.id,response})).status,409);
 f.advance(300001);assert.deepEqual((await(await f.call()).json()).requests,[]);assert.equal((await f.call({action:'consume',id:phone.request.id})).status,410);
 f.user(null);assert.equal((await f.call()).status,401);
});
test('concurrent requests survive conditional writes, cancellation removes ciphertext and request limits apply',async()=>{
 const f=server(),phones=await Promise.all(Array.from({length:6},()=>createDeviceRequest(keys.record.keyId,f.now())));
 assert.deepEqual((await Promise.all(phones.slice(0,3).map(p=>f.call({action:'request',request:p.request})))).map(r=>r.status),[200,200,200]);
 for(const p of phones.slice(3,5))assert.equal((await f.call({action:'request',request:p.request})).status,200);
 assert.equal((await f.call({action:'request',request:phones[5].request})).status,429);assert.equal((await(await f.call()).json()).requests.length,5);
 const p=phones[0],response=await approveDevice(p.request,keys.recovery,'alice',f.now());await f.call({action:'approve',id:p.request.id,response});await f.call({action:'cancel',id:p.request.id});const row=(await(await f.call()).json()).requests.find(r=>r.request.id===p.request.id);assert.equal(row.status,'cancelled');assert.equal(row.response,undefined);assert.equal((await f.call({action:'consume',id:p.request.id})).status,409);
});

test('requesting device verifies, consumes and remembers only the approved key without PRF',async()=>{
 const dom=new JSDOM(await readFile(new URL('../dist/index.html',import.meta.url),'utf8')),doc=dom.window.document,previous={document:globalThis.document,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};
 globalThis.document=doc;const callbacks=[];globalThis.setTimeout=fn=>{callbacks.push(fn);return {unref(){}};};globalThis.clearTimeout=()=>{};
 let row,consumed=false,remembered,opened;const envelope=await seal({tasks:[]},keys.record.publicKey,'alice','schedule'),data={accountId:'alice',vault:{keys:keys.record,envelope},version:'v'};
 const api=async body=>{if(!body)return {requests:[row]};if(body.action==='request'){row={request:body.request,status:'approved',response:await approveDevice(body.request,keys.recovery,'alice')};}if(body.action==='consume')consumed=true;return {ok:true};};
 try{
  const wire=wireDeviceRequest({data,api,readSchedule:async()=>data,decodeSchedule:async(d,k)=>open(d.vault.envelope,k,'alice','schedule'),rememberDevice:async(id,value)=>remembered=value,onUnlock:value=>opened=value});
  doc.getElementById('vault-remember').checked=true;await doc.getElementById('pair-request-start').onclick();assert.equal(opened,undefined);await callbacks.shift()();assert.equal(consumed,true);assert.equal(remembered.privateKey.extractable,false);assert.equal(opened.privateKey.extractable,false);wire.stop();
 }finally{Object.assign(globalThis,previous);dom.window.close();}
});

test('approving UI requires explicit matching-code confirmation before releasing ciphertext',async()=>{
 const dom=new JSDOM(await readFile(new URL('../dist/index.html',import.meta.url),'utf8')),doc=dom.window.document,previous=globalThis.document;globalThis.document=doc;
 const dialog=doc.getElementById('device-approval-dialog');dialog.showModal=()=>dialog.open=true;dialog.close=()=>{dialog.open=false;dialog.dispatchEvent(new dom.window.Event('close'));};
 const phone=await createDeviceRequest(keys.record.keyId),transferEnvelope=await seal({recovery:keys.recovery},keys.record.publicKey,'alice','device-transfer:'+keys.record.keyId);let approvals=0;
 try{
  wireDeviceApprovals({accountId:'alice',vault:{keys:keys.record,privateKey:keys.privateKey},readSchedule:async()=>({accountId:'alice',vault:{keys:keys.record,transferEnvelope}}),decodeSchedule:()=>{},onVersion:()=>{},api:async body=>{if(body){approvals++;await receiveDevice(phone,body.response,keys.record,'alice');return {ok:true};}return {requests:[{request:phone.request,status:'pending'}]};}});
  await doc.getElementById('device-approval-open').onclick();const card=doc.querySelector('.device-request-card'),check=card.querySelector('input'),approve=card.querySelector('button');assert.equal(card.querySelector('strong').textContent,await deviceCode('alice',phone.request));assert.equal(approve.disabled,true);await approve.onclick();assert.equal(approvals,0);check.checked=true;check.onchange();assert.equal(approve.disabled,false);await approve.onclick();assert.equal(approvals,1);
 }finally{dialog.close();globalThis.document=previous;dom.window.close();}
});

test('closing the approving dialog while verification is pending prevents release',async()=>{
 const dom=new JSDOM(await readFile(new URL('../dist/index.html',import.meta.url),'utf8')),doc=dom.window.document,previous=globalThis.document;globalThis.document=doc;
 const dialog=doc.getElementById('device-approval-dialog');dialog.showModal=()=>dialog.open=true;dialog.close=()=>{dialog.open=false;dialog.dispatchEvent(new dom.window.Event('close'));};
 const phone=await createDeviceRequest(keys.record.keyId),transferEnvelope=await seal({recovery:keys.recovery},keys.record.publicKey,'alice','device-transfer:'+keys.record.keyId),data={accountId:'alice',vault:{keys:keys.record,transferEnvelope}};let hold=false,release,approvals=0;
 try{
  wireDeviceApprovals({accountId:'alice',vault:{keys:keys.record,privateKey:keys.privateKey},readSchedule:async()=>hold?new Promise(resolve=>release=resolve):data,onVersion:()=>{},api:async body=>{if(body){approvals++;return {ok:true};}return {requests:[{request:phone.request,status:'pending'}]};}});
  await doc.getElementById('device-approval-open').onclick();const card=doc.querySelector('.device-request-card'),check=card.querySelector('input'),button=card.querySelector('button');check.checked=true;check.onchange();hold=true;const pending=button.onclick();dialog.close();release(data);await pending;assert.equal(approvals,0);
 }finally{dialog.close();globalThis.document=previous;dom.window.close();}
});
