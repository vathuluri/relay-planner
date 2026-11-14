import {test} from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {JSDOM} from 'jsdom';import {createScheduleHandler} from '../server/schedules.mjs';import {unlockVault,open} from '../public/crypto.js';
test('expired session at Continue preserves the generated recovery key and resumes migration after reauthentication',async()=>{
 const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');const dom=new JSDOM(html,{url:'https://relay.example/'}),doc=dom.window.document;
 const previous={CustomEvent:globalThis.CustomEvent,document:globalThis.document,fetch:globalThis.fetch,create:URL.createObjectURL,revoke:URL.revokeObjectURL};let user={id:'alice'},serial=0,downloads=0,backup;const map=new Map([['users/alice/schedule',{etag:'legacy',data:{tasks:[{id:'synthetic',title:'Private synthetic task'}]}}]]);
 const store={async getWithMetadata(k){return map.get(k)??null;},async delete(k){map.delete(k);},async setJSON(k,v,o={}){const old=map.get(k);if(o.onlyIfMatch&&old?.etag!==o.onlyIfMatch||o.onlyIfNew&&old)return {modified:false};const etag=String(++serial);map.set(k,{etag,data:v});return {modified:true,etag};}};
 const handler=createScheduleHandler({getUser:async()=>user,getStore:()=>store});
 globalThis.document=doc;globalThis.CustomEvent=dom.window.CustomEvent;globalThis.fetch=async(url,options={})=>handler(new Request(new URL(url,'https://relay.example'),{...options,headers:{origin:'https://relay.example','Content-Type':'application/json',...options.headers}}));
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
