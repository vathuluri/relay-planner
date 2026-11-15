import {authenticatedFetch} from './auth-fetch.js';
import {createDeviceRequest,deviceCode,approveDevice,receiveDevice} from './pairing-crypto.js';
import {pairingTranscript} from './pairing-format.js';
import {open,seal,unlockVault} from './crypto.js';
import {recoverVaultPassword} from './passkeys.js';

export async function pairingApi(body){
 const response=await authenticatedFetch('/.netlify/functions/pairings',body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});
 const value=await response.json();if(!response.ok)throw Error(value.error||'Device request failed.');return value;
}

// Requesting device: ephemeral private key remains in this page until approval/expiry.
export function wireDeviceRequest({data,readSchedule,decodeSchedule,rememberDevice,onUnlock,api=pairingApi}){
 const $=id=>document.getElementById(id);let local=null,active=false,timer,received=null,generation=0;
 const status=text=>$('pair-request-status').textContent=text;
 const stop=()=>{generation++;active=false;clearTimeout(timer);const id=local?.request.id;local=null;received=null;$('pair-request-start').disabled=false;if(id)api({action:'cancel',accountId:data.accountId,id}).catch(()=>{});};
 $('pair-request-cancel').onclick=()=>{stop();$('pair-request-panel').hidden=true;status('Device request cancelled.');};
 $('pair-request-start').onclick=async()=>{
  if(active)return;active=true;const ticket=++generation;$('pair-request-start').disabled=true;status('Preparing a private device request…');
  try{
   local=await createDeviceRequest(data.vault.keys.keyId);if(ticket!==generation)return;
   await api({action:'request',accountId:data.accountId,request:local.request});if(ticket!==generation)return;
   const code=await deviceCode(data.accountId,local.request);if(ticket!==generation)return;$('pair-request-code').textContent=code;$('pair-request-panel').hidden=false;
   status('On your unlocked PC: Account → Approve a device. Compare the full code before approving. This request expires in five minutes. Select Trust this device below if you want to remember access.');
   const poll=async()=>{
    if(!active||ticket!==generation)return;
    if(Date.now()>=local.request.expiresAt){stop();status('Request expired. Request access again.');return;}
    try{
     if(!received){
      const result=await api();if(ticket!==generation)return;const row=result.requests.find(r=>r.request.id===local.request.id);
      if(!row||['cancelled','consumed'].includes(row.status)){stop();status('Request was cancelled or is no longer available.');return;}
      if(pairingTranscript(data.accountId,row.request)!==pairingTranscript(data.accountId,local.request))throw Error('Device request changed. Cancel and start again.');
      if(row.status==='approved'){
       const latest=await readSchedule();if(ticket!==generation)return;if(latest.accountId!==data.accountId)throw Error('Account changed.');
       const privateKey=await receiveDevice(local,row.response,latest.vault.keys,data.accountId);await decodeSchedule(latest,privateKey);
       if(ticket!==generation)return;received={privateKey};
      }
     }
     if(received){
      await api({action:'consume',accountId:data.accountId,id:local.request.id});if(ticket!==generation)return;
      const latest=await readSchedule();if(latest.accountId!==data.accountId||latest.vault?.keys.keyId!==data.vault.keys.keyId)throw Error('Account or encryption key changed.');
      await decodeSchedule(latest,received.privateKey);if(ticket!==generation)return;
      if($('vault-remember').checked)await rememberDevice(data.accountId,{keyId:latest.vault.keys.keyId,privateKey:received.privateKey});
      if(ticket!==generation){if($('vault-remember').checked)await rememberDevice(data.accountId,null);return;}const privateKey=received.privateKey;Object.assign(data,latest);
      status('Device approved. Opening your schedule…');await onUnlock({privateKey,keys:latest.vault.keys});active=false;clearTimeout(timer);local=null;received=null;return;
     }
    }catch(error){status(error.message+' Retrying while this request is active.');}
    if(active&&ticket===generation){timer=setTimeout(poll,4000);timer.unref?.();}
   };
   timer=setTimeout(poll,1500);timer.unref?.();
  }catch(error){stop();status(error.message||'Could not request access.');}
 };
 return {stop};
}

