export const PAIRING_TTL=300000;
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).every(k=>keys.includes(k));
const base64=(s,n)=>typeof s==='string'&&s.length===n&&/^[A-Za-z0-9+/]+={0,2}$/.test(s);
export function pairingPublicKey(p){
 if(!exact(p,['kty','crv','x','y'])||p.kty!=='EC'||p.crv!=='P-256'||![p.x,p.y].every(v=>typeof v==='string'&&/^[\w-]{43}$/.test(v)))throw Error('Invalid device public key.');
 return {kty:'EC',crv:'P-256',x:p.x,y:p.y};
}
export function pairingRequest(r){
 if(!exact(r,['id','keyId','publicKey','nonce','expiresAt'])||typeof r.id!=='string'||!/^[a-f0-9]{64}$/.test(r.id)||!base64(r.keyId,44)||!base64(r.nonce,44)||!Number.isSafeInteger(r.expiresAt))throw Error('Invalid device request.');
 return {id:r.id,keyId:r.keyId,publicKey:pairingPublicKey(r.publicKey),nonce:r.nonce,expiresAt:r.expiresAt};
}
export function pairingResponse(r){
 if(!exact(r,['publicKey','iv','ciphertext'])||!base64(r.iv,16)||!base64(r.ciphertext,108))throw Error('Invalid encrypted device response.');
 return {publicKey:pairingPublicKey(r.publicKey),iv:r.iv,ciphertext:r.ciphertext};
}
export const pairingTranscript=(accountId,request)=>JSON.stringify(['relay-device-approval-v1',accountId,pairingRequest(request)]);
