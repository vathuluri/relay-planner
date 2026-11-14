import {seal,keyId,FORMAT} from '../public/crypto.js';
import {validateActivity} from '../server/activity.mjs';
import {readFile,writeFile,mkdir,readdir,rename,unlink} from 'node:fs/promises';import {homedir} from 'node:os';import {join,resolve,dirname} from 'node:path';import {randomUUID,createHash} from 'node:crypto';import {spawn} from 'node:child_process';import {parseArgs} from 'node:util';import {pathToFileURL} from 'node:url';
export const dataDir=process.env.RELAY_DATA_DIR||join(homedir(),'.config','relay-planner');
export const configPath=process.env.RELAY_CONFIG||join(dataDir,'reporting.json');
const hash=s=>createHash('sha256').update(s).digest('hex');
export async function sendActivity(config,packet,fetcher=fetch){const url=new URL(config.endpoint);if(url.protocol!=='https:')throw Error('HTTPS endpoint required.');const r=await fetcher(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+config.token},body:JSON.stringify(packet),signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Reporting failed: HTTP '+r.status);return await r.json();}
export async function encryptActivity(config,event){
 if(config.format!==FORMAT||await keyId(config.publicKey)!==config.keyId||!config.accountId)throw Error('Encrypted reporting connection required.');
 const task=validateActivity(event,config.timeZone,new Date().toISOString());
 return {id:task.id,keyId:config.keyId,envelope:await seal(task,config.publicKey,config.accountId,task.id)};
}
async function atomicJSON(file,value){await mkdir(dirname(file),{recursive:true});const temp=file+'.'+randomUUID()+'.tmp';await writeFile(temp,JSON.stringify(value),{mode:0o600});await rename(temp,file);}
export async function reportEvent(event,{configFile=configPath,directory=dataDir,fetcher=fetch}={}){
 const config=JSON.parse(await readFile(configFile,'utf8')),id='activity-'+hash(event.runId).slice(0,40),digest=hash(JSON.stringify(event)),pending=join(directory,'outbox',id+'.json'),sent=join(directory,'sent',id+'.json');
 let record;try{record=JSON.parse(await readFile(pending,'utf8'));}catch{try{record=JSON.parse(await readFile(sent,'utf8'));}catch{}}
 if(record&&record.digest!==digest)throw Error('This run ID already has a different receipt.');
 if(!record){record={digest,packet:await encryptActivity(config,event)};await atomicJSON(pending,record);}
 try{await sendActivity(config,record.packet,fetcher);await atomicJSON(sent,record);await unlink(pending).catch(()=>{});return {reported:true};}catch{return {reported:false,queued:true};}
}
export async function flushReports({configFile=configPath,directory=dataDir,fetcher=fetch}={}){
 const config=JSON.parse(await readFile(configFile,'utf8')),queue=join(directory,'outbox');await mkdir(queue,{recursive:true});let count=0;
 for(const name of await readdir(queue)){
  if(!/^activity-[a-f0-9]{40}\.json$/.test(name))continue;
  const file=join(queue,name),record=JSON.parse(await readFile(file,'utf8'));
  // Only encrypted modern packets are retried; never upload a legacy plaintext outbox entry.
  if(record?.packet?.envelope?.format!==FORMAT)throw Error('Legacy outbox requires local migration.');
  try{await sendActivity(config,record.packet,fetcher);await atomicJSON(join(directory,'sent',name),record);await unlink(file);count++;}catch{}
 }
 return count;
}
async function main(){const argv=process.argv.slice(2),split=argv.indexOf('--'),prefix=split<0?argv:argv.slice(0,split),command=split<0?[]:argv.slice(split+1);const {values:o,positionals:[mode]}=parseArgs({args:prefix,allowPositionals:true,options:{config:{type:'string'},file:{type:'string'},title:{type:'string'},agent:{type:'string'},kind:{type:'string'}}});
 const configFile=o.config||configPath;
 if(mode==='install'){if(!o.file)throw Error('Use install --file <downloaded relay-reporting.json>');const config=JSON.parse(await readFile(o.file,'utf8'));if(config.format!==FORMAT||await keyId(config.publicKey)!==config.keyId||config.publicKey.d||config.scope!=='activity:append'||!/^rly_[a-f0-9]{64}$/.test(config.token)||new URL(config.endpoint).protocol!=='https:')throw Error('Invalid reporting config.');await atomicJSON(configFile,config);console.log('Encrypted reporting connection saved privately.');return;}
 async function submit(event){try{const r=await reportEvent(event,{configFile});console.log(r.reported?'Encrypted activity reported.':'Encrypted activity queued; use flush to retry.');}catch{console.error('Activity reporting unavailable. No plaintext outbox was written.');}}
 if(mode==='send'){if(!o.file)throw Error('Use send --file <activity.json>');await submit(JSON.parse((await readFile(o.file,'utf8')).replace(/^\uFEFF/,'')));return;}
 if(mode==='flush'){console.log('Encrypted receipts sent: '+await flushReports({configFile}));return;}
 if(mode!=='run'||!o.title||!command.length)throw Error('Use run --title <summary> [--kind automation|agent] [--agent <name>] -- <executable> <arguments>');
 const startedAt=new Date().toISOString(),runId=randomUUID();const status=await new Promise(resolve=>{const child=spawn(command[0],command.slice(1),{stdio:'inherit',shell:false});child.once('error',()=>resolve(1));child.once('exit',code=>resolve(code??1));});
 await submit({runId,title:o.title,kind:o.kind||'automation',agent:o.agent||'Script',status:status===0?'done':'attention',startedAt,completedAt:new Date().toISOString(),summary:status===0?'Command completed successfully.':'Command failed or was interrupted. Check its local log. Machine runtime is not human work time.'});process.exitCode=status;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(()=>{console.error('Reporter failed. Check arguments and private configuration; no credential was printed.');process.exitCode=1;});
