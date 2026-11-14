import {getUser} from '@netlify/identity';import {getStore} from '@netlify/blobs';import {createConnectionHandler} from '../../server/activity.mjs';
export default createConnectionHandler({getUser,getStore:()=>getStore({name:'relay-schedules',consistency:'strong'})});
