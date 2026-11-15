import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {JSDOM} from 'jsdom';import {createScheduleHandler} from '../server/schedules.mjs';import {unlockVault,open} from '../public/crypto.js';
let targetHandler;const fixtureFetch=async(url,options={})=>targetHandler(new Request(new URL(url,'https://relay.example'),{...options,headers:{origin:'https://relay.example','Content-Type':'application/json',...options.headers}}));

test('expired session at Continue preserves the generated recovery key and resumes migration after reauthentication',async()=>{
 const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');const dom=new JSDOM(html,{url:'https://relay.example/'}),doc=dom.window.document;
 const previous={CustomEvent:globalThis.CustomEvent,document:globalThis.document,fetch:globalThis.fetch,create:URL.createObjectURL,revoke:URL.revokeObjectURL};let user={id:'alice'},serial=0,downloads=0,backup;const map=new Map([['users/alice/schedule',{etag:'legacy',data:{tasks:[{id:'synthetic',title:'Private synthetic task'}]}}]]);
 const store={async getWithMetadata(k){return map.get(k)??null;},async delete(k){map.delete(k);},async setJSON(k,v,o={}){const old=map.get(k);if(o.onlyIfMatch&&old?.etag!==o.onlyIfMatch||o.onlyIfNew&&old)return {modified:false};const etag=String(++serial);map.set(k,{etag,data:v});return {modified:true,etag};}};
 const handler=createScheduleHandler({getUser:async()=>user,getStore:()=>store});
 globalThis.document=doc;globalThis.CustomEvent=dom.window.CustomEvent;targetHandler=handler;globalThis.fetch=fixtureFetch;
 URL.createObjectURL=blob=>{backup=blob;downloads++;return 'blob:synthetic';};URL.revokeObjectURL=()=>{};dom.window.HTMLAnchorElement.prototype.click=function(){};
 const oldTimer=globalThis.setTimeout;globalThis.setTimeout=(fn,ms,...rest)=>{const t=oldTimer(fn,ms,...rest);t.unref?.();return t;};
 try{
  const {prepareVault}=await import('../public/vault-client.js');const data=await(await handler(new Request('https://relay.example/api'))).json();const pending=prepareVault(data);
  await doc.getElementById('vault-generate').onclick();assert.equal(downloads,1);const recovery=JSON.parse(await backup.text());
  const checkbox=doc.getElementById('vault-backed-up');checkbox.checked=true;checkbox.onchange();assert.equal(doc.getElementById('vault-submit').disabled,false);
  let reauth=false;doc.addEventListener('relay:reauth',()=>reauth=true);user=null;
  await doc.getElementById('vault-form').onsubmit({preventDefault(){}});assert.ok(reauth);assert.ok(doc.getElementById('vault-message').textContent.includes('preserved'));assert.equal(map.get('users/alice/schedule').etag,'legacy');
  user={id:'alice'};await doc.getElementById('vault-form').onsubmit({preventDefault(){}});await pending;
  assert.equal(downloads,1);const saved=map.get('users/alice/schedule').data;assert.equal(saved.format,'relay-e2ee-v1');
  const recovered=await unlockVault(saved.keys,recovery.recoveryKey,'alice');assert.equal((await open(saved.envelope,recovered,'alice','schedule')).tasks[0].title,'Private synthetic task');assert.ok(!JSON.stringify(saved).includes('Private synthetic task'));
 }finally{globalThis.document=previous.document;globalThis.CustomEvent=previous.CustomEvent;globalThis.fetch=previous.fetch;URL.createObjectURL=previous.create;URL.revokeObjectURL=previous.revoke;globalThis.setTimeout=oldTimer;dom.window.close();}
});

