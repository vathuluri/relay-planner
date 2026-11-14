import {feedKey} from './activity.mjs';
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
 let user;try{user=await getUser();}catch{return reply({error:'Sign in required.'},401);}
 if(typeof user?.id!=='string'||!user.id||user.id.length>200)return reply({error:'Sign in required.'},401);
 if(!['GET','PUT'].includes(req.method))return new Response(null,{status:405,headers:{...headers,Allow:'GET, PUT'}});
 const key='users/'+encodeURIComponent(user.id)+'/schedule';
 try{
  const store=getStore();
  if(req.method==='GET'){const found=await store.getWithMetadata(key,{type:'json',consistency:'strong'});const feed=await store.getWithMetadata(feedKey(user.id),{type:'json',consistency:'strong'});return reply({tasks:[...(found?.data?.tasks??[]),...(feed?.data?.records??[]).map(r=>r.task)],version:found?.etag??null,accountId:user.id,feedVersion:feed?.etag??null});}
  if(req.headers.get('origin')!==new URL(req.url).origin)return reply({error:'Request origin refused.'},403);
  if(!req.headers.get('content-type')?.startsWith('application/json'))return reply({error:'JSON required.'},415);
  if(Number(req.headers.get('content-length'))>1_000_000)return reply({error:'Schedule too large.'},413);
  const raw=await req.text();if(new TextEncoder().encode(raw).length>1_000_000)return reply({error:'Schedule too large.'},413);
  let body,tasks;try{body=JSON.parse(raw);if(body.accountId!==user.id)return reply({error:'Account changed. Sign in again before saving.'},409);tasks=validateTasks(body.tasks);if(body.version!==null&&(typeof body.version!=='string'||body.version.length>200))throw Error();}catch{return reply({error:'Invalid schedule.'},400);}
  const result=await store.setJSON(key,{tasks,updatedAt:new Date().toISOString()},body.version===null?{onlyIfNew:true}:{onlyIfMatch:body.version});
  if(!result.modified)return reply({error:'This schedule changed on another device. Refresh before trying again.'},409);
  return reply({version:result.etag});
 }catch{return reply({error:'Schedule unavailable. Please try again.'},503);}
};}
