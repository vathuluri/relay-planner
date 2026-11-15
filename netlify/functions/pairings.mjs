import {getUser} from '@netlify/identity';
import {getStore} from '@netlify/blobs';
import {createPairingHandler} from '../../server/pairings.mjs';
export default createPairingHandler({getUser,getStore:()=>getStore({name:'relay-schedules',consistency:'strong'})});
