import {createHash,randomBytes} from 'node:crypto';
import {FORMAT,validateEnvelope} from './envelopes.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex');
const base={'Cache-Control':'private, no-store','Vary':'Cookie, Authorization','X-Content-Type-Options':'nosniff'};
const reply=(data,status=200)=>Response.json(data,{status,headers:base});
export const feedKey=id=>'users/'+encodeURIComponent(id)+'/activity';
export const encryptedFeedKey=id=>'users/'+encodeURIComponent(id)+'/encrypted-activity';
const ownerKey=id=>'users/'+encodeURIComponent(id)+'/reporting-key';
async function json(req,max=16000){const text=await req.text();if(Buffer.byteLength(text)>max)throw Error('Too large');return JSON.parse(text);}
export function createConnectionHandler({getUser,getStore,now=()=>Date.now()}){return async req=>{
 let user;try{user=await getUser();}catch{}if(typeof user?.id!=='string'||!user.id||user.id.length>200)return reply({error:'Sign in required.'},401);
 if(!['GET','POST','DELETE'].includes(req.method))return reply({error:'Method not allowed.'},405);
 if(req.method!=='GET'&&req.headers.get('origin')!==new URL(req.url).origin)return reply({error:'Origin refused.'},403);
 try{const store=getStore(),key=ownerKey(user.id);
  if(req.method==='GET'){const old=await store.getWithMetadata(key,{type:'json',consistency:'strong'});return reply({connected:!!old?.data?.active&&old.data.expiresAt>now(),expiresAt:old?.data?.expiresAt??null});}
  if(req.method==='DELETE'){await store.setJSON(key,{active:false});return reply({revoked:true});}
  let body;try{body=await json(req);new Intl.DateTimeFormat('en-US',{timeZone:body.timeZone});if(typeof body.timeZone!=='string')throw Error();}catch{return reply({error:'Valid timezone required.'},400);}
  const vault=await store.getWithMetadata('users/'+encodeURIComponent(user.id)+'/schedule',{type:'json',consistency:'strong'});
  if(vault?.data?.format!==FORMAT)return reply({error:'Encrypt your schedule before connecting agents.'},409);
  const token='rly_'+randomBytes(32).toString('hex'),digest=hash(token),expiresAt=now()+30*86400000;
  await store.setJSON('reporting-tokens/'+digest,{accountId:user.id});
  await store.setJSON(key,{active:true,digest,expiresAt,keyId:vault.data.keys.keyId});
  return reply({endpoint:new URL('/.netlify/functions/activity',req.url).href,token,expiresAt,timeZone:body.timeZone,scope:'activity:append',format:FORMAT,accountId:user.id,keyId:vault.data.keys.keyId,publicKey:vault.data.keys.publicKey});
 }catch{return reply({error:'Connection unavailable.'},503);}
};}
export function validateActivity(body,timeZone,receivedAt){
 if(!body||typeof body.runId!=='string'||!body.runId.trim()||body.runId.length>160)throw Error('runId required');
 if(typeof body.title!=='string'||!body.title.trim()||body.title.length>120)throw Error('title required');
 if(!['done','attention','review'].includes(body.status)||!['agent','automation'].includes(body.kind))throw Error('invalid result');
 const stamp=v=>{if(typeof v!=='string'||!/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(v)||!Number.isFinite(Date.parse(v)))throw Error('ISO timestamp with timezone required');return new Date(v).toISOString();};
 const completedAt=stamp(body.completedAt),startedAt=body.startedAt?stamp(body.startedAt):null;
 if(Date.parse(completedAt)>Date.parse(receivedAt)+300000||startedAt&&startedAt>completedAt)throw Error('invalid times');
 const summary=body.summary??'',agent=body.agent??(body.kind==='automation'?'Automation':'Agent'),link=body.link??'';
 if(typeof summary!=='string'||summary.length>4000||typeof agent!=='string'||agent.length>80||typeof link!=='string'||link.length>2000)throw Error('invalid fields');
 if(link&&new URL(link).protocol!=='https:')throw Error('HTTPS link required');
 const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(completedAt));const get=k=>parts.find(p=>p.type===k).value;
 return {id:'activity-'+hash(body.runId).slice(0,40),title:body.title.trim(),project:['launch','engineering','content'].includes(body.project)?body.project:'engineering',owner:body.kind==='automation'?'automation':'code',date:`${get('year')}-${get('month')}-${get('day')}`,time:'',status:body.status,notes:'Reported automatically. Runtime is not human work time.',result:summary,link,history:[],activity:{runId:body.runId,kind:body.kind,agent,startedAt,completedAt,receivedAt,timeZone}};
}
export function createActivityHandler({getStore,now=()=>Date.now()}){return async req=>{
 if(req.method!=='POST')return reply({error:'Method not allowed.'},405);
 const token=req.headers.get('authorization')?.match(/^Bearer (rly_[a-f0-9]{64})$/)?.[1];if(!token)return reply({error:'Reporting key required.'},401);
 try{const store=getStore(),digest=hash(token),lookup=await store.getWithMetadata('reporting-tokens/'+digest,{type:'json',consistency:'strong'}),accountId=lookup?.data?.accountId;
  if(!accountId)return reply({error:'Invalid reporting key.'},401);
  const key=await store.getWithMetadata(ownerKey(accountId),{type:'json',consistency:'strong'});
  if(!key?.data?.active||key.data.digest!==digest||key.data.expiresAt<=now()||!key.data.keyId)return reply({error:'Key revoked, outdated or expired.'},401);
  let body,envelope;try{body=await json(req,100000);if(Object.keys(body).some(k=>!['id','keyId','envelope'].includes(k))||!/^activity-[a-f0-9]{40}$/.test(body.id)||body.keyId!==key.data.keyId)throw Error();envelope=validateEnvelope(body.envelope);}catch{return reply({error:'Encrypted receipt required.'},400);}
  const fingerprint=hash(JSON.stringify(envelope));
  for(let attempt=0;attempt<5;attempt++){
   const feed=await store.getWithMetadata(encryptedFeedKey(accountId),{type:'json',consistency:'strong'}),records=feed?.data?.records??[];
   const old=records.find(r=>r.id===body.id);if(old)return old.fingerprint===fingerprint?reply({accepted:true,duplicate:true}):reply({error:'Run ID already used.'},409);
   if(records.length>=500)return reply({error:'Activity history is full.'},429);
   const result=await store.setJSON(encryptedFeedKey(accountId),{records:[...records,{id:body.id,keyId:body.keyId,envelope,fingerprint}]},feed?{onlyIfMatch:feed.etag}:{onlyIfNew:true});
   if(result.modified)return reply({accepted:true,duplicate:false},201);
  }
  return reply({error:'Busy. Retry the same encrypted receipt.'},409);
 }catch{return reply({error:'Reporting unavailable.'},503);}
};}
