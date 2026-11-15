import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {prepareVault} from '../public/vault-client.js';

for(const phone of [true,false])test(`${phone?'phone':'desktop'} unlock presents one primary action and keeps recovery collapsed`,async()=>{
 const dom=new JSDOM(await readFile(new URL('../dist/index.html',import.meta.url),'utf8'));
 const names=['document','matchMedia','navigator','PublicKeyCredential','isSecureContext'],old=Object.fromEntries(names.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 for(const [k,value] of Object.entries({document:dom.window.document,matchMedia:()=>({matches:phone}),navigator:{credentials:{}},PublicKeyCredential:class{},isSecureContext:true}))Object.defineProperty(globalThis,k,{value,configurable:true});
 try{
  prepareVault({accountId:'synthetic-layout',vault:{keys:{keyId:'synthetic'},passkey:{}},tasks:[]});await new Promise(resolve=>setImmediate(resolve));
  const doc=dom.window.document,primary=doc.querySelector('#vault-primary-action');assert.equal(primary.children.length,1);assert.equal(primary.firstElementChild.id,phone?'pair-request-start':'vault-passkey');assert.equal(doc.querySelector('#vault-other-methods').open,false);
  assert.ok(doc.querySelector('#vault-secret').closest('#vault-other-methods'));assert.ok(doc.querySelector('#vault-import').closest('#vault-other-methods'));assert.equal(doc.querySelector('#vault-logout').hidden,false);assert.equal(doc.querySelector('#account-message').textContent,'');
  const ids=[...doc.querySelectorAll('[id]')].map(n=>n.id);assert.equal(new Set(ids).size,ids.length);
 }finally{for(const [k,d] of Object.entries(old)){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}dom.window.close();}
});
