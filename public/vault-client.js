import {createVaultKeys,unlockVault,seal,open,keyId} from './crypto.js';
const $=id=>document.getElementById(id);
export function downloadPrivate(name,value){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
async function deviceKey(accountId,value){
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('relay-device-keys',1);r.onupgradeneeded=()=>r.result.createObjectStore('keys');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 try{return await new Promise((resolve,reject)=>{const tx=db.transaction('keys',value===undefined?'readonly':'readwrite'),store=tx.objectStore('keys');const req=value===undefined?store.get(accountId):value===null?store.delete(accountId):store.put(value,accountId);let result;req.onsuccess=()=>result=req.result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);});}finally{db.close();}
}
async function confirmMigration(data){if(data.vault?.migratedFeedVersion)await request({action:'confirm-migration',accountId:data.accountId,version:data.version},'POST');}
export const forgetDevice=accountId=>deviceKey(accountId,null);
async function request(body,method='PUT'){const r=await fetch('/.netlify/functions/schedules',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const value=await r.json();if(!r.ok)throw Error(value.error||'Encrypted save failed.');return value;}
export async function decodeSchedule(data,privateKey){
 if(!data.vault)throw Error('This account needs migration.');
 if(await keyId(data.vault.keys.publicKey)!==data.vault.keys.keyId)throw Error('Encryption key does not match.');
 const saved=await open(data.vault.envelope,privateKey,data.accountId,'schedule');
 if(!Array.isArray(saved.tasks))throw Error('Encrypted schedule is invalid.');
 const feed=await Promise.all((data.feed??[]).map(async r=>{if(r.keyId!==data.vault.keys.keyId)throw Error('Receipt key mismatch.');const task=await open(r.envelope,privateKey,data.accountId,r.id);if(task.id!==r.id||!task.activity)throw Error('Invalid encrypted receipt.');const review=saved.reviews?.[r.id];return review?{...task,status:review.status,history:review.history}:task;}));
 return [...saved.tasks,...feed];
}
export async function prepareVault(data){
 const panel=$('vault-gate');$('account-form').hidden=true;document.querySelector('.account-actions').hidden=true;panel.hidden=false;
 const existing=!!data.vault;let generated=null,privateKey=null;$('vault-submit').disabled=!existing;$('vault-backed-up').onchange=()=>{$('vault-submit').disabled=!generated||!$('vault-backed-up').checked;};
 $('vault-title').textContent=existing?'Unlock your schedule':'Encrypt your schedule';
 $('vault-setup').hidden=existing;$('vault-unlock').hidden=!existing;
 if(existing){try{const cached=await deviceKey(data.accountId);if(cached?.keyId===data.vault.keys.keyId){await decodeSchedule(data,cached.privateKey);await confirmMigration(data);panel.hidden=true;return {privateKey:cached.privateKey,keys:data.vault.keys};}}catch{} }
 return await new Promise(resolve=>{
  $('vault-generate').onclick=async()=>{const b=$('vault-generate');b.disabled=true;try{generated=await createVaultKeys(data.accountId);downloadPrivate('relay-recovery-key.json',{warning:'Keep private. Anyone with this key and your account access can decrypt your schedule. Losing it may permanently lose access.',accountId:data.accountId,recoveryKey:generated.recovery});$('vault-ready').hidden=false;$('vault-message').textContent='Recovery file downloaded. Store it privately before continuing. Do not send it in chat.';}catch{$('vault-message').textContent='Could not generate keys. Try again.';b.disabled=false;}};
  $('vault-form').onsubmit=async event=>{event.preventDefault();const b=$('vault-submit');b.disabled=true;
   try{
    let keys;
    if(existing){keys=data.vault.keys;privateKey=await unlockVault(keys,$('vault-secret').value,data.accountId);$('vault-secret').value='';await decodeSchedule(data,privateKey);await confirmMigration(data);}
    else{
     if(!generated||!$('vault-backed-up').checked)throw Error('Download and privately save your recovery key first.');
     privateKey=generated.privateKey;keys=generated.record;
     const envelope=await seal({tasks:data.tasks},keys.publicKey,data.accountId,'schedule');
     // Verify locally before uploading; the backend never receives recovery material.
     if(JSON.stringify((await open(envelope,privateKey,data.accountId,'schedule')).tasks)!==JSON.stringify(data.tasks))throw Error('Local verification failed.');
     const saved=await request({accountId:data.accountId,version:data.version,feedVersion:data.feedVersion,migrate:true,keys,envelope});
     const r=await fetch('/.netlify/functions/schedules',{cache:'no-store'}),verified=await r.json();
     if(!r.ok||verified.accountId!==data.accountId||verified.version!==saved.version)throw Error('Migration needs a refresh to verify. Keep your recovery key.');
     const roundtrip=await decodeSchedule(verified,privateKey);
     if(JSON.stringify(roundtrip)!==JSON.stringify(data.tasks))throw Error('Migration verification failed. Keep your recovery key.');
     await request({action:'confirm-migration',accountId:data.accountId,version:saved.version},'POST');
     Object.assign(data,verified);generated.recovery='';generated=null;
    }
    if($('vault-remember').checked)await deviceKey(data.accountId,{keyId:keys.keyId,privateKey});
    panel.hidden=true;resolve({privateKey,keys});
   }catch(err){$('vault-message').textContent=existing?'Could not unlock. Check your recovery key.':err.message;}finally{b.disabled=false;}
  };
 });
}
export async function saveEncrypted(tasks,{keys,accountId,version,feedIds=[]}){const reviews={};for(const t of tasks.filter(t=>feedIds.includes(t.id)))reviews[t.id]={status:t.status,history:t.history??[]};const envelope=await seal({tasks:tasks.filter(t=>!feedIds.includes(t.id)),reviews},keys.publicKey,accountId,'schedule');return request({accountId,version,keys,envelope});}
