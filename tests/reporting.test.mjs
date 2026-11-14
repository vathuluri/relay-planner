import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,writeFile,readFile,readdir,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {spawnSync} from 'node:child_process';
import {createVaultKeys,open} from '../public/crypto.js';import {reportEvent,flushReports} from '../scripts/report-activity.mjs';import {learningDraft} from '../scripts/report-work.mjs';
test('offline queue is ciphertext, retries reuse identical packets, and completed IDs remain idempotent',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'relay-report-test-'));try{
  const keys=await createVaultKeys('synthetic');const configFile=join(dir,'config.json');await writeFile(configFile,JSON.stringify({format:'relay-e2ee-v1',keyId:keys.record.keyId,publicKey:keys.record.publicKey,accountId:'synthetic',timeZone:'UTC',endpoint:'https://relay.example/activity',token:'rly_'+ '0'.repeat(64)}));
  const event={runId:'fixed',title:'Private synthetic work',kind:'agent',status:'done',completedAt:'2026-11-14T01:00:00Z',summary:'Never store this in the outbox as plaintext.'};
  const offline={directory:dir,configFile,fetcher:async()=>{throw Error('Offline');}};assert.equal((await reportEvent(event,offline)).queued,true);
  const file=(await readdir(join(dir,'outbox')))[0],text=await readFile(join(dir,'outbox',file),'utf8');assert.ok(!text.includes(event.title));assert.ok(!text.includes(event.summary));const record=JSON.parse(text);
  assert.equal((await open(record.packet.envelope,keys.privateKey,'synthetic',record.packet.id)).title,event.title);
  let sent;const online={...offline,fetcher:async(url,o)=>{sent=o.body;return Response.json({accepted:true});}};
  assert.equal(await flushReports(online),1);assert.equal(sent,JSON.stringify(record.packet));assert.equal((await readdir(join(dir,'outbox'))).length,0);
  await reportEvent(event,online);assert.equal(sent,JSON.stringify(record.packet));await assert.rejects(()=>reportEvent({...event,title:'Changed'},online));
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('wrapper preserves child failure even if no reporting connection exists',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'relay-wrapper-test-'));try{const child=spawnSync(process.execPath,['scripts/report-activity.mjs','run','--title','Synthetic check','--',process.execPath,'-e','process.exit(7)'],{env:{...process.env,RELAY_DATA_DIR:dir,RELAY_CONFIG:join(dir,'missing.json')},encoding:'utf8'});assert.equal(child.status,7);assert.ok(child.stderr.includes('No plaintext outbox'));assert.deepEqual(await readdir(dir),[]);}finally{await rm(dir,{recursive:true,force:true});}
});
test('LinkedIn drafts require explicit verified public-safe facts and remain drafts',()=>{
 assert.throws(()=>learningDraft({learning:'Invented'}));const draft=learningDraft({publicSafe:true,learning:'Synthetic learning',implementation:'Synthetic implementation',why:'Less manual entry',limits:'Tested offline only',createdAt:'2026-11-14T01:00:00Z'});assert.ok(draft.includes('Why we are doing this'));assert.ok(draft.includes('Not published to LinkedIn'));
});
