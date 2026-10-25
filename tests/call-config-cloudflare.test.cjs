'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const handler=require('../api/call-config.js');
const call='61025000-0000-4000-8000-000000000091';
const user='61025000-0000-4000-8000-000000000001';
const env={CF_TURN_KEY_ID:'0123456789abcdef0123456789abcdef',CF_TURN_API_TOKEN:'tok_'+'y'.repeat(40)};
const sample={iceServers:[{urls:['stun:stun.cloudflare.com:3478','stun:stun.cloudflare.com:53']},{urls:['turn:turn.cloudflare.com:3478?transport=udp','turn:turn.cloudflare.com:53?transport=udp','turns:turn.cloudflare.com:443?transport=tcp','https://evil.example'],username:'u1',credential:'c1'}]};
const ok=body=>async(url,o)=>{ok.last={url,o};return {ok:true,status:201,json:async()=>body};};

test('No Cloudflare settings returns null so the next option is used',async()=>{
 assert.equal(await handler.cloudflareRelay({},1000,ok(sample)),null);
});
test('Cloudflare relay asks for a bounded TTL, keeps the token server-side, drops port 53 and bad URLs',async()=>{
 const f=ok(sample);const cfg=await handler.cloudflareRelay({...env,CALLS_TURN_TTL_SECONDS:'999999'},1000000,f);
 assert.match(ok.last.url,/^https:\/\/rtc\.live\.cloudflare\.com\/v1\/turn\/keys\/0123456789abcdef0123456789abcdef\/credentials\/generate-ice-servers$/);
 assert.equal(ok.last.o.method,'POST');assert.equal(JSON.parse(ok.last.o.body).ttl,3600);
 assert.equal(cfg.relayConfigured,true);assert.equal(cfg.expiresAt,new Date(1000000+3600000).toISOString());
 const urls=cfg.iceServers.flatMap(s=>s.urls);
 assert(!urls.some(u=>/:53\b/.test(u)));assert(!urls.some(u=>u.startsWith('https')));
 assert(urls.includes('turns:turn.cloudflare.com:443?transport=tcp'));
 assert(!JSON.stringify(cfg).includes(env.CF_TURN_API_TOKEN));
});
test('Malformed or relay-less Cloudflare answers are refused',async()=>{
 await assert.rejects(handler.cloudflareRelay({CF_TURN_KEY_ID:'bad id',CF_TURN_API_TOKEN:'x'.repeat(30)},1,ok(sample)));
 await assert.rejects(handler.cloudflareRelay(env,1,ok({iceServers:[{urls:['stun:stun.cloudflare.com:3478']}]})));
 await assert.rejects(handler.cloudflareRelay(env,1,async()=>({ok:false,status:500})));
});
test('A Cloudflare outage never blocks the call: falls back to direct connection',async()=>{
 const cfg=await handler.mediaConfig(env,call,user,1000,async()=>({ok:false,status:503}));
 assert.equal(cfg.relayConfigured,false);assert.equal(cfg.iceServers.length,1);
});
test('Cloudflare is preferred over a self-hosted relay when both are set',async()=>{
 const cfg=await handler.mediaConfig({...env,CALLS_TURN_URLS:'turn:relay.example:3478',CALLS_TURN_SECRET:'x'.repeat(40)},call,user,1000,ok(sample));
 assert(cfg.iceServers.some(s=>s.username==='u1'));
});
