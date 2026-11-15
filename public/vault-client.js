import {wireDeviceRequest} from './device-approval.js';
import {beginPasskey,createPasskey,useSavedPasskey,unlockWithPasskey,passkeysAvailable} from './passkeys.js';
import {createVaultKeys,unlockVault,seal,open,keyId} from './crypto.js';
import {authenticatedFetch} from './auth-fetch.js';
const $=id=>document.getElementById(id);
export function downloadPrivate(name,value){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
async function deviceKey(accountId,value){
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('relay-device-keys',1);r.onupgradeneeded=()=>r.result.createObjectStore('keys');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 try{return await new Promise((resolve,reject)=>{const tx=db.transaction('keys',value===undefined?'readonly':'readwrite'),store=tx.objectStore('keys');const req=value===undefined?store.get(accountId):value===null?store.delete(accountId):store.put(value,accountId);let result;req.onsuccess=()=>result=req.result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);});}finally{db.close();}
}
async function confirmMigration(data){if(data.vault?.migratedFeedVersion)await request({action:'confirm-migration',accountId:data.accountId,version:data.version},'POST');}
export const forgetDevice=accountId=>deviceKey(accountId,null);
async function request(body,method='PUT'){const r=await authenticatedFetch('/.netlify/functions/schedules',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const value=await r.json();if(!r.ok){const error=Error(value.error||'Encrypted save failed.');error.status=r.status;throw error;}return value;}
export async function decodeSchedule(data,privateKey){
 if(!data.vault)throw Error('This account needs migration.');
 if(await keyId(data.vault.keys.publicKey)!==data.vault.keys.keyId)throw Error('Encryption key does not match.');
 const saved=await open(data.vault.envelope,privateKey,data.accountId,'schedule');
 if(!Array.isArray(saved.tasks))throw Error('Encrypted schedule is invalid.');
 const feed=await Promise.all((data.feed??[]).map(async r=>{if(r.keyId!==data.vault.keys.keyId)throw Error('Receipt key mismatch.');const task=await open(r.envelope,privateKey,data.accountId,r.id);if(task.id!==r.id||!task.activity)throw Error('Invalid encrypted receipt.');const review=saved.reviews?.[r.id];return review?{...task,status:review.status,history:review.history}:task;}));
 return [...saved.tasks,...feed];
}
export async function prepareVault(data,{forceUnlock=false}={}){
 const panel=$('vault-gate');$('account-form').hidden=true;document.querySelector('.account-actions').hidden=true;panel.hidden=false;
 const existing=!!data.vault;let generated=null,privateKey=null,committedVersion=null,passkey=data.vault?.passkey??null,registration=null,processing=false;const lock=value=>{processing=value;for(const id of ['vault-create-password','vault-passkey','vault-use-passkey','vault-generate','vault-import','vault-submit'])$(id).disabled=value;if(!existing)$('vault-submit').hidden=!generated;};$('account-message').textContent='';$('vault-submit').disabled=!existing;$('vault-backed-up').onchange=()=>{$('vault-submit').disabled=!generated||(!passkey&&!$('vault-backed-up').checked);};
 $('vault-title').textContent=existing?'Unlock your schedule':'Encrypt your schedule';
 $('account-message').textContent='';
 const phone=globalThis.matchMedia?.('(max-width:760px)').matches??false;const primary=existing?(!phone&&passkey&&passkeysAvailable()?'vault-passkey':'pair-request-start'):'vault-create-password';
 $('account-title').textContent=existing?'Unlock Relay.':'Protect your workspace.';
 $('account-intro').textContent=existing?(primary==='vault-passkey'?'Use your saved passkey to continue.':'Approve this device from one you already use.'):'Save one vault password in your password manager.';
 $('vault-primary-action').append($(primary));$(primary).classList.add('primary');
 $('vault-other-methods').open=false;$('vault-other-methods').querySelector('summary').textContent=existing?'Other ways to unlock':'Other setup options';
 $('vault-create-password').hidden=existing;$('vault-generate').hidden=existing;$('vault-submit').hidden=!existing;
 if(!existing)$('vault-primary-submit').append($('vault-submit'));
 $('vault-submit').textContent=existing?'Unlock with vault password':'Continue';
 $('vault-passkey-help').textContent=existing?'Passkey support varies by device.':'Passkeys are optional; device approval also needs no phone passkey support.';
 $('pair-request-start').hidden=!existing;$('pair-request-panel').hidden=true;
 $('vault-setup').hidden=existing;$('vault-unlock').hidden=!existing;
 $('vault-use-passkey').hidden=existing||!passkeysAvailable();$('vault-passkey').hidden=!passkeysAvailable();$('vault-passkey').textContent=existing?(passkey?'Unlock with passkey':'Add passkey using recovery key'):'Set up passkey';
 if(existing&&!forceUnlock){try{const cached=await deviceKey(data.accountId);if(cached?.keyId===data.vault.keys.keyId){await decodeSchedule(data,cached.privateKey);await confirmMigration(data);panel.hidden=true;return {privateKey:cached.privateKey,keys:data.vault.keys};}}catch{} }
 return await new Promise(resolve=>{
  let deviceRequest;const finish=value=>{deviceRequest?.stop();panel.hidden=true;resolve(value);};
  if(existing)deviceRequest=wireDeviceRequest({data,decodeSchedule,rememberDevice:deviceKey,onUnlock:async value=>{await confirmMigration(data);finish(value);},readSchedule:async()=>{const r=await authenticatedFetch('/.netlify/functions/schedules',{cache:'no-store'});const value=await r.json();if(!r.ok)throw Error(value.error||'Could not read schedule.');return value;}});

  $('vault-create-password').onclick=async()=>{if(processing||committedVersion)return;lock(true);try{generated??=await createVaultKeys(data.accountId);$('vault-new-password').value=generated.recovery;$('vault-password-result').hidden=false;$('vault-ready').hidden=false;$('vault-message').textContent='Save this as Relay vault unlock in your password manager, then confirm below.';}catch{$('vault-message').textContent='Could not create encryption keys. Try again.';}finally{lock(false);$('vault-submit').disabled=!passkey&&!$('vault-backed-up').checked;}};
  $('vault-copy-password').onclick=async()=>{try{await navigator.clipboard.writeText($('vault-new-password').value);$('vault-message').textContent='Copied. Save privately in your password manager, then confirm below.';}catch{$('vault-message').textContent='Copy is unavailable. Download the recovery file instead.';}};

  $('vault-use-passkey').onclick=async()=>{if(processing||committedVersion)return;if(passkey){$('vault-message').textContent='Passkey already verified. Click Continue.';return;}lock(true);$('vault-message').textContent='Choose an existing Relay passkey in your password manager and approve unlock. No new passkey will be created.';try{generated??=await createVaultKeys(data.accountId);passkey=await useSavedPasskey(generated.record,generated.recovery,data.accountId);$('vault-message').textContent='Saved passkey verified. Click Continue to encrypt your schedule. Use this same synced passkey on your phone.';$('vault-passkey').textContent='Passkey verified';}catch(err){$('vault-message').textContent=err.name==='NotAllowedError'?'No saved passkey was selected, or the request timed out. Try Use a saved passkey again; do not create another.':err.message;}finally{lock(false);$('vault-submit').disabled=!passkey&&!$('vault-backed-up').checked;}};

  $('vault-passkey').onclick=async()=>{const b=$('vault-passkey');if(processing||committedVersion)return;lock(true);try{
   if(existing&&passkey){privateKey=await unlockWithPasskey(passkey,data.vault.keys,data.accountId);await decodeSchedule(data,privateKey);await confirmMigration(data);if($('vault-remember').checked)await deviceKey(data.accountId,{keyId:data.vault.keys.keyId,privateKey});panel.hidden=true;finish({privateKey,keys:data.vault.keys});return;}
   if(!registration&&!passkey){if(existing)await unlockVault(data.vault.keys,$('vault-secret').value,data.accountId);registration=await beginPasskey(data.accountId);b.textContent='Verify passkey';$('vault-message').textContent='Passkey saved. Click Verify passkey and approve the next prompt in the same password manager. Your schedule is not migrated yet.';return;}
   if(!existing&&passkey){$('vault-message').textContent='Passkey already verified. Click Continue below to encrypt your schedule.';return;}
   if(existing){const recovery=$('vault-secret').value;privateKey=await unlockVault(data.vault.keys,recovery,data.accountId);await decodeSchedule(data,privateKey);const candidate=await createPasskey(data.vault.keys,recovery,data.accountId,registration);const saved=await request({action:'add-passkey',accountId:data.accountId,version:data.version,passkey:candidate},'POST');data.version=saved.version;data.vault.passkey=candidate;passkey=candidate;const check=await authenticatedFetch('/.netlify/functions/schedules',{cache:'no-store'});const confirmed=await check.json();if(!check.ok||confirmed.accountId!==data.accountId||JSON.stringify(confirmed.vault?.passkey)!==JSON.stringify(candidate))throw Error('Passkey was not verified in storage. Keep your recovery file and refresh.');await decodeSchedule(confirmed,privateKey);Object.assign(data,confirmed);await confirmMigration(data);$('vault-secret').value='';panel.hidden=true;finish({privateKey,keys:data.vault.keys});return;}
   generated??=await createVaultKeys(data.accountId);passkey=await createPasskey(generated.record,generated.recovery,data.accountId,registration);$('vault-submit').disabled=false;$('vault-message').textContent='Passkey saved and verified. Continue to encrypt your schedule. You can also download an independent recovery backup.';b.textContent='Passkey verified';
  }catch(err){if(err.status===401)document.dispatchEvent(new CustomEvent('relay:reauth',{detail:{accountId:data.accountId}}));$('vault-message').textContent=err.message?.includes('does not return the passkey encryption secret')?'Passkey unlock is unavailable here. Use device approval or your vault password.':err.status===401?'Sign in above, then try the passkey button again. Your schedule keys are unchanged.':err.name==='NotAllowedError'?(existing&&passkey?'Passkey unlock cancelled or timed out. Click Unlock with passkey and approve the matching Relay entry in your password manager. If it is unavailable, check manager sync or use your recovery file.':registration?'Verification cancelled or timed out. Your saved passkey is retained. Click Verify passkey to retry; do not create another passkey.':'Passkey creation cancelled or timed out. Your schedule is unchanged. Try again or use a recovery file.'):err.message;}finally{lock(false);$('vault-submit').disabled=!existing&&!passkey&&!$('vault-backed-up').checked;}};

  $('vault-generate').onclick=async()=>{const b=$('vault-generate');if(processing||committedVersion)return;lock(true);b.textContent='Generating recovery file…';try{generated??=await createVaultKeys(data.accountId);downloadPrivate('relay-recovery-key.json',{warning:'Keep private. Anyone with this key and your account access can decrypt your schedule. Losing it may permanently lose access.',accountId:data.accountId,recoveryKey:generated.recovery,keys:generated.record});$('vault-ready').hidden=false;$('vault-message').textContent='Recovery file downloaded. Store it privately before continuing. Do not send it in chat.';b.textContent='Recovery file downloaded';}catch{$('vault-message').textContent='Could not generate keys. Try again.';b.textContent='Download recovery key';}finally{lock(false);$('vault-submit').disabled=!passkey&&!$('vault-backed-up').checked;}};
  $('vault-import').onchange=async()=>{if(processing||committedVersion)return;lock(true);try{const file=$('vault-import').files[0];if(!file)return;const backup=JSON.parse(await file.text());if(backup.accountId!==data.accountId)throw Error();const record=existing?data.vault.keys:backup.keys;if(!record)throw Error('Use the new recovery file format, or generate a new key before migration.');const recovered=await unlockVault(record,backup.recoveryKey,data.accountId);if(existing){$('vault-secret').value=backup.recoveryKey;}else{passkey=null;$('vault-new-password').value='';$('vault-password-result').hidden=true;$('vault-backed-up').checked=false;$('vault-submit').disabled=true;$('vault-passkey').textContent='Set up passkey';generated={privateKey:recovered,record,recovery:backup.recoveryKey};$('vault-ready').hidden=false;$('vault-generate').disabled=true;$('vault-message').textContent='Saved recovery file loaded on this device. Confirm its private backup, then Continue.';}}catch{$('vault-message').textContent='This recovery file cannot unlock this account. Nothing was uploaded.';}finally{$('vault-import').value='';lock(false);$('vault-submit').disabled=!existing&&!passkey&&!$('vault-backed-up').checked;}};
  $('vault-form').onsubmit=async event=>{event.preventDefault();if(processing)return;const b=$('vault-submit');lock(true);
   b.textContent=existing?'Unlocking…':'Encrypting and verifying…';try{
    let keys;
    if(existing){keys=data.vault.keys;privateKey=await unlockVault(keys,$('vault-secret').value,data.accountId);$('vault-secret').value='';await decodeSchedule(data,privateKey);await confirmMigration(data);}
    else{
     if(!generated||(!passkey&&!$('vault-backed-up').checked))throw Error('Download and privately save your recovery key first.');
     privateKey=generated.privateKey;keys=generated.record;
     const envelope=committedVersion?null:await seal({tasks:data.tasks},keys.publicKey,data.accountId,'schedule');
     // Verify locally before uploading; the backend never receives recovery material.
     if(envelope){if(JSON.stringify((await open(envelope,privateKey,data.accountId,'schedule')).tasks)!==JSON.stringify(data.tasks))throw Error('Local verification failed.');const saved=await request({accountId:data.accountId,version:data.version,feedVersion:data.feedVersion,migrate:true,keys,envelope,transferEnvelope:await seal({recovery:generated.recovery.trim().replaceAll('-','').toLowerCase()},keys.publicKey,data.accountId,'device-transfer:'+keys.keyId),...(passkey?{passkey}:{})});committedVersion=saved.version;}
     const r=await authenticatedFetch('/.netlify/functions/schedules'),verified=await r.json();
     if(r.status===401){const error=Error('Sign in required.');error.status=401;throw error;}
     if(!r.ok||verified.accountId!==data.accountId||verified.version!==committedVersion)throw Error('Migration needs a refresh to verify. Keep your recovery key.');
     if(passkey&&JSON.stringify(verified.vault?.passkey)!==JSON.stringify(passkey))throw Error('Passkey backup was not stored. Keep this page open and retry verification.');
     const roundtrip=await decodeSchedule(verified,privateKey);
     if(JSON.stringify(roundtrip)!==JSON.stringify(data.tasks))throw Error('Migration verification failed. Keep your recovery key.');
     await request({action:'confirm-migration',accountId:data.accountId,version:committedVersion},'POST');
     Object.assign(data,verified);generated.recovery='';generated=null;$('vault-new-password').value='';
    }
    if($('vault-remember').checked)await deviceKey(data.accountId,{keyId:keys.keyId,privateKey});
    panel.hidden=true;finish({privateKey,keys});
   }catch(err){if(err.status===401){$('vault-message').textContent='Your session needs renewal. Sign in above, then Continue. Your generated recovery key is preserved in this page.';document.dispatchEvent(new CustomEvent('relay:reauth',{detail:{accountId:data.accountId}}));}else{$('vault-message').textContent=existing?'Could not unlock. Check your vault password or recovery file.':err.message;}}finally{lock(false);if(committedVersion){$('vault-passkey').disabled=true;$('vault-use-passkey').disabled=true;$('vault-import').disabled=true;$('vault-generate').disabled=true;}b.textContent=existing?'Unlock with recovery key':'Continue';}
  };
 });
}
export async function saveEncrypted(tasks,{keys,accountId,version,feedIds=[]}){const reviews={};for(const t of tasks.filter(t=>feedIds.includes(t.id)))reviews[t.id]={status:t.status,history:t.history??[]};const envelope=await seal({tasks:tasks.filter(t=>!feedIds.includes(t.id)),reviews},keys.publicKey,accountId,'schedule');return request({accountId,version,keys,envelope});}
