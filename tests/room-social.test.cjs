'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const canonical=path.join(__dirname,'../room-social.js');
const sourcePath=fs.existsSync(canonical)?canonical:path.join(__dirname,'stage/room-social.js');
const feedPath=path.join(path.dirname(sourcePath),'friend-feed.js');
const api=require(sourcePath);
let JSDOM;try{({JSDOM}=require(process.env.JSDOM_MODULE||'jsdom'));}catch(_){}
const owner='61026000-0000-4000-8000-000000000001',other='61026000-0000-4000-8000-000000000002';
const makeState=()=>({user:{id:owner},me:{id:owner,handle:'own_room'},roomHandle:'someone_else'});
const makeRoom=()=>({found:true,visible:true,is_me:true,profile:{id:owner,handle:'own_room'},top:[],wall:[]});
const friend=(handle,extra={})=>({id:'person-'+handle,handle,display_name:'TEST '+handle,avatar_emoji:'🌺',...extra});
const defer=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const flush=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};
function clientFixture(state=makeState()){
  const calls=[];let authOwner=owner,authCalls=0;
  const fixture={state,room:makeRoom(),friends:[friend('alpha')],calls,authHook:null,rpcHook:null};
  fixture.client={auth:{getUser:async()=>{authCalls++;const special=fixture.authHook?.(authCalls);return special===undefined?{data:{user:{id:authOwner}},error:null}:special;}},rpc:async(name,args)=>{calls.push({name,args});const special=fixture.rpcHook?.(name,args);return special===undefined?{data:name==='bv_room'?fixture.room:fixture.friends,error:null}:special;},from(){throw new Error('A social display must not read or write raw tables.');}};
  Object.defineProperties(fixture,{authOwner:{get:()=>authOwner,set:value=>{authOwner=value;}},authCalls:{get:()=>authCalls}});
  return fixture;
}

test('model fills from accepted friends, ranks accepted pins first and never auto-pins',()=>{
  const room=makeRoom(),friends=Array.from({length:20},(_,i)=>friend('mate_'+String(i).padStart(2,'0')));
  room.top=[{slot:1,handle:'not_accepted'},{slot:4,handle:'mate_19'},{slot:2,handle:'mate_18'},{slot:3,handle:'mate_18'}];
  const original=JSON.stringify({room,friends});const result=api.model(room,[...friends,friend('pending',{status:'pending'}),friend('own_room',{id:owner}),friend('<script>'),friend('mate_00')],owner);
  assert.equal(result.friendCount,20);assert.equal(result.mates.length,16);
  assert.deepEqual(result.mates.slice(0,4).map(f=>f.handle),['mate_18','mate_19','mate_00','mate_01']);
  assert(!result.mates.some(f=>['not_accepted','pending','own_room'].includes(f.handle)));
  assert.equal(JSON.stringify({room,friends}),original,'presentation does not mutate rankings or friend records');
});

test('model deduplicates identities and handles deterministically and emits only safe display fields',()=>{
  const room=makeRoom(),friends=[friend('zulu',{id:'same',email:'private@example.invalid'}),friend('alpha',{id:'same'}),friend('beta',{id:undefined}),friend('beta',{id:undefined}),friend('BAD'),friend('aa')];
  const a=api.model(room,friends),b=api.model(room,[...friends].reverse());
  assert.deepEqual(a,b);assert.deepEqual(a.friends.map(f=>f.handle),['alpha','beta']);
  assert.deepEqual(Object.keys(a.friends[0]).sort(),['avatar_emoji','display_name','handle']);
  assert(!JSON.stringify(a).includes('private@example.invalid'));
});

