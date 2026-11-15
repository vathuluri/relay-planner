import {b64,unb64,unlockVault} from './crypto.js';
import {PAIRING_TTL,pairingRequest,pairingPublicKey,pairingResponse,pairingTranscript} from './pairing-format.js';
const enc=new TextEncoder(),dec=new TextDecoder(),random=n=>crypto.getRandomValues(new Uint8Array(n));
const publicJwk=async key=>{const p=await crypto.subtle.exportKey('jwk',key);return pairingPublicKey({kty:p.kty,crv:p.crv,x:p.x,y:p.y});};
const expired=(r,now)=>{if(r.expiresAt<=now||r.expiresAt>now+PAIRING_TTL+30000)throw Error('Device request expired. Start a new request.');};
export async function createDeviceRequest(keyId,now=Date.now()){
 const pair=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},false,['deriveBits']);
 return {privateKey:pair.privateKey,request:pairingRequest({id:Array.from(random(32),b=>b.toString(16).padStart(2,'0')).join(''),keyId,publicKey:await publicJwk(pair.publicKey),nonce:b64(random(32)),expiresAt:now+PAIRING_TTL})};
}
export async function deviceCode(accountId,request){
 const digest=await crypto.subtle.digest('SHA-256',enc.encode(pairingTranscript(accountId,request)));
 const hex=Array.from(new Uint8Array(digest).slice(0,6),b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();return hex.slice(0,6)+'-'+hex.slice(6);
}
async function transportKey(privateKey,peer,accountId,request,responsePublicKey){
 const pub=await crypto.subtle.importKey('jwk',pairingPublicKey(peer),{name:'ECDH',namedCurve:'P-256'},false,[]);
 const bits=await crypto.subtle.deriveBits({name:'ECDH',public:pub},privateKey,256);
 try{const material=await crypto.subtle.importKey('raw',bits,'HKDF',false,['deriveKey']);return await crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt:unb64(request.nonce),info:enc.encode(pairingTranscript(accountId,request)+JSON.stringify(pairingPublicKey(responsePublicKey)))},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}finally{new Uint8Array(bits).fill(0);}
}
export async function approveDevice(request,recovery,accountId,now=Date.now()){
 request=pairingRequest(request);expired(request,now);if(!/^[a-f0-9]{64}$/i.test(recovery))throw Error('Invalid vault secret.');
 const pair=await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},false,['deriveBits']),publicKey=await publicJwk(pair.publicKey);
 const key=await transportKey(pair.privateKey,request.publicKey,accountId,request,publicKey),iv=random(12);
 const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(pairingTranscript(accountId,request))},key,enc.encode(recovery));
 return {publicKey,iv:b64(iv),ciphertext:b64(ciphertext)};
}
export async function receiveDevice(local,response,keys,accountId,now=Date.now()){
 const request=pairingRequest(local.request);expired(request,now);if(request.keyId!==keys.keyId)throw Error('Vault key changed.');response=pairingResponse(response);
 const key=await transportKey(local.privateKey,response.publicKey,accountId,request,response.publicKey);
 const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(response.iv),additionalData:enc.encode(pairingTranscript(accountId,request))},key,unb64(response.ciphertext));
 try{return await unlockVault(keys,dec.decode(bytes),accountId);}finally{new Uint8Array(bytes).fill(0);}
}
