import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {createVaultKeys,seal,open,unb64,b64} from '../public/crypto.js';
import * as vault from '../public/vault-client.js';
import {showReceiptWarning} from '../public/receipt-integrity.js';

const accountId='synthetic-integrity',keys=await createVaultKeys(accountId);
const manual={id:'manual',title:'Synthetic planned work',status:'planned'};
const id=n=>'activity-'+String(n).repeat(40);
async function record(n,changes={}){
 const task={id:id(n),title:'Synthetic receipt '+n,status:'review',history:[],activity:{agent:'Synthetic runner'},...changes};
 return {id:id(n),keyId:keys.record.keyId,envelope:await seal(task,keys.record.publicKey,accountId,id(n))};
}
function corrupt(record){const bytes=unb64(record.envelope.ciphertext);bytes[0]^=1;return {...record,envelope:{...record.envelope,ciphertext:b64(bytes)}};}
async function fixture(feed,reviews={}){return {accountId,vault:{keys:keys.record,envelope:await seal({tasks:[manual],reviews},keys.record.publicKey,accountId,'schedule')},feed};}

test('corrupt receipt does not block healthy tasks',async()=>{
 const first=await record(1),bad=corrupt(await record(2)),last=await record(3);
 const data=await fixture([first,bad,last]),before=JSON.stringify(data);
 const tasks=await vault.decodeSchedule(data,keys.privateKey);
 assert.deepEqual(tasks.map(t=>t.id),[manual.id,id(1),id(3)]);
 assert.equal(JSON.stringify(data),before,'never delete or rewrite encrypted source receipts');
});

test('rejected receipts are counted without exposing unverified content',async()=>{
 const mismatched=await record(4,{id:id(9)}),invalid=await record(5,{activity:null});
 const wrongKey={...await record(6),keyId:'wrong-public-key-id'};
 const data=await fixture([corrupt(await record(1)),mismatched,invalid,wrongKey,null]);
 const result=await vault.decodeScheduleState(data,keys.privateKey);
 assert.deepEqual(result.tasks,[manual]);
 assert.deepEqual(result.receiptIssues,[0,1,2,3,4].map(index=>({index,reason:'verification-failed'})));
 assert.equal(JSON.stringify(result.receiptIssues).includes('Synthetic receipt'),false);
});

test('unreadable primary vault still fails closed',async()=>{
 const data=await fixture([await record(1)]);
 await assert.rejects(()=>vault.decodeSchedule({...data,vault:{...data.vault,envelope:corrupt({envelope:data.vault.envelope}).envelope}},keys.privateKey));
 const wrong=await createVaultKeys('synthetic-other');
 await assert.rejects(()=>vault.decodeSchedule(data,wrong.privateKey));
 await assert.rejects(()=>vault.decodeSchedule({...data,accountId:'synthetic-other'},keys.privateKey));
 await assert.rejects(()=>vault.decodeSchedule({...data,feed:{}},keys.privateKey));
});

test('saving healthy work preserves private reviews for rejected receipts',async()=>{
 const receipt=await record(2),review={title:'Synthetic private title override',status:'done',history:[{text:'Reviewed',at:'2026-11-19T00:00:00Z'}]};
 const data=await fixture([corrupt(receipt)],{[receipt.id]:review});
 const result=await vault.decodeScheduleState(data,keys.privateKey);
 assert.deepEqual(result.retainedReviews,{[receipt.id]:review});
 const changed=result.tasks.map(t=>({...t,title:'Updated synthetic plan'}));
 const envelope=await vault.encryptSchedule(changed,{keys:keys.record,accountId,feedIds:[receipt.id],retainedReviews:result.retainedReviews});
 assert.equal(JSON.stringify(envelope).includes(review.title),false);
 assert.deepEqual((await open(envelope,keys.privateKey,accountId,'schedule')).reviews,{[receipt.id]:review});
 const restored=await vault.decodeScheduleState({...data,vault:{...data.vault,envelope},feed:[receipt]},keys.privateKey);
 assert.equal(restored.tasks[0].title,'Updated synthetic plan');
 assert.equal(restored.tasks[1].title,review.title);
 assert.equal(restored.tasks[1].status,'done');
 assert.equal(restored.tasks[1].activity.receiptTitle,'Synthetic receipt 2');
 assert.deepEqual(restored.receiptIssues,[]);
 assert.deepEqual(restored.retainedReviews,{});
});

test('integrity warning stays separate from save status and clears after recovery',async()=>{
 const dom=new JSDOM(await readFile(new URL('../dist/index.html',import.meta.url),'utf8'));
 try{
  const warning=dom.window.document.querySelector('#receipt-integrity-warning');
  assert.ok(warning);assert.ok(warning.closest('#workspace'));assert.equal(warning.closest('details'),null);
  assert.equal(warning.getAttribute('role'),'status');assert.equal(warning.hidden,true);
  showReceiptWarning(warning,[{index:0,reason:'verification-failed'}]);
  assert.equal(warning.hidden,false);assert.match(warning.textContent,/1 report could not be verified/);
  dom.window.document.querySelector('#sync-state').textContent='Encrypted · Saved';
  assert.equal(warning.hidden,false);
  showReceiptWarning(warning,[{},{}]);assert.match(warning.textContent,/2 reports could not be verified/);
  showReceiptWarning(warning,[]);assert.equal(warning.hidden,true);assert.equal(warning.textContent,'');
 }finally{dom.window.close();}
});