async function saveTransferEnvelope(body){
 const response=await authenticatedFetch('/.netlify/functions/schedules',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const result=await response.json();if(!response.ok)throw Error(result.error||'Approval setup failed.');return result;
}
export function wireDeviceApprovals({readSchedule,decodeSchedule,vault,accountId,onVersion,api=pairingApi,saveTransfer=saveTransferEnvelope}){
 const $=id=>document.getElementById(id),dialog=$('device-approval-dialog');let busy=false,generation=0;
 const say=text=>$('device-approval-status').textContent=text;
 const current=async()=>{const data=await readSchedule();if(data.accountId!==accountId||data.vault?.keys.keyId!==vault.keys.keyId)throw Error('Account or encryption key changed.');return data;};
 const secret=async data=>{if(!data.vault.transferEnvelope)throw Error('Enable device approvals first.');const value=await open(data.vault.transferEnvelope,vault.privateKey,accountId,'device-transfer:'+vault.keys.keyId);const recovery=value.recovery.trim().replaceAll('-','').toLowerCase();await unlockVault(vault.keys,recovery,accountId);return recovery;};
 const enable=async(data,useExisting,ticket)=>{
  if(data.vault.transferEnvelope)return data;
  const existing=useExisting?$('device-approval-existing').value:'';$('device-approval-existing').value='';let recovery;
  if(useExisting){await unlockVault(vault.keys,existing,accountId);recovery=existing;}
  else{if(!data.vault.passkey)throw Error('Use the recovery option to enable approvals with your vault password.');say('Approve your working passkey to enable and continue.');recovery=(await recoverVaultPassword(data.vault.passkey,vault.keys,accountId)).recovery;}
  recovery=recovery.trim().replaceAll('-','').toLowerCase();const transferEnvelope=await seal({recovery},vault.keys.publicKey,accountId,'device-transfer:'+vault.keys.keyId);
  const checked=await open(transferEnvelope,vault.privateKey,accountId,'device-transfer:'+vault.keys.keyId);if(checked.recovery!==recovery)throw Error('Local verification failed.');
  if(!dialog.open||ticket!==generation)throw Error('Approval cancelled.');
  await saveTransfer({action:'add-device-transfer',accountId,version:data.version,transferEnvelope});
  const latest=await current();await secret(latest);onVersion(latest);return latest;
 };
 const load=async()=>{
  const ticket=++generation;$('device-approval-list').replaceChildren();say('Loading requests…');
  try{
   const data=await current();if(ticket!==generation||!dialog.open)return;$('device-approval-enable').hidden=!!data.vault.transferEnvelope;$('device-approval-backup').hidden=!!data.vault.transferEnvelope;
   const result=await api();if(ticket!==generation||!dialog.open)return;const pending=result.requests.filter(r=>r.status==='pending'&&r.request.expiresAt>Date.now());
   $('device-approval-enable').hidden=!!data.vault.transferEnvelope||!!(pending.length&&data.vault.passkey);
   for(const row of pending){
    const card=document.createElement('section');card.className='device-request-card';const code=document.createElement('strong');code.textContent=await deviceCode(accountId,row.request);
    const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';label.append(check,document.createTextNode(' This full code matches the one on my phone.'));
    const approve=document.createElement('button');approve.type='button';approve.className='button primary';approve.textContent=data.vault.transferEnvelope?'Approve this device':'Enable and approve with passkey';approve.disabled=true;
    check.onchange=()=>approve.disabled=!check.checked||busy;
    approve.onclick=async()=>{if(!check.checked||busy)return;const approvalGeneration=generation;busy=true;approve.disabled=true;try{if(row.request.expiresAt<=Date.now())throw Error('This request expired. Request access again on your phone.');let latest=await current();latest=await enable(latest,false,approvalGeneration);const recovery=await secret(latest);const response=await approveDevice(row.request,recovery,accountId);if(!dialog.open||approvalGeneration!==generation)return;await api({action:'approve',accountId,id:row.request.id,response});say('Approval sent. The phone must receive it before the request expires.');card.remove();}catch(error){say(error.name==='NotAllowedError'?'Passkey verification cancelled. Try the approval again.':error.message);}finally{busy=false;approve.disabled=!check.checked;}};
    const deny=document.createElement('button');deny.type='button';deny.className='button';deny.textContent='Deny';deny.onclick=async()=>{deny.disabled=true;try{await api({action:'cancel',accountId,id:row.request.id});card.remove();say('Request denied.');}catch(error){say(error.message);deny.disabled=false;}};
    card.append(code,label,approve,deny);$('device-approval-list').append(card);
   }
   say(data.vault.transferEnvelope?(pending.length?'Compare both screens. Only approve a request you just made.':'No pending requests. Request access on your phone, then Refresh.'):pending.length?'Compare the full code, check the match, then choose Enable and approve with passkey.':'Enable approvals once using your working passkey, then request access on your phone.');
  }catch(error){say(error.message);}
 };
 $('device-approval-open').onclick=async()=>{dialog.showModal();await load();};$('device-approval-refresh').onclick=load;$('device-approval-close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{generation++;$('device-approval-existing').value='';$('device-approval-list').replaceChildren();});
 const setup=async useExisting=>{if(busy)return;const ticket=generation;busy=true;try{await enable(await current(),useExisting,ticket);await load();}catch(error){say(error.name==='NotAllowedError'?'Passkey verification cancelled.':error.message);}finally{busy=false;}};
 $('device-approval-enable').onclick=()=>setup(false);
 $('device-approval-enable-recovery').onclick=()=>setup(true);
}
