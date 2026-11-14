import {refreshSession} from '@netlify/identity';
// Refresh through the Identity SDK, never by exposing credentials to callers.
export function createAuthenticatedFetch(refresh=refreshSession,fetcher=fetch){return async(url,options={})=>{
 await refresh();
 return fetcher(url,{...options,credentials:'same-origin',cache:'no-store'});
};}
export const authenticatedFetch=createAuthenticatedFetch();
