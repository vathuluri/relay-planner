import {test} from 'node:test';
import assert from 'node:assert/strict';
import {showSyncWarning} from '../public/sync-health.js';
test('sync warnings distinguish failed refresh, retry backlog and stale delivery, and clear on recovery',()=>{
 const element={hidden:true,textContent:''};const now=Date.parse('2026-11-26T14:00:00Z');
 showSyncWarning(element,{}, {failed:true,now});assert.equal(element.hidden,false);assert.match(element.textContent,/last loaded/);
 showSyncWarning(element,{retrying:true},{now});assert.match(element.textContent,/waiting for retry/);
 showSyncWarning(element,{lastAcceptedAt:'2026-11-25T11:00:00Z'},{now});assert.match(element.textContent,/24 hours/);
 showSyncWarning(element,{lastAcceptedAt:'2026-11-26T13:59:00Z'},{now});assert.equal(element.hidden,true);assert.equal(element.textContent,'');
 showSyncWarning(element,{}, {now});assert.equal(element.hidden,true);
});
