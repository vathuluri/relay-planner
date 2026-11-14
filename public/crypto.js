// Shared browser/Node Web Crypto primitives. No secret is sent to the server.
const enc=new TextEncoder(),dec=new TextDecoder();
export const FORMAT='relay-e2ee-v1';
export const b64=bytes=>{let s='';for(const b of new Uint8Array(bytes))s+=String.fromCharCode(b);return btoa(s);};
export const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const context=(accountId,purpose)=>enc.encode(JSON.stringify([FORMAT,accountId,purpose]));
export async function keyId(publicKey){return b64(await crypto.subtle.digest('SHA-256',enc.encode(publicKey.n+':'+publicKey.e)));}
export async function createVaultKeys(accountId){
 const pair=await crypto.subtle.generateKey({name:'RSA-OAEP',modulusLength:3072,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['encrypt','decrypt']);
 const publicKey=await crypto.subtle.exportKey('jwk',pair.publicKey),privateBytes=await crypto.subtle.exportKey('pkcs8',pair.privateKey);
 const secret=crypto.getRandomValues(new Uint8Array(32)),iv=crypto.getRandomValues(new Uint8Array(12));
 const recoveryKey=await crypto.subtle.importKey('raw',secret,'AES-GCM',false,['encrypt']);
 const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:context(accountId,'recovery')},recoveryKey,privateBytes);
 const privateKey=await crypto.subtle.importKey('pkcs8',privateBytes,{name:'RSA-OAEP',hash:'SHA-256'},false,['decrypt']);
 new Uint8Array(privateBytes).fill(0);
 return {privateKey,recovery:Array.from(secret,b=>b.toString(16).padStart(2,'0')).join(''),record:{format:FORMAT,keyId:await keyId(publicKey),publicKey,wrappedPrivate:{iv:b64(iv),ciphertext:b64(ciphertext)}}};
}
export async function unlockVault(record,recovery,accountId){
 const hex=recovery.trim().replaceAll('-','');if(!/^[a-f0-9]{64}$/i.test(hex))throw Error('Use the 64-character recovery key.');
 const raw=Uint8Array.from(hex.match(/../g),v=>parseInt(v,16));
 const key=await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['decrypt']);raw.fill(0);
 const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(record.wrappedPrivate.iv),additionalData:context(accountId,'recovery')},key,unb64(record.wrappedPrivate.ciphertext));
 try{return await crypto.subtle.importKey('pkcs8',bytes,{name:'RSA-OAEP',hash:'SHA-256'},false,['decrypt']);}finally{new Uint8Array(bytes).fill(0);}
}
export async function seal(value,publicJwk,accountId,purpose){
 const publicKey=await crypto.subtle.importKey('jwk',publicJwk,{name:'RSA-OAEP',hash:'SHA-256'},false,['encrypt']);
 const aes=await crypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt','decrypt']),iv=crypto.getRandomValues(new Uint8Array(12));
 const aad=context(accountId,purpose);
 return {format:FORMAT,iv:b64(iv),wrappedKey:b64(await crypto.subtle.encrypt({name:'RSA-OAEP',label:aad},publicKey,await crypto.subtle.exportKey('raw',aes))),ciphertext:b64(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad},aes,enc.encode(JSON.stringify(value))))};
}
export async function open(envelope,privateKey,accountId,purpose){
 if(envelope?.format!==FORMAT)throw Error('Unsupported encryption format.');
 const aad=context(accountId,purpose),raw=await crypto.subtle.decrypt({name:'RSA-OAEP',label:aad},privateKey,unb64(envelope.wrappedKey));
 const aes=await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['decrypt']);new Uint8Array(raw).fill(0);
 return JSON.parse(dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(envelope.iv),additionalData:aad},aes,unb64(envelope.ciphertext))));
}
