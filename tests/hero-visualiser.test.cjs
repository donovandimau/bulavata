'use strict';

// Real browser modules with synthetic audio and analyser data. This suite never
// fetches audio, opens media permissions, or plays a real device's sound.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
let JSDOM,VirtualConsole;
try{({JSDOM,VirtualConsole}=require('jsdom'));}
catch(_){try{({JSDOM,VirtualConsole}=require('../call-controls/test-tools/node_modules/jsdom'));}catch(_){}}
const browserTest=(name,fn)=>test(name,{skip:!JSDOM?'Install the pinned jsdom test tools to run browser integration.':false},fn);
const root=path.join(__dirname,'..');
const source=file=>fs.readFileSync(path.join(root,file),'utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}

function environment(t,{reduced=false,resume=null,canvasAvailable=true}={}){
  const errors=[],calls={contexts:[],sources:[],samples:0,draws:0,plays:[],fetches:[],resumes:0,audioDraws:[],order:[]},frames=new Map(),intersection=[],resize=[];
  let frameId=0,now=0,hidden=false;
  const console=new VirtualConsole();console.on('jsdomError',error=>errors.push(error));
  const dom=new JSDOM('<!doctype html><html><head></head><body><main id="app"></main></body></html>',{url:'https://sotakece.com/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:console});
  const w=dom.window,d=w.document,media=new WeakMap();
  const state=audio=>{if(!media.has(audio))media.set(audio,{paused:true,ended:false,error:null});return media.get(audio);};
  for(const name of ['paused','ended','error'])Object.defineProperty(w.HTMLMediaElement.prototype,name,{configurable:true,get(){return state(this)[name];}});
  Object.defineProperty(w.HTMLMediaElement.prototype,'currentSrc',{configurable:true,get(){return this.src;}});
  w.HTMLMediaElement.prototype.play=function(){calls.plays.push(this);calls.order.push({kind:'play',audio:this});Object.assign(state(this),{paused:false,ended:false,error:null});this.dispatchEvent(new w.Event('play'));return Promise.resolve();};
  w.HTMLMediaElement.prototype.pause=function(){const current=state(this);if(current.paused)return;current.paused=true;this.dispatchEvent(new w.Event('pause'));};
  w.HTMLMediaElement.prototype.load=function(){};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  w.HTMLDialogElement.prototype.show=function(){this.open=true;};
  w.HTMLDialogElement.prototype.close=function(){if(!this.open)return;this.open=false;this.dispatchEvent(new w.Event('close'));};
  const gradient=()=>({addColorStop(){}});
  const drawing={save(){},restore(){},clearRect(){calls.draws++;},fillRect(){calls.draws++;},strokeRect(){},createLinearGradient:gradient,createRadialGradient:gradient,beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){},fill(){},fillText(){},setTransform(){},resetTransform(){},translate(){},scale(){}};
  w.HTMLCanvasElement.prototype.getContext=function(){return canvasAvailable?drawing:null;};
  w.HTMLElement.prototype.getBoundingClientRect=function(){return {width:800,height:240,left:0,top:0,right:800,bottom:240};};
  w.HTMLElement.prototype.getClientRects=function(){return this.isConnected&&!this.closest('[hidden]')?[this.getBoundingClientRect()]:[];};
  w.HTMLElement.prototype.scrollIntoView=function(){};
  w.requestAnimationFrame=callback=>{const id=++frameId;frames.set(id,callback);return id;};
  w.cancelAnimationFrame=id=>frames.delete(id);
  const motion={matches:reduced,listeners:new Set(),addEventListener(type,listener){this.listeners.add(listener);},removeEventListener(type,listener){this.listeners.delete(listener);}};
  w.matchMedia=query=>query.includes('prefers-reduced-motion')?motion:{matches:false,addEventListener(){},removeEventListener(){}};
  Object.defineProperty(d,'hidden',{configurable:true,get:()=>hidden});
  w.ResizeObserver=class{constructor(callback){this.callback=callback;this.targets=new Set();resize.push(this);}observe(target){this.targets.add(target);}disconnect(){this.targets.clear();}};
  w.IntersectionObserver=class{constructor(callback){this.callback=callback;this.targets=new Set();intersection.push(this);}observe(target){this.targets.add(target);}disconnect(){this.targets.clear();}};
  class AudioContext{
    constructor(){this.destination={speaker:true};this.state='suspended';this.sampleRate=48000;calls.contexts.push(this);}
    resume(){calls.resumes++;if(resume)return resume.promise.then(()=>{this.state='running';});this.state='running';return Promise.resolve();}
    createAnalyser(){return {fftSize:2048,frequencyBinCount:1024,getByteFrequencyData(array){calls.samples++;array.fill(80);},getByteTimeDomainData(array){calls.samples++;array.fill(144);}};}
    createMediaElementSource(audio){const node={audio,routes:[],connect(destination){this.routes.push(destination);},disconnect(destination){this.routes=this.routes.filter(route=>route!==destination);}};calls.sources.push(node);return node;}
  }
  w.AudioContext=AudioContext;
  w.fetch=async(url,options)=>{calls.fetches.push({url,options});return {ok:true,json:async()=>[{id:'test-song-1',title:'Synthetic test track',path:'fiji-song-01.mp3'},{id:'test-song-2',title:'Another synthetic track',path:'fiji-song-02.mp3'}]};};
  const run=file=>w.eval(source(file)+'\n//# sourceURL=actual-'+file);
  const get=selector=>d.querySelector(selector);
  const audio=(src='blob:https://sotakece.com/synthetic',identity='local')=>{const node=d.createElement('audio');node.src=src;node.setAttribute('data-sota-playback-source',identity);d.body.append(node);return node;};
  const end=node=>{Object.assign(state(node),{paused:true,ended:true});node.dispatchEvent(new w.Event('ended'));};
  const error=node=>{Object.assign(state(node),{paused:true,error:{code:4}});node.dispatchEvent(new w.Event('error'));};
  const advance=()=>{now+=50;const pending=[...frames.values()];frames.clear();pending.forEach(callback=>callback(now));};
  const visibility=value=>{hidden=value;d.dispatchEvent(new w.Event('visibilitychange'));};
  const visible=(target,value)=>{for(const observer of intersection)if(observer.targets.has(target))observer.callback([{target,isIntersecting:value}]);};
  const clean=()=>assert.deepEqual(errors.map(error=>error.message),[],'No browser handler errors');
  t.after(()=>{dom.window.close();});
  return {w,d,get,run,audio,end,error,state,advance,visibility,visible,motion,calls,frames,intersection,resize,clean};
}

function hero(h){
  h.run('music-visualiser.js');h.run('playback.js');h.run('hero-visualiser.js');
  const studio=source('skin-studio.js'),start=studio.indexOf('<div class="sk-hero-artwork">'),end=studio.indexOf('</section><main class="bv-neon-section"',start);
  assert(start>=0&&end>start,'Use the actual supplied-artwork hero markup');
  h.get('#app').innerHTML=studio.slice(start,end);
  const draw=h.w.DimauMusicVisuals.draw;
  h.w.DimauMusicVisuals.draw=(ctx,width,height,settings,state,data,background)=>{
    h.calls.audioDraws.push({width,height,data,background,settings});return draw(ctx,width,height,settings,state,data,background);
  };
  h.w.SotaHeroVisualiser.mount(h.get('#app'));
  return h.get('.sk-hero-visualiser');
}
function eligibleAudio(h,identity='local',src){const audio=h.audio(src,identity);audio.id=identity==='playlist'?'sota-playlist-audio':'sota-local-audio';return audio;}

browserTest('actual hero attachment preserves original artwork and account CTA without autoplay or analyser setup',async t=>{
  const h=environment(t),host=hero(h);
  assert(host,'The real landing-page template contains the visualiser');
  assert.equal(host.getAttribute('role'),'img');assert.match(host.getAttribute('aria-label'),/choose a song/i);
  assert.equal(host.dataset.state,'idle');assert.equal(host.querySelector('canvas').getAttribute('aria-hidden'),'true');
  assert.equal(h.get('.sk-original-picture source').getAttribute('srcset'),'/assets/mobile-front-reference-brand.jpg');
  assert.equal(h.get('.sk-original-design').getAttribute('src'),'/assets/front-reference-brand.jpg');
  assert.equal(h.get('.sk-hero-create').getAttribute('onclick'),"renderAuth('up',true)");
  assert(h.get('.sk-music-stage'),'A large music surface sits immediately after the supplied hero');
  assert.equal(h.get('.sk-music-stage-picture canvas').getAttribute('aria-hidden'),'true');
  assert.match(h.get('[data-stage-status]').textContent,/Choose a song/);
  const play=h.get('.sk-artwork-play');assert.equal(play.getAttribute('data-playlist-open'),'');assert.match(play.getAttribute('aria-label'),/Choose music/i);
  await tick();assert.equal(h.calls.contexts.length,0);assert.equal(h.calls.sources.length,0);assert.equal(h.calls.plays.length,0);assert.equal(h.calls.fetches.length,0);assert.equal(h.frames.size,0);
  h.w.SotaHeroVisualiser.mount(h.get('#app'));
  assert.equal(h.d.querySelectorAll('.sk-hero-visualiser canvas').length,1);
  assert.equal(h.calls.contexts.length,0);h.w.SotaHeroVisualiser.release();h.clean();
});

browserTest('manual music playback drives the real shared analyser and a transparent hero drawing',async t=>{
  const h=environment(t),host=hero(h),audio=eligibleAudio(h);
  assert.equal(h.calls.contexts.length,0);
  await audio.play();await tick();
  assert.equal(host.dataset.state,'live');assert.match(host.getAttribute('aria-label'),/reacting to the playing song/i);
  assert.equal(h.calls.contexts.length,1);assert.equal(h.calls.sources.length,1);assert.equal(h.calls.sources[0].audio,audio);
  assert.equal(h.calls.sources[0].routes.filter(route=>route.speaker).length,1,'A single output route reaches speakers');
  const before=h.calls.samples;h.advance();assert(h.calls.samples>before,'An animation frame reads analyser samples');
  const drawn=h.calls.audioDraws.findLast(frame=>frame.data);
  assert(drawn);assert.equal(drawn.data.frequency[0],80);assert.equal(drawn.data.wave[0],144);assert.equal(drawn.background,false,'The original hero artwork remains visible behind the canvas');
  audio.pause();assert.equal(host.dataset.state,'paused');assert.equal(h.frames.size,0);assert.equal(h.calls.audioDraws.at(-1).data,null,'Pause draws a flat resting state');
  await audio.play();await tick();assert.equal(host.dataset.state,'live');assert.equal(h.calls.sources.length,1,'Replaying reuses the same graph');
  h.end(audio);assert.equal(h.frames.size,0);assert.equal(host.dataset.state,'paused');
  h.w.SotaHeroVisualiser.release();h.clean();
});

browserTest('hidden, offscreen, modal, buffering, and reduced-motion states stop frames while preserving audio',async t=>{
  const h=environment(t),host=hero(h),audio=eligibleAudio(h);await audio.play();await tick();assert.equal(h.frames.size,1);
  const assertResting=()=>{assert.equal(h.frames.size,0);assert.equal(audio.paused,false,'Visual suspension does not pause the song');assert.equal(h.calls.audioDraws.at(-1).data,null);};
  h.visibility(true);assertResting();h.visibility(false);assert.equal(h.frames.size,1);
  h.visible(host,false);assert.equal(h.frames.size,1,'The large visible stage keeps the shared loop alive');
  h.visible(h.get('.sk-music-stage-picture'),false);assertResting();h.visible(host,true);assert.equal(h.frames.size,1);
  const modal=h.d.createElement('dialog');h.d.body.append(modal);modal.showModal();h.advance();assertResting();
  modal.close();assert.equal(h.frames.size,1);modal.remove();
  audio.dispatchEvent(new h.w.Event('waiting'));assertResting();audio.dispatchEvent(new h.w.Event('playing'));await tick();assert.equal(h.frames.size,1);
  h.motion.matches=true;for(const listener of h.motion.listeners)listener();assertResting();assert.equal(host.dataset.state,'reduced-motion');
  h.motion.matches=false;for(const listener of h.motion.listeners)listener();assert.equal(h.frames.size,1);
  h.error(audio);assert.equal(host.dataset.state,'unavailable');assert.equal(h.frames.size,0);h.w.SotaHeroVisualiser.release();h.clean();
});

browserTest('both music canvases share one sampled frame and stage controls never restart playback',async t=>{
  const h=environment(t),host=hero(h),audio=eligibleAudio(h);await audio.play();await tick();
  const samples=h.calls.samples,draws=h.calls.audioDraws.length,plays=h.calls.plays.length;
  h.advance();
  assert.equal(h.calls.samples-samples,2,'One frequency and one waveform read are shared across both surfaces');
  const frame=h.calls.audioDraws.slice(draws);
  assert.equal(frame.length,3,'Tiny waveform plus large spectrum and its overlaid waveform');
  assert(frame.every(draw=>draw.data===frame[0].data),'Every surface receives the same analyser sample');
  assert(frame.some(draw=>draw.settings.mode==='spectrum'&&draw.settings.theme==='rainbow'&&draw.settings.gain===1.5));
  assert.equal(h.frames.size,1,'A second canvas does not start another loop');
  h.get('[data-stage-motion]').click();assert.equal(h.frames.size,0);assert.equal(host.dataset.state,'motion-paused');
  assert.equal(audio.paused,false);assert.equal(h.get('[data-stage-motion]').getAttribute('aria-pressed'),'true');
  h.get('[data-stage-motion]').click();assert.equal(h.frames.size,1);
  const mode=h.get('[data-stage-mode]');mode.value='halo';mode.dispatchEvent(new h.w.Event('change'));
  assert.equal(h.calls.audioDraws.at(-1).settings.mode,'halo');assert.equal(h.calls.plays.length,plays);
  assert.equal(h.calls.contexts.length,1);assert.equal(h.calls.sources.length,1);
  h.w.SotaHeroVisualiser.release();assert.equal(h.frames.size,0);
  h.get('[data-stage-motion]').click();assert.equal(h.frames.size,0,'Release removes the large-stage handlers');h.clean();
});

browserTest('initial reduced motion and unavailable canvas leave music native and never create an audio context',async t=>{
  const reduced=environment(t,{reduced:true}),host=hero(reduced),audio=eligibleAudio(reduced);
  await reduced.w.SotaHeroVisualiser.prepare(audio);await audio.play();await tick();
  assert.equal(host.dataset.state,'reduced-motion');assert.equal(reduced.calls.contexts.length,0);assert.equal(reduced.calls.sources.length,0);assert.equal(reduced.frames.size,0);assert.equal(audio.paused,false);reduced.w.SotaHeroVisualiser.release();reduced.clean();
  const unavailable=environment(t,{canvasAvailable:false}),noCanvas=hero(unavailable),native=eligibleAudio(unavailable);
  await native.play();await tick();assert.equal(noCanvas.dataset.state,'unavailable');assert.equal(unavailable.calls.contexts.length,0);assert.equal(native.paused,false);assert.equal(unavailable.frames.size,0);unavailable.w.SotaHeroVisualiser.release();unavailable.clean();
});

browserTest('unapproved cross-origin and unrelated profile audio are left outside the hero analyser',async t=>{
  const h=environment(t),host=hero(h),profile=h.audio('https://other.example/profile.mp3','profile');
  await profile.play();await tick();assert.equal(host.dataset.state,'idle');assert.equal(h.calls.contexts.length,0);assert.equal(profile.paused,false);
  const cloud=eligibleAudio(h,'playlist','https://other.example/song.mp3');
  await cloud.play();await tick();assert.equal(host.dataset.state,'unavailable');assert.equal(h.calls.contexts.length,0);assert.equal(h.calls.sources.length,0);assert.equal(cloud.crossOrigin,null);assert.equal(cloud.paused,false);
  cloud.crossOrigin='anonymous';cloud.dispatchEvent(new h.w.Event('playing'));await tick();assert.equal(host.dataset.state,'live');assert.equal(h.calls.sources.length,1);assert.equal(h.calls.sources[0].audio,cloud);h.w.SotaHeroVisualiser.release();h.clean();
});

browserTest('releasing a surface during pending context resume cannot reroute audio or revive its animation',async t=>{
  const resume=deferred(),h=environment(t,{resume}),host=hero(h),audio=eligibleAudio(h);
  const prepare=h.w.SotaHeroVisualiser.prepare(audio);await tick();assert.equal(h.calls.contexts.length,1);assert.equal(h.calls.sources.length,0,'Native media is untouched before context resume');
  h.w.SotaHeroVisualiser.release();resume.resolve();await prepare;await tick();
  assert.equal(h.calls.sources.length,0);assert.equal(h.frames.size,0);assert.equal(h.calls.plays.length,0);assert.equal(audio.paused,true);
  await audio.play();await tick();assert.equal(h.calls.sources.length,0,'Released document listeners cannot bind later playback');assert.equal(h.frames.size,0);assert.notEqual(host.dataset.state,'live');h.clean();
});

browserTest('source replacement wins a pending resume and stale source events cannot rebind the hero',async t=>{
  const resume=deferred(),h=environment(t,{resume}),host=hero(h),first=eligibleAudio(h,'local'),next=eligibleAudio(h,'playlist','https://cloud.example/song.mp3');next.crossOrigin='anonymous';
  await first.play();await tick();await next.play();await tick();resume.resolve();await tick();
  assert.equal(h.calls.sources.length,1);assert.equal(h.calls.sources[0].audio,next);assert.equal(host.dataset.state,'live');
  first.dispatchEvent(new h.w.Event('pause'));assert.equal(host.dataset.state,'live','The previous source no longer owns media handlers');assert.equal(h.frames.size,1);
  h.w.SotaHeroVisualiser.release();h.clean();
});

browserTest('DOM replacement cleans frames and observers; remount reuses a playing graph without playing music again',async t=>{
  const h=environment(t),host=hero(h),audio=eligibleAudio(h);await audio.play();await tick();assert.equal(h.frames.size,1);
  const original=h.get('#app').innerHTML,playCalls=h.calls.plays.length;
  h.get('#app').replaceChildren();await tick();assert.equal(h.frames.size,0);assert(h.intersection.every(observer=>observer.targets.size===0));assert(h.resize.every(observer=>observer.targets.size===0));
  audio.dispatchEvent(new h.w.Event('playing'));await tick();assert.equal(h.frames.size,0);
  h.get('#app').innerHTML=original;h.w.SotaHeroVisualiser.mount(h.get('#app'));await tick();
  assert.equal(h.get('.sk-hero-visualiser').dataset.state,'live');assert.equal(h.frames.size,1);assert.equal(h.calls.sources.length,1);assert.equal(h.calls.plays.length,playCalls);assert.equal(host.isConnected,false);
  h.w.SotaHeroVisualiser.release();assert.equal(h.frames.size,0);assert.equal(audio.paused,false);h.clean();
});

browserTest('actual playlist opening is silent and manual track selection feeds the hero after the modal closes',async t=>{
  const h=environment(t),host=hero(h);h.get('[data-music-playlist-host]')?.remove();h.run('music-playlist.js');h.w.SotaPlaylist.mount(h.get('#app'));
  const prepare=h.w.SotaHeroVisualiser.prepare;h.w.SotaHeroVisualiser.prepare=audio=>{h.calls.order.push({kind:'prepare',audio});return prepare(audio);};
  h.get('.sk-artwork-play').click();await tick();
  assert(h.get('#sk-music-playlist').open);assert.equal(h.calls.fetches.length,1);assert.equal(h.calls.plays.length,0);assert.equal(h.calls.contexts.length,0);
  h.get('[data-track-index="0"]').click();await tick();
  const audio=h.get('#sota-playlist-audio');assert.equal(audio.crossOrigin,'anonymous');assert.equal(audio.paused,false);assert.equal(h.calls.sources.length,1);
  assert.deepEqual(h.calls.order.map(entry=>entry.kind),['prepare','play'],'The manual handler prepares the shared context before asking native audio to play');assert(h.calls.order.every(entry=>entry.audio===audio));
  assert.notEqual(host.dataset.state,'live','The background hero does not animate behind an open dialog');assert.equal(h.frames.size,0);
  h.get('.sk-playlist-close').click();await tick();assert.equal(host.dataset.state,'live');assert.equal(h.frames.size,1);
  h.w.SotaPlaylist.pause();assert.equal(host.dataset.state,'paused');assert.equal(h.frames.size,0);assert.equal(h.calls.sources.length,1);h.w.SotaHeroVisualiser.release();h.clean();
});

browserTest('a refused audio-context resume leaves native playback running without creating a source route',async t=>{
  const resume=deferred(),h=environment(t,{resume}),host=hero(h),audio=eligibleAudio(h);
  await audio.play();await tick();resume.reject(new Error('NotAllowedError: suspended context'));await tick();
  assert.equal(host.dataset.state,'unavailable');assert.equal(h.calls.sources.length,0);assert.equal(audio.paused,false);assert.equal(h.frames.size,0);assert.match(host.getAttribute('aria-label'),/music playback is unchanged/i);h.w.SotaHeroVisualiser.release();h.clean();
});

browserTest('the real skin reset releases hero animation while preserving background playlist playback',async t=>{
  const h=environment(t),host=hero(h),audio=eligibleAudio(h,'playlist');await audio.play();await tick();assert.equal(h.frames.size,1);
  h.w.BulaSkins={};h.w.S={user:null,me:null};h.w.app=h.get('#app');h.w.shell=()=>{};h.w.renderAuth=()=>{};h.w.openDecorate=()=>{};
  h.run('skin-studio.js');h.w.BulaSkinStudio.reset();
  assert.equal(h.frames.size,0);assert.equal(audio.paused,false);assert(h.intersection.every(observer=>observer.targets.size===0));
  audio.dispatchEvent(new h.w.Event('playing'));await tick();assert.equal(h.frames.size,0);assert.equal(host.isConnected,true,'Reset releases even before the renderer replaces the hero');h.clean();
});

browserTest('actual saved local music stays analysable after closing its library and remounting the hero',async t=>{
  const h=environment(t),host=hero(h),original=h.get('#app').innerHTML;
  const records=[{id:'synthetic-local',title:'Synthetic saved music',size:32,addedAt:1,blob:{}}];
  h.w.indexedDB={open(){const request={};queueMicrotask(()=>{
    request.result={close(){},transaction(){const transaction={objectStore(){return {getAll(){const read={};queueMicrotask(()=>{read.result=records;read.onsuccess();queueMicrotask(()=>transaction.oncomplete());});return read;}};}};return transaction;}};
    request.onsuccess();
  });return request;}};
  h.w.URL.createObjectURL=()=> 'blob:https://sotakece.com/synthetic-local';h.w.URL.revokeObjectURL=()=>{};
  h.run('local-music.js');h.w.SotaLocalMusic.mount(h.get('#app'));await tick();
  assert.equal(h.calls.plays.length,0);assert.equal(h.calls.contexts.length,0);assert.equal(h.calls.fetches.length,0);
  await h.w.SotaLocalMusic.open();assert(h.get('.bv-music-dialog')?.open);assert.equal(h.calls.plays.length,0);
  const prepare=h.w.SotaHeroVisualiser.prepare;h.w.SotaHeroVisualiser.prepare=audio=>{h.calls.order.push({kind:'prepare',audio});return prepare(audio);};
  h.get('#bv-local-music-play').click();await tick();const audio=h.get('#sota-local-audio');
  assert.equal(audio.paused,false);assert.equal(h.calls.sources.length,1);assert.deepEqual(h.calls.order.map(entry=>entry.kind),['prepare','play']);
  h.get('.bv-music-dialog-head button').click();await tick();assert.equal(audio.isConnected,false,'The actual local library removes its audio element on close');assert.equal(audio.paused,false);assert.equal(host.dataset.state,'live');
  h.w.SotaHeroVisualiser.release();h.get('#app').innerHTML=original;h.w.SotaHeroVisualiser.mount(h.get('#app'));await tick();
  assert.equal(h.get('.sk-hero-visualiser').dataset.state,'live','A still-playing local graph returns with the landing page even when its native player is detached');
  assert.equal(h.calls.sources.length,1);assert.equal(h.calls.plays.length,1);assert.equal(h.frames.size,1);h.w.SotaHeroVisualiser.release();h.clean();
});


browserTest('inline music layout keeps the hero live and view switching preserves the shared player',async t=>{
  const h=environment(t),host=hero(h);h.run('music-playlist.js');h.run('music-home.js');h.w.SotaPlaylist.mount(h.get('#app'));h.w.SotaMusicHome.mount(h.get('#app'));
  h.get('.sk-artwork-play').click();await tick();
  assert.equal(h.get('#sota-music-home').dataset.activeMusicView,'playlist');
  assert(h.get('#sk-music-playlist').classList.contains('sk-playlist-inline'));assert.equal(h.calls.plays.length,0);
  h.get('[data-track-index="0"]').click();await tick();const audio=h.get('#sota-playlist-audio');
  assert.equal(host.dataset.state,'live');assert.equal(h.calls.sources.length,1);assert.equal(h.frames.size,1);
  h.get('[data-music-view="visualiser"]').click();await tick();
  assert.equal(audio,h.get('#sota-playlist-audio'));assert.equal(audio.paused,false);assert.equal(host.dataset.state,'live');
  h.w.SotaMusicHome.stop();h.w.SotaPlaylist.pause();h.w.SotaHeroVisualiser.release();h.clean();
});
