import {getUser} from '@netlify/identity';
import {getStore} from '@netlify/blobs';
import {createScheduleHandler} from '../../server/schedules.mjs';
export default createScheduleHandler({getUser,getStore:()=>getStore({name:'relay-schedules',consistency:'strong'})});
