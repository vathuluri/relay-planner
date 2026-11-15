import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createVaultKeys,unlockVault,seal,open} from '../public/crypto.js';
import {createPasskey,useSavedPasskey,unlockWithPasskey,recoverVaultPassword} from '../public/passkeys.js';

test('PRF passkey unlocks encrypted records without storing its secret; wrong account, key or credential fails',async()=>{
 const descriptors=Object.fromEntries(['navigator','PublicKeyCredential','isSecureContext'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 let supported=true,cancel=false,wrong=false,prfSecret='synthetic-authenticator-secret';const calls=[];
 const id=new Uint8Array([1,2,3,4]);let userHandle=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('synthetic-account'));
 const credentials={async create(options){calls.push(options);if(cancel)throw new DOMException('Cancelled','NotAllowedError');return {rawId:id,getClientExtensionResults:()=>({prf:{enabled:supported}})};},async get(){throw Error('Mock not configured');}};
 credentials.get=async options=>{calls.push(options);const first=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(prfSecret+Array.from(options.publicKey.extensions.prf.eval.first)));return {response:{userHandle},rawId:wrong?new Uint8Array([9]):id,getClientExtensionResults:()=>supported?{prf:{results:{first}}}: {}};};
 for(const [k,value] of Object.entries({navigator:{credentials},PublicKeyCredential:class{},isSecureContext:true}))Object.defineProperty(globalThis,k,{configurable:true,value});
 try{
  const vault=await createVaultKeys('synthetic-account');const record=await createPasskey(vault.record,vault.recovery,'synthetic-account');
  assert.equal(calls.length,2);assert.equal(calls[0].publicKey.authenticatorSelection.residentKey,'required');assert.equal(calls[1].publicKey.userVerification,'required');
  const before=calls.length;const selected=await useSavedPasskey(vault.record,vault.recovery,'synthetic-account');assert.equal(calls.length,before+1);assert.equal(calls.at(-1).publicKey.allowCredentials,undefined);assert.equal(selected.credentialId,record.credentialId);const selectedKey=await unlockWithPasskey(selected,vault.record,'synthetic-account');assert.equal(selectedKey.extractable,false);userHandle=null;await assert.rejects(useSavedPasskey(vault.record,vault.recovery,'synthetic-account'),/for this account/);userHandle=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('synthetic-account'));
  assert.ok(!JSON.stringify(record).includes(vault.recovery));assert.deepEqual(Object.keys(record).sort(),['ciphertext','credentialId','format','iv','salt']);
  const envelope=await seal({title:'Synthetic private task'},vault.record.publicKey,'synthetic-account','schedule');
  const exported=await recoverVaultPassword(record,vault.record,'synthetic-account');assert.equal(exported.recovery,vault.recovery);assert.equal(exported.privateKey.extractable,false);
  const passwordKey=await unlockVault(vault.record,exported.recovery,'synthetic-account');assert.equal((await open(envelope,passwordKey,'synthetic-account','schedule')).title,'Synthetic private task');
  const key=await unlockWithPasskey(record,vault.record,'synthetic-account');assert.equal(key.extractable,false);assert.equal((await open(envelope,key,'synthetic-account','schedule')).title,'Synthetic private task');
  await assert.rejects(unlockWithPasskey(record,vault.record,'other-account'));
  await assert.rejects(unlockWithPasskey(record,{...vault.record,keyId:'other-key'},'synthetic-account'));
  wrong=true;await assert.rejects(unlockWithPasskey(record,vault.record,'synthetic-account'),/does not match/);wrong=false;
  prfSecret='other-authenticator';await assert.rejects(unlockWithPasskey(record,vault.record,'synthetic-account'));
  supported=false;await assert.rejects(createPasskey(vault.record,vault.recovery,'synthetic-account'),/does not support/);await assert.rejects(unlockWithPasskey(record,vault.record,'synthetic-account'),/does not return/);
  cancel=true;await assert.rejects(createPasskey(vault.record,vault.recovery,'synthetic-account'),{name:'NotAllowedError'});
 }finally{for(const [k,descriptor] of Object.entries(descriptors)){if(descriptor)Object.defineProperty(globalThis,k,descriptor);else delete globalThis[k];}}
});
