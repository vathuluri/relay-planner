import {dayKey,parseDay,addDays,weekStart,monthDays,sortTasks,reschedule} from './calendar.js';
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const projects=globalThis.relaySession?.projects??{launch:'Product launch',engineering:'Engineering',content:'Content studio'};
const owners={human:'Human',code:'Code agent',research:'Research agent',writing:'Writing agent'};
const statuses={planned:'Planned',working:'Working',review:'Needs review',done:'Done',attention:'Needs attention'};
const storageKey='relay-planner-demo-v1';
const now=new Date();now.setHours(12,0,0,0);
let cursor=new Date(now),selected=dayKey(now),view=matchMedia('(max-width:760px)').matches?'agenda':'week',page='calendar',editing=null,undoState=null,toastTimer;
const dateLabel=(date,options)=>new Intl.DateTimeFormat('en-US',options).format(date);
const timeLabel=value=>value?new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit'}).format(new Date(`2000-01-01T${value}`)):'Anytime';
function seed(){
  const start=weekStart(now),day=n=>dayKey(addDays(start,n));
  const rows=[
    ['Map the launch story','launch','human',0,'09:00','done'],
    ['Audit onboarding flow','engineering','code',0,'11:00','done'],
    ['Explore audience insights','content','research',1,'09:30','done'],
    ['Shape the release notes','launch','writing',1,'14:00','review'],
    ['Review keyboard navigation','engineering','code',2,'10:00','review'],
    ['Plan the next campaign','content','human',2,'14:30','planned'],
    ['Check the API contract','engineering','code',3,'09:00','working'],
    ['Refine the product brief','launch','human',3,'13:00','planned'],
    ['Prepare the weekly roundup','content','writing',4,'09:30','planned'],
    ['Review the week’s progress','launch','human',4,'15:00','planned'],
    ['Explore a smaller prototype','engineering','code',5,'11:00','planned'],
    ['Make space for next week','launch','human',6,'17:00','planned'],
    ['Sketch a customer journey','launch','human',null,'','planned'],
    ['Research reusable patterns','engineering','research',null,'','planned'],
    ['Draft a product walkthrough','content','writing',null,'','planned'],
  ];
  // Keep the selected day useful even when the demo is opened on a different weekday.
  return rows.map(([title,project,owner,offset,time,status],i)=>({id:`demo-${i}`,title,project,owner,date:offset===null?'':day(offset),time,status,notes:'Work on the fictional Studio project. Attach a concise summary and state what was checked.',result:status==='review'?'Draft ready. Review the proposed changes and decide what should move forward.':'',link:'',history:[]}));
}
function load(){try{const saved=JSON.parse(localStorage.getItem(storageKey));if(Array.isArray(saved)&&saved.length<=1000&&saved.every(t=>t&&typeof t.id==='string'&&typeof t.title==='string'&&t.project in projects&&t.owner in owners&&t.status in statuses&&typeof t.date==='string'&&(!t.date||/^\d{4}-\d{2}-\d{2}$/.test(t.date))&&typeof t.time==='string'&&(!t.time||/^\d{2}:\d{2}$/.test(t.time))))return saved;}catch{}return seed();}
let tasks=globalThis.relaySession?.tasks??load();
let cloudSaving=false;
function persist(){try{localStorage.setItem(storageKey,JSON.stringify(tasks));return true;}catch{return false;}}
function notify(message,allowUndo=true){$('toast-message').textContent=message;$('undo').hidden=!allowUndo;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,6500);}
function change(message,update){if(globalThis.relaySession)return saveCloud(message,update);undoState=structuredClone(tasks);tasks=update(tasks);const saved=persist();render();notify(saved?message:`${message} · Browser saving unavailable`);}
async function saveCloud(message,update){if(cloudSaving)return;cloudSaving=true;const previous=structuredClone(tasks),next=update(structuredClone(tasks));$('workspace').inert=true;try{await globalThis.relaySession.save(next);undoState=previous;tasks=next;render();notify(message);}catch(err){notify(err.message||'Not saved. Refresh and try again.',false);}finally{cloudSaving=false;$('workspace').inert=false;}}
function event(task,text){return {...task,history:[...(task.history||[]).slice(-9),{text,at:new Date().toISOString()}]};}
function card(task,month=false){const agent=task.owner!=='human';return `<button draggable="true" class="${month?'month-task':'task-card'} ${esc(task.project)}" data-task="${esc(task.id)}" aria-label="${esc(task.title)}, ${esc(owners[task.owner])}, ${esc(statuses[task.status])}">${month?`${esc(task.time?timeLabel(task.time):'')} ${esc(task.title)}`:`<time class="task-time">${esc(timeLabel(task.time))}</time><span class="task-title">${esc(task.title)}</span><span class="task-owner"><span class="owner-mark ${agent?'agent-mark':''}">${agent?'⌘':'◉'}</span>${owners[task.owner]}</span><span class="task-status ${task.status}">${statuses[task.status]}</span>`}</button>`;}
function dayTasks(date){return sortTasks(tasks.filter(t=>t.date===date));}
function renderCalendar(){
  const start=weekStart(cursor),days=Array.from({length:7},(_,i)=>addDays(start,i));
  $('range-label').textContent=view==='month'?dateLabel(cursor,{month:'long',year:'numeric'}):`${dateLabel(start,{month:'short',day:'numeric'})} – ${dateLabel(addDays(start,6),{month:'short',day:'numeric',year:'numeric'})}`;
  document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);b.setAttribute('aria-pressed',String(b.dataset.view===view));});
  const isToday=date=>dayKey(date)===dayKey(now)?' is-today':'';
  if(view==='week'){
    $('calendar').innerHTML=`<div class="week-grid">${days.map(date=>{const key=dayKey(date);return `<section class="day-column${isToday(date)}" data-drop="${key}"><div class="day-heading"><span>${dateLabel(date,{weekday:'short'})}</span><button class="day-number" data-day="${key}" aria-label="Open ${dateLabel(date,{dateStyle:'full'})}">${date.getDate()}</button></div><div class="day-tasks">${dayTasks(key).map(t=>card(t)).join('')}</div><button class="day-add" data-add="${key}" aria-label="Add task on ${key}">+</button></section>`;}).join('')}</div>`;
  }else if(view==='month'){
    $('calendar').innerHTML=`<div class="month-grid">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day=>`<div class="month-label">${day}</div>`).join('')}${monthDays(cursor).map(date=>{const key=dayKey(date);return `<section class="month-cell${date.getMonth()!==cursor.getMonth()?' outside':''}${isToday(date)}" data-drop="${key}"><button class="day-number" data-day="${key}" aria-label="Open ${dateLabel(date,{dateStyle:'full'})}">${date.getDate()}</button>${dayTasks(key).map(t=>card(t,true)).join('')}</section>`;}).join('')}</div>`;
  }else{
    const list=dayTasks(selected);
    $('calendar').innerHTML=`<div class="agenda-strip">${days.map(date=>`<button data-day="${dayKey(date)}" class="${dayKey(date)===selected?'selected':''}" aria-label="${dateLabel(date,{dateStyle:'full'})}">${dateLabel(date,{weekday:'short'})}<strong>${date.getDate()}</strong></button>`).join('')}</div><div class="agenda-list" data-drop="${selected}">${list.length?list.map(t=>`<div class="agenda-row"><time>${esc(timeLabel(t.time))}</time>${card(t)}</div>`).join(''):'<div class="empty"><strong>A little breathing room.</strong>No tasks planned for this day.</div>'}<button class="queue-add" data-add="${selected}">+ Plan a task for this day</button></div>`;
  }
}
function render(){
  const pending=tasks.filter(t=>t.status==='review');
  $('planned-total').textContent=tasks.filter(t=>t.date).length;
  $('agent-total').textContent=tasks.filter(t=>t.owner!=='human').length;
  $('pending-total').textContent=pending.length;$('review-count').textContent=pending.length;$('done-total').textContent=tasks.filter(t=>t.status==='done').length;
  $('calendar-page').hidden=page!=='calendar';$('review-page').hidden=page!=='review';
  $('heading').textContent=page==='calendar'?'Keep good work moving.':'Ready for your review.';
  $('subtitle').textContent=page==='calendar'?'One calendar for your team, your agents, and what comes next.':'Review the outcome. Decide the next step.';
  $('page-label').textContent=page==='calendar'?'Calendar':'Needs review';
  document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  const queued=tasks.filter(t=>!t.date);$('queue-total').textContent=queued.length;$('unscheduled-count').textContent=queued.length;
  $('queue-list').innerHTML=queued.length?queued.map(t=>`<button class="queue-task" draggable="true" data-task="${esc(t.id)}"><span class="project-label"><i class="dot ${t.project==='engineering'?'violet':t.project==='content'?'green':'blue'}"></i>${projects[t.project]}</span><strong>${esc(t.title)}</strong><span class="task-owner"><span class="owner-mark">${t.owner==='human'?'◉':'⌘'}</span>${owners[t.owner]}</span></button>`).join(''):'<p class="empty">Everything has a place.</p>';
  $('review-list').innerHTML=pending.length?pending.map(t=>`<article class="review-card"><div class="review-content"><span class="eyebrow">${projects[t.project]} · ${owners[t.owner]}</span><h3>${esc(t.title)}</h3><p>${esc(t.result||'Open the task to inspect its instructions and add the result to review.')}</p></div><div class="review-actions"><button class="button" data-task="${esc(t.id)}">Open task</button><button class="button" data-return="${esc(t.id)}">Request changes</button><button class="button primary" data-approve="${esc(t.id)}">Approve</button></div></article>`).join(''):'<div class="empty"><strong>You’re all caught up.</strong>No tasks are waiting for review.</div>';
  renderCalendar();
}
function openTask(id=null,date=selected){
  editing=id;const t=tasks.find(t=>t.id===id)||{title:'',project:'launch',owner:'human',date,time:'09:00',status:'planned',notes:'',result:'',link:''};
  $('dialog-title').textContent=id?'Task details':'New task';$('dialog-eyebrow').textContent=id?'A LITTLE CONTEXT GOES A LONG WAY':'PLAN SOMETHING GOOD';
  for(const field of ['title','project','owner','date','time','status','notes','result','link'])$(`task-${field}`).value=t[field]||'';
  $('delete-task').hidden=!id;
  $('task-history').innerHTML=(t.history||[]).map(e=>`<div>${esc(dateLabel(new Date(e.at),{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}))} · ${esc(e.text)}</div>`).join('');
  $('task-dialog').showModal();$('task-title').focus();
}
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.task){openTask(b.dataset.task);return;}
  if(b.hasAttribute('data-add')){openTask(null,b.dataset.add);return;}
  if(b.dataset.day){selected=b.dataset.day;cursor=parseDay(selected);view='agenda';render();return;}
  if(b.dataset.view){view=b.dataset.view;render();return;}
  if(b.dataset.page){page=b.dataset.page;render();return;}
  if(b.dataset.approve||b.dataset.return){const id=b.dataset.approve||b.dataset.return;const approve=!!b.dataset.approve;change(approve?'Task approved and completed':'Changes requested',list=>list.map(t=>t.id===id?event({...t,status:approve?'done':'planned'},approve?'Approved in demo':'Changes requested in demo'):t));}
});
$('new-task').onclick=()=>openTask();$('add-idea').onclick=()=>openTask(null,'');
for(const id of ['close-dialog','cancel-dialog'])$(id).onclick=()=>$('task-dialog').close();
$('task-dialog').addEventListener('click',e=>{if(e.target===$('task-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('task-form').onsubmit=e=>{
  e.preventDefault();const title=$('task-title').value.trim();if(!title){$('task-title').setCustomValidity('Enter a task title.');$('task-title').reportValidity();return;}
  const link=$('task-link').value.trim();if(link&&!/^https?:\/\//i.test(link)){$('task-link').setCustomValidity('Use an http or https link.');$('task-link').reportValidity();return;}
  const old=tasks.find(t=>t.id===editing);const task={id:editing||crypto.randomUUID(),history:old?.history||[]};
  for(const field of ['title','project','owner','date','time','status','notes','result','link'])task[field]=$(`task-${field}`).value.trim();
  change(editing?'Task updated':'Task added',list=>editing?list.map(t=>t.id===editing?event(task,'Updated in demo'):t):[...list,event(task,'Created in demo')]);$('task-dialog').close();
};
for(const id of ['task-title','task-link'])$(id).oninput=()=>$(id).setCustomValidity('');
$('delete-task').onclick=()=>{change('Task deleted',list=>list.filter(t=>t.id!==editing));$('task-dialog').close();};
$('today').onclick=()=>{cursor=new Date(now);selected=dayKey(now);render();};
function move(direction){if(view==='month'){cursor=new Date(cursor.getFullYear(),cursor.getMonth()+direction,1,12);}else cursor=addDays(cursor,7*direction);selected=dayKey(cursor);render();}
$('previous').onclick=()=>move(-1);$('next').onclick=()=>move(1);
$('queue-toggle').onclick=()=>{const open=$('queue').classList.toggle('open');$('queue-toggle').setAttribute('aria-expanded',String(open));if(open)$('queue').scrollIntoView({behavior:'smooth',block:'nearest'});};
$('undo').onclick=()=>{if(!undoState)return;if(globalThis.relaySession){const previous=structuredClone(undoState);return change('Change undone',()=>previous);}tasks=undoState;undoState=null;persist();render();notify('Change undone',false);};
$('reset').onclick=()=>{if(confirm('Reset this browser’s demo tasks? You can undo this change.'))change('Demo reset',()=>seed());};
let dragged;
document.addEventListener('dragstart',e=>{const t=e.target.closest('[data-task]');if(t){dragged=t.dataset.task;e.dataTransfer.setData('text/plain',dragged);e.dataTransfer.effectAllowed='move';}});
document.addEventListener('dragover',e=>{const target=e.target.closest('[data-drop]');if(target&&dragged){e.preventDefault();target.classList.add('drop-target');}});
document.addEventListener('dragleave',e=>e.target.closest('[data-drop]')?.classList.remove('drop-target'));
document.addEventListener('drop',e=>{const target=e.target.closest('[data-drop]');if(target&&dragged){e.preventDefault();const id=dragged,date=target.dataset.drop;change('Task rescheduled',list=>reschedule(list,id,date).map(t=>t.id===id?event(t,`Rescheduled to ${date}`):t));}dragged=null;document.querySelectorAll('.drop-target').forEach(t=>t.classList.remove('drop-target'));});
document.addEventListener('dragend',()=>{dragged=null;document.querySelectorAll('.drop-target').forEach(t=>t.classList.remove('drop-target'));});
$('timezone').textContent=globalThis.relaySession?'Dates and times as entered · No automatic reminders':`${Intl.DateTimeFormat().resolvedOptions().timeZone} · Local time`;
render();
