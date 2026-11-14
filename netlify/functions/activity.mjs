import {getStore} from '@netlify/blobs';import {createActivityHandler} from '../../server/activity.mjs';
export default createActivityHandler({getStore:()=>getStore({name:'relay-schedules',consistency:'strong'})});
