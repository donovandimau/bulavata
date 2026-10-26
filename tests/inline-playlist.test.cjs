'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
let JSDOM;try{({JSDOM}=require('jsdom'));}catch{}
const source=fs.readFileSync(path.join(__dirname,'../music-playlist.js'),'utf8');
const catalog=require('../music-playlist.json');
const run=(name,fn)=>test(name,{skip:!JSDOM&&'Optional jsdom is not installed'},fn);
function fixture(){
  const dom=new JSDOM('<!doctype html><body><button data-playlist-open>Music</button><main id="app"><section hidden><div data-music-playlist-host></div></section></main></body>',{url:'https://sotakece.com/',runScripts:'outside-only'});
  const w=dom.window,d=w.document,state=new WeakMap();let plays=0,pauses=0;
  function media(node){if(!state.has(node))state.set(node,{paused:true});return state.get(node);}
  Object.defineProperty(w.HTMLMediaElement.prototype,'paused',{get(){return media(this).paused;}});
  Object.defineProperty(w.HTMLMediaElement.prototype,'ended',{get(){return false;}});
  w.HTMLMediaElement.prototype.play=function(){plays++;media(this).paused=false;this.dispatchEvent(new w.Event('play'));return Promise.resolve();};
  w.HTMLMediaElement.prototype.pause=function(){pauses++;media(this).paused=true;this.dispatchEvent(new w.Event('pause'));};
  w.HTMLDialogElement.prototype.show=function(){this.setAttribute('open','');this.dataset.mode='nonmodal';};
  w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');this.dataset.mode='modal';};
  w.HTMLDialogElement.prototype.close=function(){if(!this.open)return;this.removeAttribute('open');this.dataset.mode='closed';queueMicrotask(()=>{if(w.document)this.dispatchEvent(new w.Event('close'));});};
  w.customElements.define('dimau-music-visualiser',class extends w.HTMLElement{
    constructor(){super();this.settings={mode:'spectrum',gain:1};this.stopCount=0;this.wakeCount=0;}
    stop(){this.stopCount++;}wake(){this.wakeCount++;}
  });
  w.fetch=async()=>({ok:true,json:async()=>catalog});w.matchMedia=()=>({matches:true});
  w.eval(source);const api=w.SotaPlaylist,host=d.querySelector('[data-music-playlist-host]'),trigger=d.querySelector('[data-playlist-open]');
  api.mount(d);
  return {w,d,dom,api,host,trigger,counts:()=>({plays,pauses}),async ready(){for(let i=0;i<20&&!d.querySelector('[data-track-index]');i++)await new Promise(setImmediate);assert(d.querySelector('[data-track-index]'),'catalogue loaded');},close:()=>dom.window.close()};
}
async function playing(f){
  f.api.showInline(f.host);await f.ready();f.d.querySelector('[data-track-index="0"]').click();await new Promise(setImmediate);
  const audio=f.d.querySelector('audio');audio.currentTime=37;audio.volume=.4;audio.playbackRate=1.25;
  return audio;
}
run('inline, hidden, modal and repeated inline views share one playing audio and visualiser',async()=>{
  const f=fixture();try{
    const audio=await playing(f),dialog=f.d.querySelector('dialog'),visual=f.d.querySelector('dimau-music-visualiser');
    visual.settings={mode:'waveform',gain:1.7};const source=audio.src,counts=f.counts();
    f.api.showInline(f.host);f.api.showInline(f.host);
    assert.equal(f.api.isInline(),true);assert.equal(dialog.dataset.mode,'nonmodal');
    f.api.hideInline();await new Promise(setImmediate);
    assert.equal(dialog.parentNode,f.d.body);assert.equal(dialog.open,false);assert.equal(f.api.isInline(),false);assert(visual.stopCount>0);
    f.host.remove();f.api.open();assert.equal(dialog.dataset.mode,'modal');assert.equal(f.trigger.getAttribute('aria-haspopup'),'dialog');
    f.d.getElementById('app').append(f.host);f.api.showInline(f.host);await new Promise(setImmediate);
    assert.equal(dialog.parentNode,f.host);assert.equal(dialog.dataset.mode,'nonmodal');assert.equal(f.d.querySelectorAll('audio').length,1);
    assert.equal(f.d.querySelector('audio'),audio);assert.equal(audio.src,source);assert.equal(audio.currentTime,37);assert.equal(audio.volume,.4);assert.equal(audio.playbackRate,1.25);assert.equal(audio.paused,false);
    assert.deepEqual(f.counts(),counts);assert.equal(f.d.querySelector('dimau-music-visualiser'),visual);assert.deepEqual(visual.settings,{mode:'waveform',gain:1.7});
  }finally{f.close();}
});
run('detaching before app replacement retains playback and rejects a stale host',async()=>{
  const f=fixture();try{
    const audio=await playing(f),counts=f.counts();
    f.api.detachInline();f.d.getElementById('app').replaceChildren();
    assert.equal(f.api.showInline(f.host),null);assert.equal(f.d.querySelector('audio'),audio);
    const next=f.d.createElement('div');next.setAttribute('data-music-playlist-host','');f.d.getElementById('app').append(next);
    f.api.showInline(next);assert.equal(next.querySelector('audio'),audio);assert.equal(audio.currentTime,37);assert.equal(audio.paused,false);assert.deepEqual(f.counts(),counts);
    f.api.hideInline();f.api.hideInline();assert.equal(f.d.querySelectorAll('#sota-playlist-audio').length,1);
  }finally{f.close();}
});
run('open activates a hidden home playlist tab before displaying its inline player',async()=>{
  const f=fixture();try{
    let activations=0;
    f.host.parentNode.addEventListener('sota-playlist-inline-open',event=>{activations++;assert.equal(event.target,f.host);assert.equal(f.host.parentNode.hidden,true);f.host.parentNode.hidden=false;});
    f.trigger.click();await f.ready();
    assert.equal(activations,1);assert.equal(f.host.parentNode.hidden,false);assert.equal(f.api.isInline(),true);assert.equal(f.host.querySelector('dialog').dataset.mode,'nonmodal');assert.equal(f.trigger.hasAttribute('aria-haspopup'),false);
    assert.equal(f.d.activeElement,f.d.getElementById('sk-playlist-filter'));
  }finally{f.close();}
});
run('programmatic modal to inline transitions do not restore obsolete modal focus',async()=>{
  const f=fixture();try{
    f.host.remove();f.trigger.focus();f.api.open();await f.ready();
    const dialog=f.d.querySelector('dialog');assert.equal(dialog.dataset.mode,'modal');
    f.d.getElementById('app').append(f.host);f.api.showInline(f.host);f.d.getElementById('sk-playlist-filter').focus();await new Promise(setImmediate);
    assert.equal(f.d.activeElement,f.d.getElementById('sk-playlist-filter'));assert.equal(dialog.open,true);
    f.api.hideInline();await new Promise(setImmediate);assert.notEqual(f.d.activeElement,f.trigger);
  }finally{f.close();}
});
run('invalid initial hosts do not create an audio player',()=>{
  const f=fixture();try{
    assert.equal(f.api.showInline(null),null);assert.equal(f.api.showInline(f.d.createElement('div')),null);assert.equal(f.d.querySelector('audio'),null);
  }finally{f.close();}
});

run('the inline close control emits its view change while retaining the playing audio',async()=>{
  const f=fixture();try{
    const audio=await playing(f),counts=f.counts();let closed=0;
    f.host.addEventListener('sota-playlist-inline-close',()=>{closed++;f.api.hideInline();});
    f.d.querySelector('.sk-playlist-close').click();await new Promise(setImmediate);
    assert.equal(closed,1);assert.equal(f.api.isInline(),false);assert.equal(f.d.querySelector('#sota-playlist-audio'),audio);assert.equal(audio.paused,false);assert.equal(audio.currentTime,37);assert.deepEqual(f.counts(),counts);
  }finally{f.close();}
});
