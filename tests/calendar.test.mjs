import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dayKey,parseDay,addDays,weekStart,monthDays,reschedule,sortTasks} from '../public/calendar.js';

test('activity cards sort by displayed completion time in the account timezone',()=>{
 const activity=(id,title,completedAt)=>({id,title,date:'2026-11-18',time:'',activity:{completedAt,timeZone:'America/New_York'}});
 const tasks=[activity('late','B response','2026-11-19T02:40:00Z'),activity('early','A connection','2026-11-19T01:30:00Z'),activity('middle','Z check','2026-11-19T01:37:00Z'),{id:'planned',title:'Planned work',time:'20:35'}];
 assert.deepEqual(sortTasks(tasks).map(t=>t.id),['early','planned','middle','late']);assert.equal(tasks[0].id,'late');
});
test('calendar date keys preserve local dates across year boundaries',()=>{assert.equal(dayKey(addDays(parseDay('2026-12-31'),1)),'2027-01-01');assert.equal(dayKey(weekStart(parseDay('2027-01-03'))),'2026-12-28');});
test('month calendar includes leading and trailing days without skipping a date',()=>{const dates=monthDays(parseDay('2026-11-13'));assert.equal(dates.length,42);assert.equal(dayKey(dates[0]),'2026-10-26');assert.equal(dayKey(dates[41]),'2026-12-06');assert.equal(new Set(dates.map(dayKey)).size,42);});
test('rescheduling changes only the target date and preserves execution state',()=>{const tasks=[{id:'a',date:'',time:'09:00',status:'review'},{id:'b',date:'2026-11-13'}];const next=reschedule(tasks,'a','2026-11-16');assert.equal(next[0].date,'2026-11-16');assert.equal(next[0].status,'review');assert.equal(next[0].time,'09:00');assert.equal(tasks[0].date,'');assert.equal(next[1],tasks[1]);});
