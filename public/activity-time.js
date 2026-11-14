export function taskTimeLabel(task){
 if(task.activity?.completedAt){return 'Finished '+new Intl.DateTimeFormat('en-US',{timeZone:task.activity.timeZone,hour:'numeric',minute:'2-digit'}).format(new Date(task.activity.completedAt));}
 if(task.time)return new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit'}).format(new Date(`2000-01-01T${task.time}`));
 return task.status==='done'?'Time not recorded':'No time set';
}
