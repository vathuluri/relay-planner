// Passkeys unlock encryption locally; Identity still authenticates the account.
import {b64,unb64,unlockVault} from './crypto.js';
const enc=new TextEncoder(),dec=new TextDecoder();
const random=n=>crypto.getRandomValues(new Uint8Array(n));
const aad=(accountId,keyId)=>enc.encode(JSON.stringify(['relay-passkey-v1',accountId,keyId]));
export const passkeysAvailable=()=>!!globalThis.PublicKeyCredential&&!!globalThis.navigator?.credentials&&globalThis.isSecureContext===true;
async function prfKey(credential,salt){
 const assertion=await navigator.credentials.get({publicKey:{challenge:random(32),allowCredentials:[{type:'public-key',id:credential}],userVerification:'required',extensions:{prf:{eval:{first:salt}}}}});
 if(!assertion||b64(assertion.rawId)!==b64(credential))throw Error('The selected passkey does not match.');
 const output=assertion.getClientExtensionResults()?.prf?.results?.first;
 if(!output||output.byteLength!==32)throw Error('This browser or password manager cannot unlock encrypted data with passkeys. Use a recovery file instead.');
 try{return await crypto.subtle.importKey('raw',output,'AES-GCM',false,['encrypt','decrypt']);}finally{new Uint8Array(output).fill(0);}
}
export async function createPasskey(keys,recovery,accountId){
 if(!passkeysAvailable())throw Error('Passkeys require a supported browser on HTTPS. Use a recovery file instead.');
 const userId=await crypto.subtle.digest('SHA-256',enc.encode(accountId));
 const credential=await navigator.credentials.create({publicKey:{challenge:random(32),rp:{name:'Relay Planner'},user:{id:userId,name:'Relay schedule',displayName:'Relay encrypted schedule'},pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],authenticatorSelection:{residentKey:'required',userVerification:'required'},attestation:'none',extensions:{prf:{}}}});
 if(!credential?.getClientExtensionResults()?.prf?.enabled)throw Error('This passkey provider does not support encrypted-data unlock. Your schedule was not changed. Use a recovery file instead.');
 const salt=random(32),key=await prfKey(credential.rawId,salt),iv=random(12);
 const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad(accountId,keys.keyId)},key,enc.encode(recovery));
 const record={format:'relay-passkey-v1',credentialId:b64(credential.rawId),salt:b64(salt),iv:b64(iv),ciphertext:b64(ciphertext)};
 // A second actual assertion proves the saved passkey can recover this vault.
 await unlockWithPasskey(record,keys,accountId);
 return record;
}
export async function unlockWithPasskey(record,keys,accountId){
 if(!passkeysAvailable())throw Error('Use a supported browser or your recovery file.');
 const key=await prfKey(unb64(record.credentialId),unb64(record.salt));
 const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(record.iv),additionalData:aad(accountId,keys.keyId)},key,unb64(record.ciphertext));
 try{return await unlockVault(keys,dec.decode(bytes),accountId);}finally{new Uint8Array(bytes).fill(0);}
}
