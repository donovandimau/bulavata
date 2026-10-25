'use strict';
const {createHmac}=require('node:crypto');
const SOTA_URL='https://aqfzpaczyodhugsgqvxi.supabase.co';
const SOTA_KEY='sb_publishable_DvpX2PSuPtxE3IqWUlRZfQ_YP2qLZtF';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STUN={urls:['stun:stun.cloudflare.com:3478']};

function relayConfig(env,call,user,now=Date.now()){
  const urls=String(env.CALLS_TURN_URLS||'').split(',').map(v=>v.trim()).filter(Boolean);
  const secret=String(env.CALLS_TURN_SECRET||'');
  if(!urls.length&&!secret)return {iceServers:[STUN],relayConfigured:false,expiresAt:null,maxParticipants:6};
  // Reject partial configuration rather than returning unusable credentials.
  if(!urls.length||urls.some(v=>!/^turns?:[a-z0-9.[\]:-]+(?:\?transport=(?:udp|tcp))?$/i.test(v))||Buffer.byteLength(secret)<32||/[\r\n]/.test(secret))throw Error('relay_config');
  const requested=Number(env.CALLS_TURN_TTL_SECONDS||900);
  const ttl=Number.isFinite(requested)?Math.max(60,Math.min(3600,Math.floor(requested))):900;
  const expiry=Math.floor(now/1000)+ttl;
  const username=`${expiry}:${call}:${user}`;
  const credential=createHmac('sha1',secret).update(username).digest('base64');
  return {iceServers:[STUN,{urls,username,credential}],relayConfigured:true,expiresAt:new Date(expiry*1000).toISOString(),maxParticipants:6};
}

async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store, max-age=0');
  res.setHeader('Pragma','no-cache');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Use GET.'});}
  const call=typeof req.query?.call==='string'?req.query.call.toLowerCase():'';
  const auth=req.headers?.authorization;
  if(!UUID.test(call))return res.status(400).json({error:'A valid call is required.'});
  if(typeof auth!=='string'||!/^Bearer [A-Za-z0-9_.-]{20,8192}$/.test(auth))return res.status(401).json({error:'Sign in to join this call.'});
  try{
    const headers={apikey:SOTA_KEY,Authorization:auth,'Content-Type':'application/json'};
    const who=await fetch(`${SOTA_URL}/auth/v1/user`,{headers,signal:AbortSignal.timeout(5000)});
    if(!who.ok)return res.status(401).json({error:'Sign in again to join this call.'});
    const user=await who.json();
    if(!UUID.test(user.id||''))return res.status(401).json({error:'Sign in again to join this call.'});
    const snapshot=await fetch(`${SOTA_URL}/rest/v1/rpc/bv_call_snapshot`,{
      method:'POST',headers,body:JSON.stringify({p_call:call}),signal:AbortSignal.timeout(5000)
    });
    if(!snapshot.ok)return res.status(403).json({error:'This call is unavailable to your account.'});
    const state=await snapshot.json();
    if(state?.call?.id!==call||!['ringing','active'].includes(state?.call?.status)||
      !Array.isArray(state?.participants)||!state.participants.some(p=>p.member===user.id&&p.state==='joined'))
      return res.status(403).json({error:'Join this call before requesting media configuration.'});
    return res.status(200).json(relayConfig(process.env,call,user.id));
  }catch(err){
    if(err?.message==='relay_config')return res.status(503).json({error:'The call relay needs configuration.'});
    return res.status(503).json({error:'Call configuration is temporarily unavailable.'});
  }
}
module.exports=handler;
module.exports.relayConfig=relayConfig;
