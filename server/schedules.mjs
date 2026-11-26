import {feedKey,encryptedFeedKey,reportingStatusKey} from './activity.mjs';
import {FORMAT,validateEnvelope,validateKeys,validatePasskey} from './envelopes.mjs';
const projects=new Set(['launch','engineering','content']);
const owners=new Set(['human','code','research','writing','automation']);
const statuses=new Set(['planned','working','review','done','attention']);
export function validateTasks(input){
 if(!Array.isArray(input)||input.length>500)throw Error('Use at most 500 tasks.');
 const rows=input.map(t=>{
  if(!t||typeof t!=='object'||!projects.has(t.project)||!owners.has(t.owner)||!statuses.has(t.status))throw Error('Invalid task.');
  const limits={id:100,title:120,date:10,time:5,notes:4000,result:4000,link:2000};const clean={project:t.project,owner:t.owner,status:t.status};
  for(const [k,max]of Object.entries(limits)){const v=t[k]??'';if(typeof v!=='string'||v.length>max)throw Error('Invalid '+k);clean[k]=v;}
  if(clean.id.startsWith('activity-')||!clean.id||!clean.title.trim())throw Error('A task needs a title and ID.');
  if(clean.date&&(!/^\d{4}-\d{2}-\d{2}$/.test(clean.date)||!Number.isFinite(Date.parse(clean.date+'T12:00:00Z'))||new Date(clean.date+'T12:00:00Z').toISOString().slice(0,10)!==clean.date))throw Error('Invalid date.');
  if(clean.time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(clean.time))throw Error('Invalid time.');
  if(clean.link&&!['https:','http:'].includes(new URL(clean.link).protocol))throw Error('Invalid link.');
  clean.history=[];
  if(t.history!==undefined){if(!Array.isArray(t.history)||t.history.length>10)throw Error('Invalid history.');clean.history=t.history.map(e=>{if(typeof e?.text!=='string'||e.text.length>500||typeof e.at!=='string'||!Number.isFinite(Date.parse(e.at)))throw Error('Invalid history.');return {text:e.text,at:new Date(e.at).toISOString()};});}
  return clean;
 });
 if(new Set(rows.map(t=>t.id)).size!==rows.length)throw Error('Duplicate task IDs.');return rows;
}
const headers={'Cache-Control':'private, no-store','Vary':'Cookie, Authorization','X-Content-Type-Options':'nosniff'};
const reply=(data,status=200)=>Response.json(data,{status,headers});
export function createScheduleHandler({getUser,getStore}){return async req=>{
 let user;try{user=await getUser();}catch{}if(typeof user?.id!=='string'||!user.id||user.id.length>200)return reply({error:'Sign in required.'},401);
 if(!['GET','PUT','POST'].includes(req.method))return reply({error:'Method not allowed.'},405);
 const key='users/'+encodeURIComponent(user.id)+'/schedule';
 try{
  const store=getStore();
  if(req.method==='GET'){
   const found=await store.getWithMetadata(key,{type:'json',consistency:'strong'});
   if(found?.data?.format===FORMAT){const feed=await store.getWithMetadata(encryptedFeedKey(user.id),{type:'json',consistency:'strong'});const status=await store.getWithMetadata(reportingStatusKey(user.id),{type:'json',consistency:'strong'});return reply({vault:found.data,version:found.etag,accountId:user.id,feed:feed?.data?.records??[],feedVersion:feed?.etag??null,reporting:{lastAcceptedAt:feed?.data?.lastAcceptedAt??null,retrying:!!status?.data?.at&&status.data.at>(feed?.data?.lastAcceptedAt??'')}});}
   const feed=await store.getWithMetadata(feedKey(user.id),{type:'json',consistency:'strong'});
   return reply({migrationRequired:true,tasks:[...(found?.data?.tasks??[]),...(feed?.data?.records??[]).map(r=>r.task)],version:found?.etag??null,accountId:user.id,feedVersion:feed?.etag??null});
  }
  if(req.headers.get('origin')!==new URL(req.url).origin)return reply({error:'Request origin refused.'},403);
  if(!req.headers.get('content-type')?.startsWith('application/json'))return reply({error:'JSON required.'},415);
  const raw=await req.text();if(Buffer.byteLength(raw)>2_100_000)return reply({error:'Schedule too large.'},413);
  let body;try{body=JSON.parse(raw);}catch{return reply({error:'Invalid request.'},400);}
  if(body.accountId!==user.id)return reply({error:'Account changed. Sign in again.'},409);
  const found=await store.getWithMetadata(key,{type:'json',consistency:'strong'});
  // Cleanup follows browser readback and verification of the committed migration.
  if(req.method==='POST'){
   if(body.action==='add-device-transfer'){
    if(found?.data?.format!==FORMAT||found.etag!==body.version||found.data.transferEnvelope)return reply({error:'Schedule changed or approvals already enabled. Refresh first.'},409);
    let transferEnvelope;try{transferEnvelope=validateEnvelope(body.transferEnvelope);}catch{return reply({error:'Encrypted transfer envelope required.'},400);}
    const result=await store.setJSON(key,{...found.data,transferEnvelope},{onlyIfMatch:body.version});return result.modified?reply({version:result.etag}):reply({error:'Schedule changed. Refresh first.'},409);
   }
   if(body.action==='add-passkey'){
    if(found?.data?.format!==FORMAT||found.etag!==body.version||found.data.passkey)return reply({error:'Schedule changed or passkey already exists. Refresh first.'},409);
    let passkey;try{passkey=validatePasskey(body.passkey);}catch{return reply({error:'Encrypted passkey envelope required.'},400);}
    const result=await store.setJSON(key,{...found.data,passkey},{onlyIfMatch:body.version});
    return result.modified?reply({version:result.etag}):reply({error:'Schedule changed. Refresh first.'},409);
   }
   if(body.action!=='confirm-migration'||found?.data?.format!==FORMAT||found.etag!==body.version)return reply({error:'Migration changed. Refresh first.'},409);
   const legacy=await store.getWithMetadata(feedKey(user.id),{type:'json',consistency:'strong'});
   if(legacy){if(legacy.etag!==found.data.migratedFeedVersion)return reply({error:'Legacy activity changed; cleanup refused.'},409);await store.delete(feedKey(user.id));}
   return reply({confirmed:true,legacyActivityRemoved:true});
  }
  if((found?.etag??null)!==body.version)return reply({error:'Schedule changed on another device. Refresh first.'},409);
  let keys,envelope;try{keys=validateKeys(body.keys);envelope=validateEnvelope(body.envelope);}catch{return reply({error:'Encrypted schedule required. Update this browser.'},400);}
  if(found?.data?.format===FORMAT&&JSON.stringify(keys)!==JSON.stringify(found.data.keys))return reply({error:'Encryption key replacement is not supported.'},409);
  let migratedFeedVersion=found?.data?.migratedFeedVersion??null;
  if(found?.data?.format!==FORMAT){
   const legacy=await store.getWithMetadata(feedKey(user.id),{type:'json',consistency:'strong'});
   if(!body.migrate||(legacy?.etag??null)!==body.feedVersion)return reply({error:'Migration source changed. Refresh first.'},409);
   migratedFeedVersion=legacy?.etag??null;
  }
  let passkey=found?.data?.passkey;
  if(body.passkey!==undefined){if(found?.data?.format===FORMAT)return reply({error:'Use passkey setup without replacing the schedule.'},400);try{passkey=validatePasskey(body.passkey);}catch{return reply({error:'Invalid passkey envelope.'},400);}}
  let transferEnvelope=found?.data?.transferEnvelope;
  if(body.transferEnvelope!==undefined){if(found?.data?.format===FORMAT)return reply({error:'Use approval setup without replacing the schedule.'},400);try{transferEnvelope=validateEnvelope(body.transferEnvelope);}catch{return reply({error:'Invalid transfer envelope.'},400);}}
  const vault={format:FORMAT,keys,envelope,migratedFeedVersion,...(passkey?{passkey}:{}),...(transferEnvelope?{transferEnvelope}:{})};
  const result=await store.setJSON(key,vault,body.version===null?{onlyIfNew:true}:{onlyIfMatch:body.version});
  if(!result.modified)return reply({error:'Schedule changed on another device. Refresh first.'},409);
  return reply({version:result.etag});
 }catch{return reply({error:'Schedule unavailable. Please try again.'},503);}
};}
