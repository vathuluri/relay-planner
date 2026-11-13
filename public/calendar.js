export const dayKey=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export const parseDay=value=>{const [y,m,d]=value.split('-').map(Number);return new Date(y,m-1,d,12);};
export const addDays=(date,n)=>{const next=new Date(date);next.setDate(next.getDate()+n);return next;};
export const weekStart=date=>addDays(date,-((date.getDay()+6)%7));
export const monthDays=date=>{const first=new Date(date.getFullYear(),date.getMonth(),1,12);const start=weekStart(first);return Array.from({length:42},(_,i)=>addDays(start,i));};
export const sortTasks=tasks=>[...tasks].sort((a,b)=>(a.time||'00:00').localeCompare(b.time||'00:00')||a.title.localeCompare(b.title));
export function reschedule(tasks,id,date){return tasks.map(task=>task.id===id?{...task,date}:task);}
