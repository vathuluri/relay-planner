import {taskSortMinutes} from './activity-time.js';

export function hourOfTask(task){
  if(!task.activity?.completedAt&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(task.time||''))return null;
  const minutes=taskSortMinutes(task);
  return Number.isFinite(minutes)&&minutes>=0&&minutes<1440?Math.floor(minutes/60):null;
}

export function hourlyRows(tasks,dates){
  const cells=Array.from({length:24},()=>dates.map(()=>[])),untimed=dates.map(()=>[]);
  for(const task of tasks){
    const column=dates.indexOf(task.date);if(column<0)continue;
    const hour=hourOfTask(task);
    (hour===null?untimed[column]:cells[hour][column]).push(task);
  }
  for(const row of [...cells,untimed])for(const list of row)list.sort((a,b)=>taskSortMinutes(a)-taskSortMinutes(b)||a.title.localeCompare(b.title));
  return {cells,untimed};
}

export const hourLabel=hour=>`${hour%12||12} ${hour<12?'AM':'PM'}`;
