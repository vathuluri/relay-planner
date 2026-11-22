import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hourOfTask,hourlyRows,hourLabel} from '../public/hourly.js';

test('hour buckets use recorded timezone and distinguish midnight from missing time',()=>{
 const date='2026-11-21';
 const tasks=[{id:'missing',date,time:''},{id:'midnight',date,time:'00:00'},{id:'planned',date,time:'09:30'},{id:'late',date,time:'09:45'},{id:'receipt',date,time:'23:00',activity:{completedAt:'2026-11-21T14:05:00Z',timeZone:'America/New_York'}},{id:'other',date:'2026-11-22',time:'09:00'}];
 const {cells,untimed}=hourlyRows(tasks,[date]);
 assert.deepEqual(untimed[0].map(t=>t.id),['missing']);
 assert.deepEqual(cells[0][0].map(t=>t.id),['midnight']);
 assert.deepEqual(cells[9][0].map(t=>t.id),['receipt','planned','late']);
 assert.equal(cells.length,24);assert.equal(hourOfTask({time:'25:00'}),null);
 assert.equal(hourLabel(0),'12 AM');assert.equal(hourLabel(12),'12 PM');
 assert.deepEqual(tasks.map(t=>t.id),['missing','midnight','planned','late','receipt','other']);
});

test('DST repeated finish hours remain distinct events and do not invent duration',()=>{
 const tasks=['2026-11-01T05:30:00Z','2026-11-01T06:30:00Z'].map((completedAt,i)=>({id:String(i),title:'Synthetic report '+i,date:'2026-11-01',activity:{completedAt,timeZone:'America/New_York'}}));
 const {cells}=hourlyRows(tasks,['2026-11-01']);assert.equal(cells[1][0].length,2);
 assert.equal(tasks.some(t=>'duration' in t),false);
});
