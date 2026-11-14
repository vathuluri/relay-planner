export const FORMAT='relay-e2ee-v1';
const exact=(obj,keys)=>!!obj&&typeof obj==='object'&&!Array.isArray(obj)&&Object.keys(obj).every(k=>keys.includes(k));
const b64=(s,min,max)=>typeof s==='string'&&s.length>=min&&s.length<=max&&s.length%4===0&&/^[A-Za-z0-9+/]+={0,2}$/.test(s);
export function validateEnvelope(e){
 if(!exact(e,['format','iv','wrappedKey','ciphertext'])||e.format!==FORMAT||!b64(e.iv,16,16)||!b64(e.wrappedKey,512,512)||!b64(e.ciphertext,24,2_000_000))throw Error('Invalid encrypted envelope.');
 return {format:FORMAT,iv:e.iv,wrappedKey:e.wrappedKey,ciphertext:e.ciphertext};
}
export function validateKeys(k){
 if(!exact(k,['format','keyId','publicKey','wrappedPrivate'])||k.format!==FORMAT||!b64(k.keyId,44,44))throw Error('Invalid encryption keys.');
 const p=k.publicKey;
 if(!exact(p,['kty','n','e','alg','ext','key_ops'])||p.kty!=='RSA'||p.e!=='AQAB'||typeof p.n!=='string'||p.n.length!==512||!/^[\w-]+$/.test(p.n)||p.alg!=='RSA-OAEP-256'||p.ext!==true||JSON.stringify(p.key_ops)!=='["encrypt"]')throw Error('Public encryption key required.');
 const w=k.wrappedPrivate;if(!exact(w,['iv','ciphertext'])||!b64(w.iv,16,16)||!b64(w.ciphertext,24,8000))throw Error('Encrypted recovery material required.');
 return {format:FORMAT,keyId:k.keyId,publicKey:p,wrappedPrivate:{iv:w.iv,ciphertext:w.ciphertext}};
}