test('model uses the latest two real wall notes and excerpts a meme without loading its URL',()=>{
  const room=makeRoom();room.wall=[{handle:'older',body:'old note',created_at:'2026-01-01'},{handle:'newest',body:'[sota-meme]'+JSON.stringify({note:'actual meme note',url:'https://private.example.invalid/image.jpg'}),created_at:'2026-10-26T10:00:00Z'},{handle:'second',body:'<img src=x onerror=alert(1)>',created_at:'2026-10-25'},{handle:'<bad>',body:'invalid author',created_at:'2027-01-01'}];
  const result=api.model(room,[]);assert.deepEqual(result.notes.map(n=>n.handle),['newest','second']);assert.equal(result.notes[0].body,'actual meme note');assert(!JSON.stringify(result).includes('private.example.invalid'));
  assert.equal(result.notes[1].body,'<img src=x onerror=alert(1)>','the DOM layer must render actual text safely');
  assert.deepEqual(api.model(makeRoom(),[]).notes,[],'empty walls do not invent conversation');
});

test('load reads only own room and accepted friends through existing RPCs',async()=>{
  const f=clientFixture();const result=await api.load(f.client,f.state);
  assert.deepEqual(f.calls,[{name:'bv_room',args:{p_handle:'own_room'}},{name:'bv_my_friends',args:undefined}]);
  assert.equal(f.authCalls,2,'session owner is checked before and after the RPCs');assert.equal(result.friendCount,1);assert(result.updated instanceof Date);
});

test('load rejects guest, incomplete profile, owner mismatch and invalid handle before any private read',async()=>{
  for(const state of [{user:null,me:null},{user:{id:owner},me:null},{user:{id:owner},me:{id:other,handle:'own_room'}},{user:{id:owner},me:{id:owner,handle:'<script>'}}]){
    const f=clientFixture(state);await assert.rejects(api.load(f.client,state),{code:'AUTH_REQUIRED'});assert.equal(f.authCalls,0);assert.deepEqual(f.calls,[]);
  }
});

test('load refuses hidden, foreign, missing or non-owner room responses',async()=>{
  for(const patch of [{found:false},{visible:false},{is_me:false},{profile:{id:other,handle:'own_room'}},{profile:{id:owner,handle:'other_room'}}]){
    const f=clientFixture();f.room={...makeRoom(),...patch};await assert.rejects(api.load(f.client,f.state),{code:'AUTH_REQUIRED'});
  }
});

test('load checks captured state after auth and rejects changes before querying',async()=>{
  const f=clientFixture(),pending=defer();f.authHook=()=>pending.promise;
  const result=api.load(f.client,f.state);f.state.user={id:other};f.state.me={id:other,handle:'other_room'};pending.resolve({data:{user:{id:owner}},error:null});
  await assert.rejects(result,{code:'AUTH_REQUIRED'});assert.deepEqual(f.calls,[]);
});

test('load checks the actual authenticated owner after reads even if app state has not caught up',async()=>{
  const f=clientFixture();f.authHook=count=>({data:{user:{id:count===1?owner:other}},error:null});
  await assert.rejects(api.load(f.client,f.state),{code:'AUTH_REQUIRED'});assert.equal(f.authCalls,2);
});

test('load treats connection failures as retryable failures and rejects malformed friend payloads',async()=>{
  const f=clientFixture();f.authHook=()=>({data:{user:null},error:{name:'AuthRetryableFetchError',status:503}});
  await assert.rejects(api.load(f.client,f.state),error=>!error.code);assert.deepEqual(f.calls,[]);
  f.authHook=null;f.friends={handle:'not-an-array'};await assert.rejects(api.load(f.client,f.state),error=>!error.code);
  for(const patch of [{wall:null},{wall:undefined},{top:{}},{top:undefined}]){const bad=clientFixture();bad.room={...makeRoom(),...patch};await assert.rejects(api.load(bad.client,bad.state),error=>!error.code);}
});

