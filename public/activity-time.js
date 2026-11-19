export function taskTimeLabel(task){
 if(task.activity?.completedAt){return 'Finished '+new Intl.DateTimeFormat('en-US',{timeZone:task.activity.timeZone,hour:'numeric',minute:'2-digit'}).format(new Date(task.activity.completedAt));}
 if(task.time)return new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit'}).format(new Date(`2000-01-01T${task.time}`));
 return task.status==='done'?'Time not recorded':'No time set';
}

export function taskSortMinutes(task){
 if(task.activity?.completedAt){
  const date=new Date(task.activity.completedAt);
  if(Number.isFinite(date.getTime())){
   const parts=new Intl.DateTimeFormat('en-US',{timeZone:task.activity.timeZone,hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date);
   const value=type=>Number(parts.find(part=>part.type===type).value);
   return value('hour')*60+value('minute')+value('second')/60+date.getMilliseconds()/60000;
  }
 }
 const [hour,minute]=(task.time||'00:00').split(':').map(Number);
 return hour*60+minute;
}
