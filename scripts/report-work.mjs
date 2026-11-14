import {reportEvent} from './report-activity.mjs';
import {readFile} from 'node:fs/promises';import {pathToFileURL} from 'node:url';import {resolve} from 'node:path';
export function learningDraft(facts){
 if(facts?.publicSafe!==true)throw Error('Provide verified, public-safe facts only.');
 for(const field of ['learning','implementation','why','limits'])if(typeof facts[field]!=='string'||!facts[field].trim()||facts[field].length>800)throw Error('Provide concise verified learning, implementation, why and limits.');
 if(!Number.isFinite(Date.parse(facts.createdAt)))throw Error('Record when the draft was actually prepared.');
 return `What I learned while building:\n${facts.learning}\n\nWhat I implemented:\n${facts.implementation}\n\nWhy we are doing this:\n${facts.why}\n\nWhere it stands:\n${facts.limits}\n\nDraft for human review. Not published to LinkedIn.`;
}
export async function reportWork(event,options){
 const {post,...work}=event;const draft=post?learningDraft(post):null;
 const result=await reportEvent(work,options);
 if(draft)await reportEvent({runId:work.runId+':linkedin-draft',title:'LinkedIn draft: '+work.title.slice(0,100),kind:'agent',agent:'Writing agent',project:'content',status:'review',completedAt:post.createdAt,summary:draft,link:work.link??''},options);
 return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const file=process.argv[2];if(!file)throw Error('Use node scripts/report-work.mjs <private event.json>');
 reportWork(JSON.parse((await readFile(file,'utf8')).replace(/^\uFEFF/,''))).then(r=>console.log(r.reported?'Encrypted work reported; any post is a private draft.':'Work queued encrypted.')).catch(()=>{console.error('Reporting failed. Check private configuration and verified facts.');process.exitCode=1;});
}
