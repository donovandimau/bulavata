'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createHmac}=require('node:crypto');
const handler=require('../api/call-config.js');
const call='61025000-0000-4000-8000-000000000091';
const user='61025000-0000-4000-8000-000000000001';
const request=(overrides={})=>({method:'GET',query:{call},headers:{authorization:'Bearer test_token_is_long_enough_12345'},...overrides});
const response=()=>({headers:{},code:null,body:null,setHeader(k,v){this.headers[k]=v},status(code){this.code=code;return this},json(body){this.body=body;return this}});
test('No relay secret returns explicit STUN-only capability',()=>{
 const cfg=handler.relayConfig({},call,user,1000000);assert.equal(cfg.relayConfigured,false);assert.equal(cfg.iceServers.length,1);assert.equal(cfg.expiresAt,null);
});
test('Coturn REST credentials have bounded TTL and correct HMAC, without exposing secret',()=>{
 const secret='x'.repeat(40),cfg=handler.relayConfig({CALLS_TURN_URLS:'turn:relay.example:3478?transport=udp,turns:relay.example:5349?transport=tcp',CALLS_TURN_SECRET:secret,CALLS_TURN_TTL_SECONDS:'999999'},call,user,1000000);
 assert.equal(cfg.relayConfigured,true);assert.equal(cfg.iceServers[1].username,`4600:${call}:${user}`);
 assert.equal(cfg.iceServers[1].credential,createHmac('sha1',secret).update(cfg.iceServers[1].username).digest('base64'));
 assert(!JSON.stringify(cfg).includes(secret));
});
test('Partial and malformed relay settings fail closed',()=>{
 assert.throws(()=>handler.relayConfig({CALLS_TURN_SECRET:'x'.repeat(40)},call,user));
 assert.throws(()=>handler.relayConfig({CALLS_TURN_SECRET:'short',CALLS_TURN_URLS:'turn:relay.example:3478'},call,user));
 assert.throws(()=>handler.relayConfig({CALLS_TURN_SECRET:'x'.repeat(40),CALLS_TURN_URLS:'https://attacker.example'},call,user));
});
test('Method, call ID and bearer checks run before network',async()=>{
 for(const [req,code]of[[request({method:'POST'}),405],[request({query:{call:'bad'}}),400],[request({headers:{}}),401]]){const res=response();await handler(req,res);assert.equal(res.code,code);assert.match(res.headers['Cache-Control'],/no-store/);}
});
test('Media config requires actual joined membership from caller-scoped RPC',async()=>{
 const old=global.fetch;
 try{
  for(const state of['waiting','kicked','left']){
   let calls=0;global.fetch=async()=>({ok:true,json:async()=>++calls===1?{id:user}:{call:{id:call,status:'active'},participants:[{member:user,state}]}});
   const res=response();await handler(request(),res);assert.equal(res.code,403);
  }
  let calls=0;global.fetch=async(url,options)=>{assert.equal(options.headers.Authorization,request().headers.authorization);return{ok:true,json:async()=>++calls===1?{id:user}:{call:{id:call,status:'active'},participants:[{member:user,state:'joined'}]}}};
  const res=response();await handler(request(),res);assert.equal(res.code,200);assert.equal(res.body.maxParticipants,6);
 }finally{global.fetch=old;}
});
test('Rejected auth and failed membership never mint relay credentials',async()=>{
 const old=global.fetch;try{
  global.fetch=async()=>({ok:false});const res=response();await handler(request(),res);assert.equal(res.code,401);
  let calls=0;global.fetch=async()=>++calls===1?{ok:true,json:async()=>({id:user})}:{ok:false};const denied=response();await handler(request(),denied);assert.equal(denied.code,403);
 }finally{global.fetch=old;}
});
