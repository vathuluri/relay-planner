import {FORMAT} from './envelopes.mjs';
import {PAIRING_TTL,pairingRequest,pairingResponse} from '../public/pairing-format.js';
const headers={'Cache-Control':'private, no-store','Vary':'Cookie, Authorization','X-Content-Type-Options':'nosniff'};
const reply=(body,status=200)=>Response.json(body,{status,headers});
export function createPairingHandler({getUser,getStore,now=()=>Date.now()}){return async req=>{
 let user;try{user=await getUser();}catch{}if(typeof user?.id!=='string'||!user.id||user.id.length>200)return reply({error:'Sign in required.'},401);
 if(!['GET','POST'].includes(req.method))return reply({error:'Method not allowed.'},405);
 if(req.method==='POST'&&(req.headers.get('origin')!==new URL(req.url).origin||!req.headers.get('content-type')?.startsWith('application/json')))return reply({error:'Same-origin JSON required.'},403);
 try{
  const store=getStore(),prefix='users/'+encodeURIComponent(user.id)+'/',key=prefix+'device-pairing';
  const vault=await store.getWithMetadata(prefix+'schedule',{type:'json',consistency:'strong'});if(vault?.data?.format!==FORMAT||!vault.data.keys?.keyId)return reply({error:'Encrypt your schedule first.'},409);
  if(req.method==='GET'){const saved=await store.getWithMetadata(key,{type:'json',consistency:'strong'});return reply({requests:(saved?.data?.requests??[]).filter(r=>r.request.expiresAt>now()&&r.request.keyId===vault.data.keys.keyId)});}
  let body;try{const raw=await req.text();if(Buffer.byteLength(raw)>8000)throw Error();body=JSON.parse(raw);}catch{return reply({error:'Invalid device request.'},400);}
  if(body.accountId!==user.id)return reply({error:'Account changed.'},409);
  if(!['request','approve','consume','cancel'].includes(body.action))return reply({error:'Invalid action.'},400);
  const allowed=body.action==='request'?['accountId','action','request']:body.action==='approve'?['accountId','action','id','response']:['accountId','action','id'];
  if(Object.keys(body).some(k=>!allowed.includes(k)))return reply({error:'Unexpected device data.'},400);
  let request,response;try{if(body.action==='request'){request=pairingRequest(body.request);if(request.expiresAt<=now()||request.expiresAt>now()+PAIRING_TTL+30000||request.keyId!==vault.data.keys.keyId)throw Error();}else if(typeof body.id!=='string'||!/^[a-f0-9]{64}$/.test(body.id))throw Error();if(body.action==='approve')response=pairingResponse(body.response);}catch{return reply({error:'Invalid or expired device envelope.'},400);}
  for(let retry=0;retry<3;retry++){
   const saved=await store.getWithMetadata(key,{type:'json',consistency:'strong'});const rows=(saved?.data?.requests??[]).filter(r=>r.request.expiresAt>now()&&r.request.keyId===vault.data.keys.keyId).map(r=>structuredClone(r));
   const item=rows.find(r=>r.request.id===(request?.id??body.id));
   if(body.action==='request'){if(item)return reply({error:'Request already exists.'},409);if(rows.length>=5)return reply({error:'Too many active requests. Cancel one or wait five minutes.'},429);rows.push({request,status:'pending'});}
   else{
    if(!item)return reply({error:'Request expired or not found.'},410);
    if(body.action==='approve'){if(item.status!=='pending')return reply({error:'Request is no longer awaiting approval.'},409);item.status='approved';item.response=response;}
    if(body.action==='consume'){if(item.status==='consumed')return reply({ok:true});if(item.status!=='approved')return reply({error:'Device is not approved.'},409);item.status='consumed';delete item.response;}
    if(body.action==='cancel'){if(item.status==='consumed')return reply({error:'Device already consumed approval.'},409);item.status='cancelled';delete item.response;}
   }
   const result=await store.setJSON(key,{requests:rows},saved?{onlyIfMatch:saved.etag}:{onlyIfNew:true});if(result.modified)return reply({ok:true});
  }
  return reply({error:'Device requests changed. Retry.'},409);
 }catch{return reply({error:'Device approval unavailable. Try again.'},503);}
};}