const domTest=(name,fn)=>test(name,{skip:!JSDOM?'Install jsdom or set JSDOM_MODULE to run DOM lifecycle coverage':false},fn);
function harness({guest=false,incomplete=false,hero=false,hosts=1}={}){
  const dom=new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>',{url:'https://sotakece.com/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,app=w.document.querySelector('#app');
  const f=clientFixture(guest?{user:null,me:null}:incomplete?{user:{id:owner},me:null}:makeState());
  const timers=new Map(),subscribers=new Set(),authActions=[],goActions=[];let timerId=0,online=true,hidden=false,unsubscribed=0;
  w.setTimeout=(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id;};w.clearTimeout=id=>timers.delete(id);
  Object.defineProperty(w.navigator,'onLine',{get:()=>online});Object.defineProperty(w.document,'hidden',{get:()=>hidden});
  f.client.auth.onAuthStateChange=callback=>{subscribers.add(callback);return{data:{subscription:{unsubscribe(){if(subscribers.delete(callback))unsubscribed++;}}}};};
  w.eval(fs.readFileSync(feedPath,'utf8'));w.eval(fs.readFileSync(sourcePath,'utf8'));const social=w.SotaRoomSocial;
  social.init({client:f.client,state:f.state,app,auth:(...args)=>authActions.push(args),go:tab=>goActions.push(tab)});
  app.innerHTML=Array.from({length:hosts},()=>social.markup({hero})).join('');
  Object.defineProperty(f,'unsubscribed',{get:()=>unsubscribed});
  return Object.assign(f,{dom,w,app,social,timers,authActions,goActions,mount:()=>social.mount(app),
    authEvent(event,next){for(const callback of [...subscribers])callback(event,next?{user:{id:next}}:null);},
    online(value){online=value;w.dispatchEvent(new w.Event(value?'online':'offline'));},
    hidden(value){hidden=value;w.document.dispatchEvent(new w.Event('visibilitychange'));},
    async tick(){const entry=[...timers.entries()][0];assert(entry,'an active feed schedules a refresh');timers.delete(entry[0]);assert.equal(entry[1].ms,15000);entry[1].fn();await flush();},
    close(){social.stop();dom.window.close();}
  });
}

domTest('guest hero has neutral descriptions without repeated sign-in prompts or private queries',async()=>{
  const h=harness({guest:true,hero:true});try{assert.doesNotMatch(h.app.textContent,/Sign in/,'Initial markup has no duplicate sign-in calls');h.mount();await flush();assert.equal(h.calls.length,0);assert.equal(h.authCalls,0);assert.equal(h.app.querySelectorAll('.sota-social-panel').length,2);assert.equal(h.app.querySelectorAll('img').length,0);assert.equal(h.app.querySelectorAll('.sota-social-footer').length,0);assert.match(h.app.textContent,/Your conversations, together\./);assert.match(h.app.textContent,/Your closest connections\./);assert([...h.app.querySelectorAll('.sota-social-action')].every(action=>action.hidden&&action.textContent===''));assert.doesNotMatch(h.app.textContent,/Sign in|Donu|Sema|Jo|Example/);for(const button of h.app.querySelectorAll('.sota-social-panel'))button.click();assert.deepEqual(h.authActions,[['in',true],['in',true]]);}finally{h.close();}
});

domTest('incomplete profiles stay gated and never request private social data',async()=>{
  const h=harness({incomplete:true});try{h.mount();await flush();assert.equal(h.calls.length,0);assert.equal(h.authCalls,0);assert.match(h.app.textContent,/Finish setting up/);assert([...h.app.querySelectorAll('.sota-social-panel')].every(button=>button.disabled));}finally{h.close();}
});

