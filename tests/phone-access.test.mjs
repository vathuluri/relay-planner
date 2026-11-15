import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {createVaultKeys,seal,unlockVault,open} from '../public/crypto.js';
import {wirePhoneAccess} from '../public/phone-access.js';

test('phone access retrieves the same vault password locally, rejects account changes and clears on close',async()=>{
 const dom=new JSDOM(await readFile(new URL('../dist/index.html',import.meta.url),'utf8'),{url:'https://relay.example'}),doc=dom.window.document;
 const old=globalThis.document;globalThis.document=doc;
 const dialog=doc.getElementById('phone-access-dialog');dialog.showModal=()=>{dialog.open=true;};dialog.close=()=>{dialog.open=false;dialog.dispatchEvent(new dom.window.Event('close'));};
 const keys=await createVaultKeys('alice'),envelope=await seal({tasks:[{id:'synthetic',title:'Synthetic private work'}]},keys.record.publicKey,'alice','schedule');let accountId='alice';let reads=0;
 try{
  wirePhoneAccess({accountId:'alice',readSchedule:async()=>{reads++;return {accountId,vault:{keys:keys.record,envelope}};}});
  doc.getElementById('phone-access-open').onclick();doc.getElementById('phone-access-existing').value=keys.recovery;
  await doc.getElementById('phone-access-unlock').onclick();assert.equal(reads,1);assert.equal(doc.getElementById('phone-access-password').value,keys.recovery);assert.equal(doc.getElementById('phone-access-result').hidden,false);
  // A phone can import the same password using Web Crypto with no passkey operation.
  const mobileKey=await unlockVault(keys.record,doc.getElementById('phone-access-password').value,'alice');assert.equal((await open(envelope,mobileKey,'alice','schedule')).tasks[0].title,'Synthetic private work');
  dialog.close();assert.equal(doc.getElementById('phone-access-password').value,'');assert.equal(doc.getElementById('phone-access-result').hidden,true);
  doc.getElementById('phone-access-open').onclick();accountId='bob';doc.getElementById('phone-access-existing').value=keys.recovery;await doc.getElementById('phone-access-unlock').onclick();assert.equal(doc.getElementById('phone-access-password').value,'');assert.match(doc.getElementById('phone-access-status').textContent,/Account changed/);
 }finally{dialog.close();globalThis.document=old;dom.window.close();}
});

test('a verification finishing after the phone-access dialog closes cannot expose the password',async()=>{
 const dom=new JSDOM(await readFile(new URL('../dist/index.html',import.meta.url),'utf8')),doc=dom.window.document;const old=globalThis.document;globalThis.document=doc;
 const dialog=doc.getElementById('phone-access-dialog');dialog.showModal=()=>{dialog.open=true;};dialog.close=()=>{dialog.open=false;dialog.dispatchEvent(new dom.window.Event('close'));};
 const keys=await createVaultKeys('alice'),envelope=await seal({tasks:[]},keys.record.publicKey,'alice','schedule');let release;
 try{
  wirePhoneAccess({accountId:'alice',readSchedule:()=>new Promise(resolve=>release=resolve)});doc.getElementById('phone-access-open').onclick();doc.getElementById('phone-access-existing').value=keys.recovery;
  const pending=doc.getElementById('phone-access-unlock').onclick();dialog.close();doc.getElementById('phone-access-open').onclick();release({accountId:'alice',vault:{keys:keys.record,envelope}});await pending;
  assert.equal(doc.getElementById('phone-access-password').value,'');assert.equal(doc.getElementById('phone-access-result').hidden,true);
 }finally{dialog.close();globalThis.document=old;dom.window.close();}
});
