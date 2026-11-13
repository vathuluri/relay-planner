import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dayKey,parseDay,addDays,weekStart,monthDays,reschedule} from '../public/calendar.js';
test('calendar date keys preserve local dates across year boundaries',()=>{assert.equal(dayKey(addDays(parseDay('2026-12-31'),1)),'2027-01-01');assert.equal(dayKey(weekStart(parseDay('2027-01-03'))),'2026-12-28');});
test('month calendar includes leading and trailing days without skipping a date',()=>{const dates=monthDays(parseDay('2026-11-13'));assert.equal(dates.length,42);assert.equal(dayKey(dates[0]),'2026-10-26');assert.equal(dayKey(dates[41]),'2026-12-06');assert.equal(new Set(dates.map(dayKey)).size,42);});
test('rescheduling changes only the target date and preserves execution state',()=>{const tasks=[{id:'a',date:'',time:'09:00',status:'review'},{id:'b',date:'2026-11-13'}];const next=reschedule(tasks,'a','2026-11-16');assert.equal(next[0].date,'2026-11-16');assert.equal(next[0].status,'review');assert.equal(next[0].time,'09:00');assert.equal(tasks[0].date,'');assert.equal(next[1],tasks[1]);});