domTest('accepted friends fill both hosts, removed friends disappear and whole panels keep their navigation',async()=>{
  const h=harness({hosts:2});try{h.mount();await flush();assert.equal(h.calls.length,2,'multiple hosts share one feed');assert.equal(h.app.querySelectorAll('.sota-social-mate').length,2);const wall=h.app.querySelector('[data-social-panel="wall"]');wall.focus();
    h.friends=[friend('alpha'),friend('beta'),friend('pending',{status:'pending'})];await h.social.refresh();assert.equal(h.app.querySelectorAll('.sota-social-mate').length,4);assert.match(h.app.textContent,/2 accepted friends/);assert.doesNotMatch(h.app.textContent,/TEST pending/);assert.equal(h.w.document.activeElement,wall,'refresh does not replace the focused whole-panel button');
    h.friends=[friend('beta')];await h.social.refresh();assert.doesNotMatch(h.app.textContent,/TEST alpha/);wall.click();assert.equal(h.state.roomHandle,null);h.app.querySelector('[data-social-panel="mates"]').click();assert.deepEqual(h.goActions,['room','friends']);
  }finally{h.close();}
});

domTest('real notes render newest-first as text and never inject HTML or fetch media',async()=>{
  const h=harness();try{h.room.wall=[{handle:'older',body:'older note',created_at:'2026-01-01'},{handle:'newer',body:'<img src="https://private.invalid/a" onerror="alert(1)">',created_at:'2026-10-26'},{handle:'second',body:'[sota-meme]'+JSON.stringify({note:'real shared note',url:'https://private.invalid/b'}),created_at:'2026-10-25'}];h.mount();await flush();const authors=[...h.app.querySelectorAll('.sota-social-note-author')].map(n=>n.textContent);assert.deepEqual(authors,['@newer','@second']);assert.match(h.app.textContent,/<img src=/);assert.match(h.app.textContent,/real shared note/);assert.equal(h.app.querySelectorAll('img,script,iframe,audio,video,canvas').length,0);assert.equal(h.app.querySelectorAll('[src],[href]').length,0);assert.doesNotMatch(h.app.textContent,/older note|private\.invalid\/b/);}finally{h.close();}
});

domTest('a transient first failure can retry and a later failure retains the last real data with stale status',async()=>{
  const h=harness();try{h.rpcHook=name=>name==='bv_room'?{data:null,error:{code:'NETWORK'}}:undefined;h.mount();await flush();assert.equal(h.app.querySelector('.sota-social-host').dataset.socialState,'error');assert.doesNotMatch(h.app.textContent,/TEST alpha/);h.rpcHook=null;await h.social.refresh();assert.match(h.app.textContent,/TEST alpha/);h.rpcHook=()=>({data:null,error:{code:'NETWORK'}});await h.social.refresh();assert.match(h.app.textContent,/TEST alpha/);assert.equal(h.app.querySelector('.sota-social-host').dataset.socialState,'stale');assert.match(h.app.textContent,/Showing your last update/);}finally{h.close();}
});

domTest('overlapping refreshes share one request and periodic refresh reflects accepted friendship changes',async()=>{
  const h=harness();try{h.mount();await flush();const pending=defer();h.rpcHook=name=>name==='bv_room'?pending.promise:undefined;const before=h.calls.length,one=h.social.refresh(),two=h.social.refresh();await flush();assert.equal(h.calls.length-before,2);pending.resolve({data:h.room,error:null});await Promise.all([one,two]);h.rpcHook=null;h.friends.push(friend('beta'));await h.tick();assert.match(h.app.textContent,/TEST beta/);assert.equal(h.timers.size,1);}finally{h.close();}
});

domTest('stop removes private data, subscriptions, listeners and timers and ignores late responses',async()=>{
  const h=harness();try{h.mount();await flush();const pending=defer();h.rpcHook=name=>name==='bv_room'?pending.promise:undefined;const read=h.social.refresh();await flush();h.social.stop();assert.doesNotMatch(h.app.textContent,/TEST alpha/);assert.equal(h.timers.size,0);assert.equal(h.unsubscribed,1);pending.resolve({data:h.room,error:null});await read;await flush();assert.doesNotMatch(h.app.textContent,/TEST alpha/);h.app.querySelector('[data-social-panel="wall"]').click();assert.deepEqual(h.goActions,[]);assert.equal(h.timers.size,0);}finally{h.close();}
});

