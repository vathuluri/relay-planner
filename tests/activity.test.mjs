import {test} from 'node:test';import assert from 'node:assert/strict';import {createConnectionHandler,createActivityHandler,encryptedFeedKey} from '../server/activity.mjs';import {createVaultKeys,open} from '../public/crypto.js';import {encryptActivity,sendActivity} from '../scripts/report-activity.mjs';import {taskTimeLabel} from '../public/activity-time.js';
const keys=await createVaultKeys('alice');
function fixture(){let user={id:'alice'},n=0;const map=new Map([['users/alice/schedule',{etag:'v',data:{format:'relay-e2ee-v1',keys:keys.record}}]]);const store={async getWithMetadata(k){return map.get(k)||null;},async setJSON(k,data,opts={}){const old=map.get(k);if(opts.onlyIfNew&&old||opts.onlyIfMatch&&old?.etag!==opts.onlyIfMatch)return {modified:false};const etag=String(++n);map.set(k,{data,etag});return {modified:true,etag};}};return {map,user:v=>user=v,connections:createConnectionHandler({getUser:async()=>user,getStore:()=>store}),activity:createActivityHandler({getStore:()=>store})};}
const req=(method,body,token)=>new Request('https://relay.example/api',{method,headers:{Origin:'https://relay.example','Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
const event=(id='run-1')=>({runId:id,title:'Synthetic private receipt',kind:'automation',agent:'Local runner',status:'done',startedAt:'2026-11-14T00:00:00Z',completedAt:'2026-11-14T00:01:00Z'});
async function connect(f){return (await f.connections(req('POST',{timeZone:'America/New_York'}))).json();}
test('encrypted append-only reporting keeps content and token out of storage; receiver cannot decrypt',async()=>{
 const f=fixture(),c=await connect(f),packet=await encryptActivity(c,event());assert.equal((await f.activity(req('POST',packet,c.token))).status,201);
 const raw=JSON.stringify([...f.map.values()]);assert.ok(!raw.includes(event().title));assert.ok(!raw.includes(c.token));assert.ok(!raw.includes(keys.recovery));
 const row=f.map.get(encryptedFeedKey('alice')).data.records[0],task=await open(row.envelope,keys.privateKey,'alice',row.id);assert.equal(task.date,'2026-11-13');assert.equal(task.owner,'automation');assert.equal(taskTimeLabel(task),'Finished 7:01 PM');
 assert.equal((await f.activity(req('GET',null,c.token))).status,405);assert.equal((await f.activity(req('POST',event(),c.token))).status,400);
});
test('exact ciphertext retries deduplicate and simultaneous encrypted reports are retained',async()=>{
 const f=fixture(),c=await connect(f),packet=await encryptActivity(c,event());await f.activity(req('POST',packet,c.token));assert.equal((await(await f.activity(req('POST',packet,c.token))).json()).duplicate,true);
 const changed=await encryptActivity(c,{...event(),title:'Different'});assert.equal((await f.activity(req('POST',changed,c.token))).status,409);
 const packets=await Promise.all(['two','three'].map(id=>encryptActivity(c,event(id))));const results=await Promise.all(packets.map(p=>f.activity(req('POST',p,c.token))));assert.ok(results.every(r=>r.status===201));assert.equal(f.map.get(encryptedFeedKey('alice')).data.records.length,3);
});
test('revocation, rotation, account authorization and malformed envelopes fail closed',async()=>{
 const f=fixture(),c=await connect(f),packet=await encryptActivity(c,event());assert.equal((await f.activity(req('POST',packet))).status,401);assert.equal((await f.activity(req('POST',{...packet,accountId:'bob'},c.token))).status,400);
 assert.equal((await f.activity(req('POST',{...packet,envelope:{...packet.envelope,iv:'bad'}},c.token))).status,400);
 const next=await connect(f);assert.equal((await f.activity(req('POST',packet,c.token))).status,401);await f.connections(req('DELETE'));assert.equal((await f.activity(req('POST',packet,next.token))).status,401);
 f.user(null);assert.equal((await f.connections(req('POST',{timeZone:'UTC'}))).status,401);
});
test('reporter sends only ciphertext over HTTPS and validates real timestamps before encryption',async()=>{
 const f=fixture(),c=await connect(f),packet=await encryptActivity(c,event());let sent;
 await sendActivity(c,packet,async(url,options)=>{sent=options.body;return Response.json({accepted:true});});assert.ok(!sent.includes(event().title));assert.ok(!sent.includes('completedAt'));
 await assert.rejects(()=>sendActivity({...c,endpoint:'http://relay.example'},packet));await assert.rejects(()=>encryptActivity(c,{...event(),completedAt:'yesterday'}));assert.equal(taskTimeLabel({status:'done',time:''}),'Time not recorded');
});
