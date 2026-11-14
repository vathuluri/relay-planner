import {test} from 'node:test';import assert from 'node:assert/strict';
import {createScheduleHandler} from '../server/schedules.mjs';import {createVaultKeys,seal,open} from '../public/crypto.js';
import {feedKey,encryptedFeedKey} from '../server/activity.mjs';
const alice=await createVaultKeys('alice'),bob=await createVaultKeys('bob');
const tasks=[{id:'synthetic',title:'Private synthetic title',project:'launch',owner:'human',status:'done',date:'2026-11-13',time:'',history:[]}];
const envelope=await seal({tasks},alice.record.publicKey,'alice','schedule');
export function fixture(){const data=new Map();let current={id:'alice'},serial=0;const store={async getWithMetadata(k){return data.get(k)??null;},async delete(k){data.delete(k);},async setJSON(k,v,options={}){const old=data.get(k);if(options.onlyIfNew&&old||options.onlyIfMatch&&old?.etag!==options.onlyIfMatch)return {modified:false};const etag=String(++serial);data.set(k,{data:v,etag});return {modified:true,etag};}};return {handler:createScheduleHandler({getUser:async()=>current,getStore:()=>store}),user:v=>current=v,data,store};}
const req=(method='GET',body,origin='https://relay.example')=>new Request('https://relay.example/api',{method,headers:{origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify({accountId:'alice',...body})}:{})});
const migration=(extra={})=>({migrate:true,feedVersion:null,keys:alice.record,envelope,version:null,...extra});
test('migration preserves exact records, stores ciphertext only and rejects old plaintext clients',async()=>{
 const f=fixture();f.data.set('users/alice/schedule',{etag:'old',data:{tasks}});
 const before=await(await f.handler(req())).json();assert.deepEqual(before.tasks,tasks);
 assert.equal((await f.handler(req('PUT',migration({version:'old'})))).status,200);
 const saved=await(await f.handler(req())).json();assert.equal(saved.tasks,undefined);assert.deepEqual((await open(saved.vault.envelope,alice.privateKey,'alice','schedule')).tasks,tasks);
 assert.ok(!JSON.stringify([...f.data.values()]).includes(tasks[0].title));
 assert.equal((await f.handler(req('PUT',{version:saved.version,tasks}))).status,400);
});
test('account isolation, stale migration/feed conflicts and concurrent updates preserve records',async()=>{
 const f=fixture();f.user(null);assert.equal((await f.handler(req())).status,401);f.user({id:'alice'});
 assert.equal((await f.handler(req('PUT',migration({accountId:'bob'})))).status,409);
 f.data.set(feedKey('alice'),{etag:'feed-old',data:{records:[{task:tasks[0]}]}});
 assert.equal((await f.handler(req('PUT',migration()))).status,409);
 assert.equal((await f.handler(req('PUT',migration({feedVersion:'feed-old'})))).status,200);
 const saved=await(await f.handler(req())).json();const next=await seal({tasks:[]},alice.record.publicKey,'alice','schedule');
 const results=await Promise.all([f.handler(req('PUT',{keys:alice.record,envelope:next,version:saved.version})),f.handler(req('PUT',{keys:alice.record,envelope,version:saved.version}))]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 f.user({id:'bob'});const b=await(await f.handler(req())).json();assert.equal(b.vault,undefined);assert.deepEqual(b.tasks,[]);
});
test('cleanup requires verified current migration version and never deletes encrypted agent receipts',async()=>{
 const f=fixture();f.data.set(feedKey('alice'),{etag:'f1',data:{records:[{task:tasks[0]}]}});
 await f.handler(req('PUT',migration({feedVersion:'f1'})));const saved=await(await f.handler(req())).json();
 f.data.set(encryptedFeedKey('alice'),{etag:'new',data:{records:[{id:'encrypted'}]}});
 assert.ok(f.data.has(feedKey('alice')));assert.equal((await f.handler(req('POST',{action:'confirm-migration',version:'stale'}))).status,409);
 assert.equal((await f.handler(req('POST',{action:'confirm-migration',version:saved.version}))).status,200);
 assert.ok(!f.data.has(feedKey('alice')));assert.ok(f.data.has(encryptedFeedKey('alice')));
});
test('cross-origin, malformed ciphertext, private key upload and key replacement are refused',async()=>{
 const f=fixture();assert.equal((await f.handler(req('PUT',migration(),'https://other.example'))).status,403);
 for(const bad of [{...envelope,iv:'bad'},{...envelope,title:'plaintext'}])assert.equal((await f.handler(req('PUT',migration({envelope:bad})))).status,400);
 assert.equal((await f.handler(req('PUT',migration({keys:{...alice.record,publicKey:{...alice.record.publicKey,d:'private'}}})))).status,400);
 await f.handler(req('PUT',migration()));const saved=await(await f.handler(req())).json();assert.equal((await f.handler(req('PUT',{version:saved.version,keys:bob.record,envelope}))).status,409);
});
test('identity and storage outages fail closed',async()=>{for(const h of [createScheduleHandler({getUser:async()=>{throw Error();},getStore:()=>{throw Error();}}),createScheduleHandler({getUser:async()=>({id:'alice'}),getStore:()=>{throw Error();}})])assert.ok([401,503].includes((await h(req())).status));});
