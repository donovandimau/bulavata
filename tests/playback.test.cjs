'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

function environment(){
  const captures=new Map(),globalListeners=new Map();
  let document;
  class Element{
    constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.attributes=new Map();this.dataset={};this.listeners=new Map();this.classList={toggle(){},add(){},remove(){}};this.paused=true;this.ended=false;this.playCalls=0;this.pauseCalls=0;this.value='';}
    append(...nodes){for(const node of nodes){node.parentElement=this;this.children.push(node);}}
    replaceChildren(...nodes){this.children.forEach(node=>node.parentElement=null);this.children=[];this.append(...nodes);}
    get firstChild(){return this.children[0];}
    setAttribute(key,value){this.attributes.set(key,String(value));if(key==='id')this.id=String(value);if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=String(value);}
    getAttribute(key){return this.attributes.get(key)||null;}
    removeAttribute(key){this.attributes.delete(key);}
    addEventListener(type,fn){const fns=this.listeners.get(type)||[];fns.push(fn);this.listeners.set(type,fns);}
    emit(type){const event={type,target:this};for(const fn of captures.get(type)||[])fn(event);for(const fn of this.listeners.get(type)||[])fn(event);}
    querySelectorAll(selector){
      const matches=node=>selector.split(',').some(part=>{part=part.trim();if(part.startsWith('#'))return node.id===part.slice(1);if(part.startsWith('[')){const attr=part.match(/^\[([^\]]+)\]/)[1];return node.attributes.has(attr)||attr.startsWith('data-')&&Object.hasOwn(node.dataset,attr.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase()));}return node.tagName===part.toUpperCase();});
      const result=[];const walk=node=>{for(const child of node.children){if(matches(child))result.push(child);walk(child);}};walk(this);return result;
    }
    querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
    play(){this.playCalls++;this.paused=false;this.emit('play');return Promise.resolve();}
    pause(){this.pauseCalls++;if(!this.paused){this.paused=true;this.emit('pause');}}
    load(){}
    showModal(){this.open=true;}
    focus(){}
    get isConnected(){return this===document.body||!!this.parentElement?.isConnected;}
  }
  document={body:new Element('body'),activeElement:null,createElement:tag=>new Element(tag),querySelectorAll:selector=>document.body.querySelectorAll(selector),addEventListener(type,fn){const fns=captures.get(type)||[];fns.push(fn);captures.set(type,fns);}};
  const records=[{id:'local-song',title:'Local song',size:100,addedAt:1,blob:{}}];
  const indexedDB={open(){const request={};queueMicrotask(()=>{request.result={close(){},transaction(){const tx={objectStore(){return {getAll(){const read={};queueMicrotask(()=>{read.result=records;read.onsuccess();queueMicrotask(()=>tx.oncomplete());});return read;}};}};return tx;}};request.onsuccess();});return request;}};
  const context=vm.createContext({document,indexedDB,queueMicrotask,URL:{createObjectURL:()=> 'blob:local-song',revokeObjectURL(){}},localStorage:{getItem:()=>null,setItem(){},removeItem(){}},CustomEvent:class{constructor(type){this.type=type;}},addEventListener(type,fn){globalListeners.set(type,fn);},dispatchEvent(event){globalListeners.get(event.type)?.(event);},fetch:async()=>({ok:true,json:async()=>require('../music-playlist.json')}),setTimeout,clearTimeout});
  const run=file=>vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context,{filename:file});
  return {context,document,run,makeAudio(source){const audio=document.createElement('audio');if(source)audio.setAttribute('data-sota-playback-source',source);document.body.append(audio);return audio;}};
}

(async()=>{
  const env=environment();env.run('playback.js');const coordinator=env.context.SotaPlayback;
  let sampleStops=0,localStops=0,playlistStops=0;
  const removeSample=coordinator.register('sample',()=>sampleStops++);
  coordinator.register('local',()=>localStops++);coordinator.register('playlist',()=>playlistStops++);
  assert.deepEqual([sampleStops,localStops,playlistStops],[0,0,0],'registering a source must not start or stop playback');
  coordinator.activate('local');assert.deepEqual([sampleStops,localStops,playlistStops],[1,0,1],'activating a source pauses its peers without pausing itself');
  const profileA=env.makeAudio(),profileB=env.makeAudio(),localAudio=env.makeAudio('local');
  await profileA.play();await profileB.play();assert(profileA.paused);assert(!profileB.paused,'native profile controls pause an earlier profile track');
  await localAudio.play();assert(profileB.paused);assert(!localAudio.paused,'native local controls retain the newly playing audio');
  coordinator.activate('sample');assert(localAudio.paused,'a WebAudio sample activation stops DOM audio');
  removeSample();const before=sampleStops;coordinator.activate('playlist');assert.equal(sampleStops,before,'unregistered callbacks are not invoked');
  let safeStops=0;coordinator.register('broken',()=>{throw Error('Unavailable player');});coordinator.register('reentrant',()=>coordinator.activate('reentrant'));coordinator.register('safe',()=>safeStops++);
  coordinator.activate('sample');assert.equal(safeStops,1,'a failed or reentrant pause callback cannot block the remaining sources');

  const integrated=environment();integrated.run('playback.js');let stoppedSample=0,legacyLocalStops=0;
  integrated.context.SotaPlayback.register('sample',()=>stoppedSample++);
  integrated.run('local-music.js');integrated.run('music-playlist.js');
  integrated.context.SotaLocalMusic.mount(integrated.document.body,{beforePlay:()=>legacyLocalStops++});
  await integrated.context.SotaLocalMusic.open();
  const local=integrated.document.querySelectorAll('audio')[0];
  assert.equal(local.getAttribute('data-sota-playback-source'),'local');assert.equal(local.playCalls,0,'opening local music never starts it');
  await local.play();assert(!local.paused);assert(stoppedSample>0);assert.equal(legacyLocalStops,0,'native local controls coordinate without invoking the self-pausing legacy beforePlay callback');
  integrated.context.SotaPlaylist.open();await new Promise(resolve=>setImmediate(resolve));
  const playlist=integrated.document.querySelectorAll('audio').find(audio=>audio!==local);
  assert.equal(playlist.getAttribute('data-sota-playback-source'),'playlist');assert.equal(playlist.playCalls,0,'opening the playlist never starts it');
  await playlist.play();assert(local.paused);assert(!playlist.paused);
  integrated.context.SotaPlayback.pauseSource('profile');assert(!playlist.paused,'leaving a profile preserves background playlist playback');
  await local.play();assert(playlist.paused);assert(!local.paused,'switching back through native controls keeps only local audio playing');
  const profile=integrated.makeAudio();await profile.play();assert(local.paused);assert(playlist.paused);assert(!profile.paused);
  integrated.document.body.children=integrated.document.body.children.filter(child=>child!==profile);profile.parentElement=null;
  integrated.context.SotaPlayback.pauseSource('profile');assert(profile.paused,'leaving a profile pauses its detached track');
  await profile.play();await local.play();assert(profile.paused,'a detached profile track is still paused when another source starts');
  integrated.document.body.append(profile);await profile.play();
  integrated.context.SotaPlayback.activate('sample');assert(profile.paused,'sample playback also stops a profile track');
  console.log('PASS: playback source isolation, native local/playlist/profile controls, sample coordination, no autoplay, callback failures, unregister and reentrant pause protection.');
})().catch(error=>{console.error(error);process.exitCode=1;});
