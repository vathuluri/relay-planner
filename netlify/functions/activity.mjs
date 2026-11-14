// Do not accept readable activity while client-side encryption is pending.
export default async function(){return Response.json({error:'Agent reporting is paused until end-to-end encryption is available.'},{status:503,headers:{'Cache-Control':'no-store'}});}