test('passkey-first migration needs no recovery download and unlocks after refresh',async()=>{
 const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');const dom=new JSDOM(html,{url:'https://relay.example/'}),doc=dom.window.document;
 const names=['document','fetch','navigator','PublicKeyCredential','isSecureContext'];const descriptors=Object.fromEntries(names.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));let serial=0;const map=new Map([['users/alice/schedule',{etag:'old',data:{tasks:[{id:'synthetic',title:'Synthetic passkey task'}]}}]]);
 const store={async getWithMetadata(k){return map.get(k)??null;},async delete(k){map.delete(k);},async setJSON(k,v,o={}){const old=map.get(k);if(o.onlyIfMatch&&old?.etag!==o.onlyIfMatch||o.onlyIfNew&&old)return {modified:false};const etag=String(++serial);map.set(k,{etag,data:v});return {modified:true,etag};}};
 const handler=createScheduleHandler({getUser:async()=>({id:'alice'}),getStore:()=>store});const id=new Uint8Array([1,2,3,4]);
 let registrations=0,failVerification=true;const credentials={async create(){registrations++;return {rawId:id,getClientExtensionResults:()=>({prf:{enabled:true}})};},async get(){if(failVerification){failVerification=false;throw new DOMException('Cancelled','NotAllowedError');}return {rawId:id,getClientExtensionResults:()=>({prf:{results:{first:new Uint8Array(32).fill(9).buffer}}})};}};
 targetHandler=handler;const values={document:doc,fetch:fixtureFetch,navigator:{credentials},PublicKeyCredential:class{},isSecureContext:true};
 for(const [k,value] of Object.entries(values))Object.defineProperty(globalThis,k,{configurable:true,writable:true,value});
 try{
  const {prepareVault,decodeSchedule,saveEncrypted}=await import('../public/vault-client.js');const data=await(await handler(new Request('https://relay.example/api'))).json();const pending=prepareVault(data);await doc.getElementById('vault-passkey').onclick();assert.equal(doc.getElementById('vault-passkey').textContent,'Verify passkey');assert.equal(map.get('users/alice/schedule').etag,'old');assert.equal(doc.getElementById('vault-submit').disabled,true);await doc.getElementById('vault-passkey').onclick();assert.match(doc.getElementById('vault-message').textContent,/saved passkey is retained/);assert.equal(map.get('users/alice/schedule').etag,'old');assert.equal(registrations,1);await doc.getElementById('vault-passkey').onclick();assert.equal(registrations,1);assert.match(doc.getElementById('vault-message').textContent,/saved and verified/);assert.equal(doc.getElementById('vault-backed-up').checked,false);assert.equal(doc.getElementById('vault-submit').disabled,false);
  await doc.getElementById('vault-form').onsubmit({preventDefault(){}});assert.ok(data.vault,doc.getElementById('vault-message').textContent);const vault=await pending;assert.equal((await decodeSchedule(data,vault.privateKey))[0].title,'Synthetic passkey task');assert.ok(data.vault.passkey);
  await saveEncrypted([{id:'synthetic',title:'Updated synthetic task'}],{keys:vault.keys,accountId:'alice',version:data.version});const fresh=await(await handler(new Request('https://relay.example/api'))).json();const unlocked=prepareVault(fresh);await new Promise(resolve=>setImmediate(resolve));await doc.getElementById('vault-passkey').onclick();const restored=await unlocked;assert.equal((await decodeSchedule(fresh,restored.privateKey))[0].title,'Updated synthetic task');
 }finally{for(const [k,d] of Object.entries(descriptors)){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}dom.window.close();}
});

test('saved-passkey setup selects an existing credential without registering a fifth one',async()=>{
 const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');const dom=new JSDOM(html,{url:'https://relay.example/'}),doc=dom.window.document;const names=['document','navigator','PublicKeyCredential','isSecureContext'];const previous=Object.fromEntries(names.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));let creates=0,gets=0;
 const credentials={async create(){creates++;throw Error('Must not register');},async get(options){gets++;assert.equal(options.publicKey.allowCredentials,undefined);const userHandle=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('alice'));return {rawId:new Uint8Array([4,3,2,1]),response:{userHandle},getClientExtensionResults:()=>({prf:{results:{first:new Uint8Array(32).fill(7).buffer}}})};}};
 for(const [k,value] of Object.entries({document:doc,navigator:{credentials},PublicKeyCredential:class{},isSecureContext:true}))Object.defineProperty(globalThis,k,{configurable:true,writable:true,value});
 try{const {prepareVault}=await import('../public/vault-client.js');prepareVault({accountId:'alice',tasks:[],version:null,feedVersion:null});await doc.getElementById('vault-use-passkey').onclick();assert.equal(creates,0);assert.equal(gets,1);assert.match(doc.getElementById('vault-message').textContent,/Saved passkey verified/);assert.equal(doc.getElementById('vault-submit').disabled,false);}finally{for(const [k,d] of Object.entries(previous)){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}dom.window.close();}
});
