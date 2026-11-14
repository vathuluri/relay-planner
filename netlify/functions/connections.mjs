import {getUser} from '@netlify/identity';import {getStore} from '@netlify/blobs';import {createConnectionHandler} from '../../server/activity.mjs';
const handler=createConnectionHandler({getUser,getStore:()=>getStore({name:'relay-schedules',consistency:'strong'})});
export default async function(req){
 if(req.method==='POST')return Response.json({error:'Agent connections are paused until end-to-end encryption is available.'},{status:503,headers:{'Cache-Control':'no-store'}});
 return handler(req);
}
