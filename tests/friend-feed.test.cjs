'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {watchFriends}=require('../friend-feed.js');
function harness({valid=true,active=true,onData,interval=15000}={}){
  let ownerValid=valid,visible=active,next=0;
  const timers=new Map(),pending=[],data=[],statuses=[],delays=[];
  const watch=watchFriends({
    read(){return new Promise((resolve,reject)=>pending.push({resolve,reject}));},
    valid:()=>ownerValid,active:()=>visible,
    onData(value){data.push(value);onData?.(value);},onStatus:value=>statuses.push(value),interval,
    setTimer(fn,delay){const id=next++;timers.set(id,fn);delays.push(delay);return id;},
    clearTimer:id=>timers.delete(id)
  });
  return {watch,timers,pending,data,statuses,delays,
    setValid:value=>{ownerValid=value;},setActive:value=>{visible=value;},
    tick(){const [id,fn]=timers.entries().next().value;timers.delete(id);fn();}
  };
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('starts immediately and schedules the next read only after completion',async()=>{
  const h=harness();assert.equal(h.pending.length,1);assert.deepEqual(h.statuses,['loading']);assert.equal(h.timers.size,0);
  h.pending[0].resolve({version:1});await settle();
  assert.deepEqual(h.data,[{version:1}]);assert.deepEqual(h.statuses,['loading','current']);
  assert.equal(h.timers.size,1);assert.deepEqual(h.delays,[15000]);
  h.tick();assert.equal(h.pending.length,2);assert.equal(h.timers.size,0);
  h.pending[1].resolve({version:2});await settle();assert.equal(h.timers.size,1);assert.equal(h.data.length,2);h.watch.stop();
});
test('overlapping refresh calls share the current request',async()=>{
  const h=harness(),first=h.watch.refresh(),second=h.watch.refresh();
  assert.equal(first,second);assert.equal(h.pending.length,1);assert.equal(h.timers.size,0);
  h.pending[0].resolve('first');await first;
  assert.deepEqual(h.data,['first']);assert.equal(h.timers.size,1);h.watch.stop();
});
test('stop suppresses late results and status updates',async()=>{
  const h=harness(),request=h.watch.refresh();h.watch.stop();h.pending[0].resolve('private late result');await request;
  assert.deepEqual(h.data,[]);assert.deepEqual(h.statuses,['loading']);assert.equal(h.timers.size,0);
  await h.watch.refresh();assert.equal(h.pending.length,1);
});
test('stop clears a scheduled timer including timer id zero',async()=>{
  const h=harness();h.pending[0].resolve('loaded');await settle();assert(h.timers.has(0));h.watch.stop();assert.equal(h.timers.size,0);
});
test('owner validity loss suppresses late data and permanently stops this watcher',async()=>{
  const h=harness(),request=h.watch.refresh();h.setValid(false);h.pending[0].resolve('previous owner');await request;
  assert.deepEqual(h.data,[]);assert.deepEqual(h.statuses,['loading']);assert.equal(h.timers.size,0);
  h.setValid(true);await h.watch.refresh();assert.equal(h.pending.length,1);
});
test('an initially invalid owner performs no read or status emission',async()=>{
  const h=harness({valid:false});await h.watch.refresh();assert.equal(h.pending.length,0);assert.deepEqual(h.statuses,[]);assert.equal(h.timers.size,0);
});
test('inactive refresh pauses without reads or retry timers and can resume explicitly',async()=>{
  const h=harness({active:false});assert.deepEqual(h.statuses,['paused']);assert.equal(h.pending.length,0);assert.equal(h.timers.size,0);
  h.setActive(true);const request=h.watch.refresh();assert.equal(h.pending.length,1);
  h.pending[0].resolve('visible');await request;assert.equal(h.timers.size,1);
  h.setActive(false);await h.watch.refresh();assert.equal(h.timers.size,0);assert.equal(h.pending.length,1);assert.equal(h.statuses.at(-1),'paused');
  h.setActive(true);const next=h.watch.refresh();h.pending[1].resolve('resumed');await next;
  assert.deepEqual(h.data,['visible','resumed']);assert.equal(h.timers.size,1);h.watch.stop();
});
test('becoming inactive during a read suppresses its data and schedules no retry',async()=>{
  const h=harness(),request=h.watch.refresh();h.setActive(false);h.pending[0].resolve('hidden result');await request;
  assert.deepEqual(h.data,[]);assert.deepEqual(h.statuses,['loading','paused']);assert.equal(h.timers.size,0);
  h.setActive(true);const next=h.watch.refresh();h.pending[1].resolve('visible result');await next;
  assert.deepEqual(h.data,['visible result']);h.watch.stop();
});
test('an inactive timer callback pauses until the caller explicitly resumes',async()=>{
  const h=harness();h.pending[0].resolve('visible');await settle();h.setActive(false);h.tick();await settle();
  assert.equal(h.pending.length,1);assert.equal(h.timers.size,0);assert.equal(h.statuses.at(-1),'paused');h.watch.stop();
});
test('initial errors remain explicit and retry only after completion',async()=>{
  const h=harness({interval:37});h.pending[0].reject(new Error('not available'));await settle();
  assert.deepEqual(h.data,[]);assert.deepEqual(h.statuses,['loading','error']);assert.deepEqual(h.delays,[37]);
  const request=h.watch.refresh();assert.equal(h.timers.size,0);h.pending[1].resolve('recovered');await request;
  assert.deepEqual(h.data,['recovered']);assert.equal(h.statuses.at(-1),'current');h.watch.stop();
});
test('a failed refresh reports stale without replacing the existing UI data',async()=>{
  const h=harness();h.pending[0].resolve({owner:'first'});await settle();
  const request=h.watch.refresh();h.pending[1].reject(new Error('temporary failure'));await request;
  assert.deepEqual(h.data,[{owner:'first'}]);assert.deepEqual(h.statuses,['loading','current','stale']);assert.equal(h.timers.size,1);h.watch.stop();
});
test('an initial auth failure reports auth-required then stops all future refreshes',async()=>{
  const h=harness();h.pending[0].reject(Object.assign(new Error('expired'),{code:'AUTH_REQUIRED'}));await settle();
  assert.deepEqual(h.statuses,['loading','auth-required']);assert.deepEqual(h.data,[]);assert.equal(h.timers.size,0);
  await h.watch.refresh();assert.equal(h.pending.length,1);
});
test('an auth failure after success never replaces data or schedules another request',async()=>{
  const h=harness();h.pending[0].resolve('current owner');await settle();
  const request=h.watch.refresh();h.pending[1].reject({code:'AUTH_REQUIRED'});await request;
  assert.deepEqual(h.data,['current owner']);assert.equal(h.statuses.at(-1),'auth-required');assert.equal(h.timers.size,0);
});
test('stop also suppresses a late rejection',async()=>{
  const h=harness(),request=h.watch.refresh();h.watch.stop();h.pending[0].reject(new Error('late failure'));await request;
  assert.deepEqual(h.statuses,['loading']);assert.equal(h.timers.size,0);
});
