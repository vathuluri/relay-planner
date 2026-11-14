import {test} from 'node:test';import assert from 'node:assert/strict';import {createAuthenticatedFetch} from '../public/auth-fetch.js';
test('account requests renew the session before sending a mutation and never retry a mutation silently',async()=>{
 const order=[];let calls=0;const request=createAuthenticatedFetch(async()=>order.push('refresh'),async(url,o)=>{order.push('fetch');calls++;assert.equal(o.credentials,'same-origin');assert.equal(o.cache,'no-store');assert.equal(o.method,'PUT');return new Response(null,{status:401});});
 assert.equal((await request('/api',{method:'PUT',body:'encrypted'})).status,401);assert.deepEqual(order,['refresh','fetch']);assert.equal(calls,1);
});
