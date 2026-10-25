'use strict';
// Media settings for link-based direct calls (call.html). No account is
// involved, so relay credentials are short-lived and only issued for a
// well-formed room ID. Falls back to direct connection if no relay is set.
const {cloudflareRelay}=require('./call-config.js');
const ROOM=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const STUN={iceServers:[{urls:['stun:stun.cloudflare.com:3478']}],relayConfigured:false,expiresAt:null,maxParticipants:6};
async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Use GET.'});}
  const room=typeof req.query?.room==='string'?req.query.room.toLowerCase():'';
  if(!ROOM.test(room))return res.status(400).json({error:'A valid call link is required.'});
  try{
    const relay=await cloudflareRelay({...process.env,CALLS_TURN_TTL_SECONDS:String(Math.min(900,Number(process.env.CALLS_TURN_TTL_SECONDS||900)||900))});
    return res.status(200).json(relay||STUN);
  }catch(_){return res.status(200).json(STUN);}
}
module.exports=handler;
