import {test} from 'node:test';import assert from 'node:assert/strict';import {createVaultKeys,unlockVault,seal,open,unb64,b64} from '../public/crypto.js';
const keys=await createVaultKeys('synthetic-account');
test('recovery unlocks a nonextractable private key on another device; wrong keys fail',async()=>{
 const key=await unlockVault(keys.record,keys.recovery,'synthetic-account');assert.equal(key.extractable,false);await assert.rejects(()=>crypto.subtle.exportKey('pkcs8',key));
 const e=await seal({title:'Private synthetic task'},keys.record.publicKey,'synthetic-account','schedule');assert.deepEqual(await open(e,key,'synthetic-account','schedule'),{title:'Private synthetic task'});
 await assert.rejects(()=>unlockVault(keys.record,'0'.repeat(64),'synthetic-account'));await assert.rejects(()=>unlockVault(keys.record,keys.recovery,'other-account'));
});
test('fresh encryption uses unique keys/nonces and authenticates ciphertext, account and purpose',async()=>{
 const payload={tasks:[{title:'Never upload this readable title'}]},a=await seal(payload,keys.record.publicKey,'synthetic-account','schedule'),b=await seal(payload,keys.record.publicKey,'synthetic-account','schedule');
 assert.notEqual(a.iv,b.iv);assert.notEqual(a.wrappedKey,b.wrappedKey);assert.ok(!JSON.stringify(a).includes(payload.tasks[0].title));
 const bytes=unb64(a.ciphertext);bytes[0]^=1;
 for(const [e,account,purpose]of [[{...a,ciphertext:b64(bytes)},'synthetic-account','schedule'],[a,'other','schedule'],[a,'synthetic-account','activity-1']])await assert.rejects(()=>open(e,keys.privateKey,account,purpose));
});
