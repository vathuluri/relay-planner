import {recoverVaultPassword} from './passkeys.js';
import {unlockVault} from './crypto.js';
import {decodeSchedule} from './vault-client.js';

export function wirePhoneAccess({readSchedule,accountId}){
 const $=id=>document.getElementById(id),dialog=$('phone-access-dialog');let busy=false,timer,generation=0;
 const clear=()=>{generation++;clearTimeout(timer);$('phone-access-show').textContent='Show';$('phone-access-password').value='';$('phone-access-existing').value='';$('phone-access-password').type='password';$('phone-access-result').hidden=true;};
 $('phone-access-open').onclick=()=>{clear();$('phone-access-status').textContent='On this working PC, approve your existing passkey once. Then save the vault password in Proton Pass as a separate login named Relay vault unlock. It is different from your account sign-in password.';dialog.showModal();};
 $('phone-access-close').onclick=()=>dialog.close();dialog.addEventListener('close',clear);
 $('phone-access-show').onclick=()=>{$('phone-access-password').type=$('phone-access-password').type==='password'?'text':'password';$('phone-access-show').textContent=$('phone-access-password').type==='password'?'Show':'Hide';};
 $('phone-access-copy').onclick=async()=>{try{await navigator.clipboard.writeText($('phone-access-password').value);$('phone-access-status').textContent='Copied. Save privately in Proton Pass, then use this vault password on your phone. Relay has not uploaded it.';}catch{$('phone-access-status').textContent='Clipboard unavailable. Use Show, then copy the password yourself.';}};
 $('phone-access-unlock').onclick=async()=>{
  if(busy)return;busy=true;const ticket=generation;$('phone-access-unlock').disabled=true;clearTimeout(timer);$('phone-access-password').value='';$('phone-access-result').hidden=true;
  $('phone-access-status').textContent='Verifying locally…';const existing=$('phone-access-existing').value;$('phone-access-existing').value='';
  try{
   const data=await readSchedule();if(data.accountId!==accountId||!data.vault)throw Error('Account changed. Sign in to the original account again.');
   let recovered;
   if(existing){recovered={recovery:existing,privateKey:await unlockVault(data.vault.keys,existing,accountId)};}
   else{if(!data.vault.passkey)throw Error('Enter your existing recovery key to retrieve the vault password.');recovered=await recoverVaultPassword(data.vault.passkey,data.vault.keys,accountId);}
   await decodeSchedule(data,recovered.privateKey);
   // Closing/cancelling while the authenticator was open must not reveal a secret later.
   if(!dialog.open||ticket!==generation)return;
   $('phone-access-password').value=recovered.recovery;$('phone-access-existing').value='';$('phone-access-result').hidden=false;
   $('phone-access-status').textContent='Verified. Save this generated vault password in Proton Pass. On your phone, sign in, fill Vault password, choose Trust this device if desired, and Unlock. Your schedule and encryption keys are unchanged.';
   timer=setTimeout(()=>{clear();$('phone-access-status').textContent='Password hidden after five minutes. Verify again if needed.';},300000);timer.unref?.();
  }catch(error){$('phone-access-status').textContent=error.name==='NotAllowedError'?'Verification cancelled. No password was displayed.':error.message||'Could not verify. Nothing changed.';}
  finally{busy=false;$('phone-access-unlock').disabled=false;}
 };
}