domTest('signout clears private cards synchronously without starting another read',async()=>{
  const h=harness();try{h.mount();await flush();assert.match(h.app.textContent,/TEST alpha/);const before=h.calls.length;h.authEvent('SIGNED_OUT',null);assert.doesNotMatch(h.app.textContent,/TEST alpha/);assert.equal(h.calls.length,before);assert.equal(h.timers.size,0);await flush();assert.equal(h.calls.length,before);}finally{h.close();}
});

domTest('switching accounts during a pending read clears prior data and suppresses its late result',async()=>{
  const h=harness();try{h.mount();await flush();const pending=defer();h.rpcHook=name=>name==='bv_room'?pending.promise:undefined;const read=h.social.refresh();await flush();h.authEvent('SIGNED_IN',other);assert.doesNotMatch(h.app.textContent,/TEST alpha/);pending.resolve({data:h.room,error:null});await read;await flush();assert.doesNotMatch(h.app.textContent,/TEST alpha/);assert.equal(h.timers.size,0);}finally{h.close();}
});

domTest('an auth mismatch after data reads clears prior people and offers sign-in rather than retrying',async()=>{
  const h=harness();try{h.mount();await flush();h.authHook=count=>({data:{user:{id:count%2?owner:other}},error:null});await h.social.refresh();assert.doesNotMatch(h.app.textContent,/TEST alpha/);assert.equal(h.app.querySelector('.sota-social-host').dataset.socialState,'auth-required');assert.equal(h.timers.size,0);h.app.querySelector('[data-social-panel="wall"]').click();assert.deepEqual(h.authActions,[['in',true]]);h.social.stop();h.app.querySelector('[data-social-panel="wall"]').click();assert.equal(h.authActions.length,1,'stop removes expired-auth action listeners too');}finally{h.close();}
});

domTest('hidden pages pause reads and resume once visible',async()=>{
  const h=harness();try{h.hidden(true);h.mount();await flush();assert.equal(h.calls.length,0);assert.equal(h.timers.size,0);h.hidden(false);await flush();assert.match(h.app.textContent,/TEST alpha/);assert.equal(h.calls.length,2);assert.equal(h.timers.size,1);}finally{h.close();}
});

domTest('a quick offline and online cycle discards the in-flight snapshot and requests fresh data',async()=>{
  const h=harness();try{h.mount();await flush();const pending=defer();h.friends=[friend('stale_friend')];h.rpcHook=name=>name==='bv_room'?pending.promise:undefined;const read=h.social.refresh();await flush();h.online(false);h.online(true);h.friends=[friend('fresh_friend')];h.rpcHook=null;pending.resolve({data:h.room,error:null});await read;await flush();assert.doesNotMatch(h.app.textContent,/TEST stale_friend/);assert.match(h.app.textContent,/TEST fresh_friend/);assert.equal(h.timers.size,1);}finally{h.close();}
});

domTest('a quick hidden and visible cycle also discards in-flight notes and refreshes them',async()=>{
  const h=harness();try{h.mount();await flush();const pending=defer();h.room={...makeRoom(),wall:[{handle:'stale_author',body:'stale private note',created_at:'2026-10-26'}]};h.rpcHook=name=>name==='bv_room'?pending.promise:undefined;const read=h.social.refresh();await flush();h.hidden(true);h.hidden(false);const oldRoom=h.room;h.room={...makeRoom(),wall:[{handle:'fresh_author',body:'fresh private note',created_at:'2026-10-26'}]};h.rpcHook=null;pending.resolve({data:oldRoom,error:null});await read;await flush();assert.doesNotMatch(h.app.textContent,/stale private note/);assert.match(h.app.textContent,/fresh private note/);assert.equal(h.timers.size,1);}finally{h.close();}
});
