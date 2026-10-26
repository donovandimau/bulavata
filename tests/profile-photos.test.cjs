'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
let JSDOM;try{({JSDOM}=require(process.env.JSDOM_MODULE||'jsdom'));}catch(_){}
const browserTest=(name,fn)=>test(name,{skip:!JSDOM?'Install jsdom or set JSDOM_MODULE to run photo editor integration':false},fn);
const root=path.join(__dirname,'..');
const source=name=>fs.readFileSync(path.join(root,name),'utf8');
const owner='61026000-0000-4000-8000-000000000001',other='61026000-0000-4000-8000-000000000002';
const flush=async()=>{for(let i=0;i<12;i++)await new Promise(resolve=>setImmediate(resolve));};
function defer(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function indexedDBFixture(){
  const records=new Map();let failWrite=false;
  const fixture={records,get failWrite(){return failWrite;},set failWrite(value){failWrite=value;}};
  fixture.api={open(){const request={};queueMicrotask(()=>{
    const db={objectStoreNames:{contains:()=>true},createObjectStore(){},close(){},transaction(){
      const transaction={error:null,objectStore(){return {
        get(key){const read={};queueMicrotask(()=>{read.result=records.get(key);read.onsuccess?.();queueMicrotask(()=>transaction.oncomplete?.());});return read;},
        put(value,key){const write={};queueMicrotask(()=>{if(failWrite){transaction.error=new Error('Device storage full');write.error=transaction.error;write.onerror?.();transaction.onerror?.();transaction.onabort?.();return;}records.set(key===undefined?value.id:key,value);write.result=key;write.onsuccess?.();queueMicrotask(()=>transaction.oncomplete?.());});return write;},
        delete(key){records.delete(key);queueMicrotask(()=>transaction.oncomplete?.());return {};}
      };},abort(){transaction.onabort?.();}};return transaction;}};
    request.result=db;request.onupgradeneeded?.();request.onsuccess?.();
  });return request;}};
  return fixture;
}
function harness(t,{guest=false}={}){
  const dom=new JSDOM('<!doctype html><html><body><main id="app"><div class="sk-hero-artwork"><img class="sk-original-design" src="/assets/front-reference-brand.jpg"></div></main></body></html>',{url:'https://sotakece.com/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,d=w.document,app=d.querySelector('#app'),idb=indexedDBFixture(),events=[],urls=new Map(),revoked=[],authListeners=new Set();let nextURL=0,authCalls=0,authOwner=owner;
  const state={user:guest?null:{id:owner},me:guest?null:{id:owner,room_css:''}};
  const f={dom,w,d,app,state,idb,events,urls,revoked,authListeners,uploadHook:null,readHook:null,updateHook:null,authHook:null,signedHook:null,onSaved:[],updates:[],uploads:[],removed:[],signed:[],decodeError:false};
  const client={auth:{getUser:async()=>{authCalls++;events.push('auth');return f.authHook?f.authHook(authCalls):{data:{user:{id:authOwner}},error:null};},onAuthStateChange(fn){authListeners.add(fn);return {data:{subscription:{unsubscribe(){authListeners.delete(fn);}}}};}},from(table){assert.equal(table,'bv_profiles');let patch=null;const filters=[];const query={select(){return query;},eq(key,value){filters.push([key,value,'eq']);return query;},is(key,value){filters.push([key,value,'is']);return query;},update(value){patch=value;return query;},maybeSingle:async()=>{events.push('read');return f.readHook?f.readHook():{data:{id:owner,room_css:f.freshCSS},error:null};},single:async()=>{events.push('update');f.updates.push({patch,filters});return f.updateHook?f.updateHook(patch,filters):{data:{id:owner,room_css:patch.room_css},error:null};}};return query;}};
  f.client=client;w.indexedDB=idb.api;
  w.URL.createObjectURL=blob=>{const url='blob:https://sotakece.com/test-photo-'+(++nextURL);urls.set(url,blob);return url;};w.URL.revokeObjectURL=url=>{revoked.push(url);urls.delete(url);};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){if(!this.open)return;this.open=false;this.dispatchEvent(new w.Event('close'));};
  w.HTMLImageElement.prototype.decode=async function(){if(f.decodeError)throw new Error('Image decode failed');};
  Object.defineProperty(w.HTMLImageElement.prototype,'naturalWidth',{configurable:true,get(){return this.classList.contains('sk-original-design')?1360:800;}});
  Object.defineProperty(w.HTMLImageElement.prototype,'naturalHeight',{configurable:true,get(){return this.classList.contains('sk-original-design')?832:600;}});
  w.HTMLElement.prototype.getBoundingClientRect=()=>({left:0,top:0,width:1360,height:832,right:1360,bottom:832});
  w.ResizeObserver=class{observe(){}disconnect(){}};w.IntersectionObserver=class{observe(){}disconnect(){}};
  w.eval(source('skin-identities.js'));w.eval(source('skins.js'));w.eval(source('room-media.js'));
  f.initialCSS=w.BulaSkins.encode({id:'lagoon',note:'Initial note',customName:'Initial name'},'#room-head { border-radius: 17px; }');
  f.freshCSS=w.BulaSkins.encode({id:'midnight',note:'Latest server note',customName:'Changed elsewhere',trackTitle:'Keep my song'},'#room-head { border-radius: 29px; }');if(state.me)state.me.room_css=f.initialCSS;
  w.SotaRoomMedia.api=(givenClient,givenOwner)=>{assert.equal(givenClient,client);assert.equal(givenOwner,owner);return {async upload(file,kind){events.push('upload');assert.equal(kind,'cover');const result=f.uploadHook?await f.uploadHook(file,kind):{path:owner+'/covers/'+String(f.uploads.length+1).padStart(8,'0')+'-0000-4000-8000-000000000000.png'};f.uploads.push(result.path);return result;},async remove(path){events.push('remove');f.removed.push(path);return true;}};};
  w.SotaRoomMedia.signed=async(givenClient,objectPath,kind)=>{assert.equal(givenClient,client);f.signed.push({objectPath,kind});return f.signedHook?f.signedHook(objectPath):'https://media.example.invalid/signed/'+objectPath;};
  w.eval(source('profile-photos.js'));f.photos=w.SotaProfilePhotos;f.photos.init({client,state,app,auth(){throw new Error('Guest previews must not require a login');},onSaved:result=>f.onSaved.push(result)});f.photos.mountHero(app);
  f.get=selector=>d.querySelector(selector);f.open=async()=>{await f.photos.open();await flush();return f.get('.spp-dialog');};
  f.pick=async(kind,file=new File([Uint8Array.from([137,80,78,71,13,10,26,10])],kind+'.png',{type:'image/png'}))=>{const input=f.get('[data-photo-file="'+kind+'"]');assert(input,'Photo file chooser '+kind+' exists');Object.defineProperty(input,'files',{configurable:true,value:[file]});input.dispatchEvent(new w.Event('change',{bubbles:true}));await flush();return file;};
  f.save=async()=>{f.get('[data-photo-save]').click();await flush();};
  f.authEvent=(event,next)=>{for(const fn of [...authListeners])fn(event,next?{user:{id:next}}:null);};
  Object.defineProperties(f,{authCalls:{get:()=>authCalls},authOwner:{get:()=>authOwner,set:value=>{authOwner=value;}}});
  t.after(()=>{f.photos.stop();dom.window.close();});return f;
}

browserTest('hero edit control opens separate circular-avatar and rectangular-banner inputs without an upload',async t=>{
  const h=harness(t);const button=h.get('[data-profile-photo-edit]');assert(button,'Baked Edit profile has a real button');button.click();await flush();
  assert(h.get('.spp-dialog')?.open);assert(h.get('[data-photo-file="avatar"]'));assert(h.get('[data-photo-file="cover"]'));
  assert.equal(h.uploads.length,0);assert.equal(h.updates.length,0);
  await h.pick('avatar');assert.equal(h.uploads.length,0,'Selecting is a preview, not a private upload');h.get('[data-photo-cancel]').click();await flush();assert(!h.get('.spp-dialog')?.open);assert.equal(h.updates.length,0);assert.equal(h.onSaved.length,0);
});

browserTest('invalid formats and undecodable images are rejected before any upload or save',async t=>{
  const h=harness(t);await h.open();await h.pick('avatar',new File(['<svg/>'],'portrait.svg',{type:'image/svg+xml'}));assert.match(h.get('[data-photo-error]').textContent,/JPG|PNG|WebP|image/i);
  await h.pick('cover',new File(['not png'],'banner.png',{type:'image/png'}));assert.match(h.get('[data-photo-error]').textContent,/format|content|different/i);
  const oversized=new File([Uint8Array.from([137,80,78,71])],'large.png',{type:'image/png'});Object.defineProperty(oversized,'size',{value:6*1024*1024+1});await h.pick('cover',oversized);assert.match(h.get('[data-photo-error]').textContent,/6 MB/);
  h.decodeError=true;await h.pick('avatar');assert.match(h.get('[data-photo-error]').textContent,/image|decode|read/i);assert.equal(h.uploads.length,0);assert.equal(h.updates.length,0);
});

browserTest('signed-in save merges new photo paths into fresh server settings and preserves legacy CSS',async t=>{
  const h=harness(t);await h.open();await h.pick('avatar');await h.pick('cover');await h.save();
  assert.equal(h.uploads.length,2);assert.equal(h.updates.length,1);const patch=h.updates[0].patch,parsed=h.w.BulaSkins.read(patch.room_css);
  assert.equal(parsed.settings.avatarPath,h.uploads[0]);assert.equal(parsed.settings.coverPath,h.uploads[1]);assert.equal(parsed.settings.id,'midnight');assert.equal(parsed.settings.note,'Latest server note');assert.equal(parsed.settings.customName,'Changed elsewhere');assert.equal(parsed.settings.trackTitle,'Keep my song');assert.equal(parsed.legacy,'#room-head { border-radius: 29px; }');
  assert(h.updates[0].filters.some(([key,value])=>key==='id'&&value===owner));assert(h.updates[0].filters.some(([key,value])=>key==='room_css'&&value===h.freshCSS),'Compare-and-set avoids silently overwriting a concurrent skin change');
  assert.equal(h.state.me.room_css,patch.room_css);assert.equal(h.removed.length,0);assert.equal(h.onSaved.length,1);assert(h.authCalls>=3,'The authenticated owner is validated before each upload and final save');
});

browserTest('an ambiguous profile write failure retains private uploads because the server may have committed',async t=>{
  const h=harness(t);await h.open();await h.pick('avatar');await h.pick('cover');h.updateHook=()=>({data:null,error:{message:'Network request failed',name:'TypeError'}});await h.save();
  assert.equal(h.uploads.length,2);assert.deepEqual(h.removed,[],'Deleting after an uncertain write could break a profile already saved on the server');assert.equal(h.state.me.room_css,h.initialCSS);assert.equal(h.onSaved.length,0);assert(h.get('.spp-dialog')?.open);assert.match(h.get('[data-photo-error]').textContent,/Network|save|again/i);
});

browserTest('a failure before the profile write cleans newly uploaded files without touching previous settings',async t=>{
  const h=harness(t);await h.open();await h.pick('avatar');await h.pick('cover');h.readHook=()=>({data:null,error:{message:'Read interrupted'}});await h.save();
  assert.equal(h.uploads.length,2);assert.equal(h.updates.length,0);assert.deepEqual(h.removed.slice().sort(),h.uploads.slice().sort());assert.equal(h.state.me.room_css,h.initialCSS);assert.equal(h.onSaved.length,0);assert.match(h.get('[data-photo-error]').textContent,/latest room settings|Try again/i);
});

browserTest('an auth mismatch blocks all private uploads and cannot report saved',async t=>{
  const h=harness(t);await h.open();await h.pick('avatar');h.authOwner=other;await h.save();assert.equal(h.uploads.length,0);assert.equal(h.updates.length,0);assert.equal(h.onSaved.length,0);assert.equal(h.state.me.room_css,h.initialCSS);
});

browserTest('owner identity is checked again between the avatar and banner upload',async t=>{
  const h=harness(t);await h.open();await h.pick('avatar');await h.pick('cover');
  h.uploadHook=()=>{h.authOwner=other;return {path:owner+'/covers/00000001-0000-4000-8000-000000000000.png'};};
  await h.save();assert.equal(h.uploads.length,1,'The changed authenticated owner blocks the second upload');assert.equal(h.updates.length,0);assert.deepEqual(h.removed,h.uploads);assert.equal(h.onSaved.length,0);assert.equal(h.state.me.room_css,h.initialCSS);
});

browserTest('changing account during an upload cleans its new object and suppresses stale settings/UI updates',async t=>{
  const h=harness(t),pending=defer();await h.open();await h.pick('avatar');h.uploadHook=()=>pending.promise;h.get('[data-photo-save]').click();await flush();
  h.state.user={id:other};h.state.me={id:other,room_css:'new owner settings'};h.authEvent('SIGNED_IN',other);
  pending.resolve({path:owner+'/covers/00000001-0000-4000-8000-000000000000.png'});await flush();
  assert.equal(h.updates.length,0);assert.equal(h.onSaved.length,0);assert.equal(h.state.me.room_css,'new owner settings');assert.equal(h.removed.length,1);assert(!h.get('.spp-dialog')?.open);assert.equal(h.get('img[data-profile-photo="avatar"]'),null);
});

browserTest('guest photo save commits blobs to this device without authentication, uploads or profile writes',async t=>{
  const h=harness(t,{guest:true});await h.open();assert.match(h.get('.spp-dialog').textContent,/this device/i);await h.pick('avatar');await h.pick('cover');await h.save();
  assert.equal(h.authCalls,0);assert.equal(h.uploads.length,0);assert.equal(h.updates.length,0);assert(h.idb.records.size>0);assert.equal(h.onSaved.length,1);assert(h.get('img[data-profile-photo="avatar"]'));assert(h.get('img[data-profile-photo="cover"]'));
});

browserTest('guest device storage failures retain the editable draft and do not claim persistence',async t=>{
  const h=harness(t,{guest:true});await h.open();await h.pick('avatar');h.idb.failWrite=true;await h.save();assert.equal(h.onSaved.length,0);assert(h.get('.spp-dialog')?.open);assert.match(h.get('[data-photo-error]').textContent,/storage|device|save|full/i);const image=h.get('img[data-profile-photo="avatar"]');assert(image.hidden);assert.equal(image.getAttribute('src'),null);
});

browserTest('a concurrent room change produces a retryable conflict without deleting files after a write attempt',async t=>{
  const h=harness(t);await h.open();await h.pick('avatar');h.updateHook=()=>({data:null,error:null});await h.save();
  assert.equal(h.onSaved.length,0);assert.equal(h.state.me.room_css,h.initialCSS);assert.deepEqual(h.removed,[]);assert.match(h.get('[data-photo-error]').textContent,/changed while saving|latest settings|Try again/i);assert(h.get('.spp-dialog')?.open);
  h.freshCSS=h.w.BulaSkins.encode({id:'kula',note:'Concurrent revision preserved'},'.newest { color: red; }');h.updateHook=null;await h.save();
  const result=h.w.BulaSkins.read(h.state.me.room_css);assert.equal(result.settings.note,'Concurrent revision preserved');assert.equal(result.legacy,'.newest { color: red; }');assert.equal(h.onSaved.length,1);
});

browserTest('profiles with a null room_css use a null-safe compare-and-set when saving photos',async t=>{
  const h=harness(t);h.freshCSS=null;await h.open();await h.pick('avatar');await h.save();
  assert.equal(h.onSaved.length,1);assert(h.updates[0].filters.some(([key,value,operator])=>key==='room_css'&&value===null&&operator==='is'));
  assert.equal(h.w.BulaSkins.read(h.state.me.room_css).settings.avatarPath,h.uploads[0]);
});

browserTest('cancelling an in-flight upload cleans its object without changing the saved profile',async t=>{
  const h=harness(t),pending=defer();await h.open();await h.pick('avatar');h.uploadHook=()=>pending.promise;h.get('[data-photo-save]').click();await flush();
  h.get('[data-photo-cancel]').click();assert(!h.get('.spp-dialog')?.open);pending.resolve({path:owner+'/covers/00000001-0000-4000-8000-000000000000.png'});await flush();
  assert.equal(h.updates.length,0);assert.equal(h.onSaved.length,0);assert.equal(h.state.me.room_css,h.initialCSS);assert.deepEqual(h.removed,h.uploads);assert(h.revoked.length>0,'Cancelled preview blobs are released');
});

browserTest('room photos are cleared on an account change and pending private URLs cannot paint into the new owner view',async t=>{
  const h=harness(t);const room=h.d.createElement('section');room.innerHTML='<div id="room-head"><div class="av lg"></div><div class="bv-cover"></div></div>';h.app.append(room);
  const avatarPath=other+'/covers/00000001-0000-4000-8000-000000000000.png',coverPath=other+'/covers/00000002-0000-4000-8000-000000000000.png',profile={id:other,room_css:h.w.BulaSkins.encode({avatarPath,coverPath})};
  await h.photos.mountRoom(room,profile);assert.equal(room.querySelectorAll('.spp-room-avatar,.spp-room-cover').length,2);assert(h.signed.every(entry=>entry.kind==='cover'));
  h.authEvent('SIGNED_IN',other);assert.equal(room.querySelectorAll('img').length,0);
  h.photos.init({client:h.client,state:h.state,app:h.app});const pending=defer();h.signedHook=()=>pending.promise;const mounting=h.photos.mountRoom(room,profile);await flush();h.state.user={id:other};h.state.me={id:other};h.authEvent('SIGNED_IN',other);pending.resolve('https://media.example.invalid/stale-private');await mounting;
  assert.equal(room.querySelectorAll('img').length,0,'A late signed URL is discarded after ownership changes');
});

browserTest('photo overlay geometry follows the drawn source image and accounts for letterboxing',t=>{
  const h=harness(t),art=h.get('.sk-hero-artwork'),image=h.get('.sk-original-design');art.getBoundingClientRect=()=>({left:20,top:10,width:800,height:600});image.getBoundingClientRect=()=>({left:50,top:20,width:680,height:500});
  const geometry=h.photos.geometry(image,art);assert.equal(geometry.slot,h.photos.slots.desktop);assert.equal(geometry.scale,.5);assert.equal(geometry.left,30);assert.equal(geometry.top,52);
});

browserTest('a late initial private-photo URL cannot overwrite a newly saved avatar',async t=>{
  const h=harness(t),pending=defer(),oldPath=owner+'/covers/99999999-0000-4000-8000-000000000000.png';
  h.state.me.room_css=h.w.BulaSkins.encode({avatarPath:oldPath});h.signedHook=()=>pending.promise;h.photos.mountHero(h.app);await flush();assert(h.signed.some(entry=>entry.objectPath===oldPath));
  await h.open();await h.pick('avatar');await h.save();const image=h.get('img[data-profile-photo="avatar"]'),savedURL=image.getAttribute('src');assert.match(savedURL,/^blob:/);assert.equal(h.onSaved.length,1);
  pending.resolve('https://media.example.invalid/old-avatar');await flush();assert.equal(image.getAttribute('src'),savedURL,'The pending original-image read loses to the confirmed save');
});

browserTest('stopping an editor opened during a pending initial load suppresses the dialog safely',async t=>{
  const h=harness(t),pending=defer();h.photos.stop();h.state.me.room_css=h.w.BulaSkins.encode({avatarPath:owner+'/covers/99999999-0000-4000-8000-000000000000.png'});h.signedHook=()=>pending.promise;
  const opening=h.photos.open();await flush();h.photos.stop();pending.resolve('https://media.example.invalid/stale-avatar');await opening;await flush();assert.equal(h.get('.spp-dialog'),null);assert.equal(h.onSaved.length,0);
});
