'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
let JSDOM;try{({JSDOM}=require(process.env.JSDOM_MODULE||'jsdom'));}catch(_){}
const browserTest=(name,fn)=>test(name,{skip:!JSDOM?'Install jsdom or set JSDOM_MODULE to run music home integration':false},fn);
const root=path.join(__dirname,'..');
const source=name=>fs.readFileSync(path.join(root,name),'utf8');
const flush=async()=>{for(let i=0;i<4;i++)await new Promise(resolve=>setImmediate(resolve));};
const markup=`<section id="sota-music-home" aria-label="Your music">
  <section id="bv-music"><img src="/assets/fiji-music.jpg" alt="Friends sharing music"><button type="button" id="bv-home-play" data-playlist-open>Choose a song</button></section>
  <div role="tablist" aria-label="Music views">
    <button type="button" role="tab" id="music-view-visualiser" data-music-view="visualiser" aria-controls="music-panel-visualiser" aria-selected="true" tabindex="0">Visualiser</button>
    <button type="button" role="tab" id="music-view-playlist" data-music-view="playlist" aria-controls="music-panel-playlist" aria-selected="false" tabindex="-1">Playlist</button>
  </div>
  <section role="tabpanel" id="music-panel-visualiser" data-music-panel="visualiser" aria-labelledby="music-view-visualiser"><div class="sk-music-stage">Audio visuals</div></section>
  <section role="tabpanel" id="music-panel-playlist" data-music-panel="playlist" aria-labelledby="music-view-playlist" hidden><div data-music-playlist-host></div></section>
</section>`;
function harness(t){
  const dom=new JSDOM('<!doctype html><html><body><main id="app">'+markup+'</main></body></html>',{url:'https://sotakece.com/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,d=w.document,app=d.querySelector('#app'),calls={show:[],hide:0,detach:0,pause:0};
  w.SotaPlaylist={showInline(host){calls.show.push(host);return Promise.resolve();},hideInline(){calls.hide++;},detachInline(){calls.detach++;},pause(){calls.pause++;throw new Error('View navigation must never pause playback');}};
  w.eval(source('music-home.js'));const api=w.SotaMusicHome;
  const get=selector=>d.querySelector(selector),tab=view=>get('[data-music-view="'+view+'"]'),panel=view=>get('[data-music-panel="'+view+'"]');
  const mount=()=>api.mount(app);
  const selected=view=>{for(const candidate of ['visualiser','playlist']){const active=candidate===view;assert.equal(tab(candidate).getAttribute('aria-selected'),String(active));assert.equal(tab(candidate).tabIndex,active?0:-1);assert.equal(panel(candidate).hidden,!active);}};
  const key=(view,key)=>{const event=new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true});tab(view).dispatchEvent(event);return event;};
  t.after(()=>{api.stop();dom.window.close();});return {w,d,app,api,calls,get,tab,panel,mount,selected,key};
}

browserTest('music home starts on the visualiser with one active tab and a hidden playlist panel',t=>{
  const h=harness(t);h.mount();h.selected('visualiser');assert.equal(h.calls.show.length,0,'Mounting the page does not open or load the playlist');assert.equal(h.calls.pause,0);
  const tabs=[...h.get('[role="tablist"]').querySelectorAll('[role="tab"]')];assert.equal(tabs.length,2);for(const tab of tabs){assert.equal(h.d.getElementById(tab.getAttribute('aria-controls')).getAttribute('aria-labelledby'),tab.id);}
});

browserTest('playlist and visualiser tabs swap the inline view without pausing or duplicating the music player',async t=>{
  const h=harness(t);h.mount();const hiddenBefore=h.calls.hide;h.tab('playlist').click();await flush();h.selected('playlist');assert.equal(h.calls.show.length,1);assert.equal(h.calls.show[0],h.get('[data-music-playlist-host]'));
  h.tab('visualiser').click();await flush();h.selected('visualiser');assert.equal(h.calls.hide-hiddenBefore,1);assert.equal(h.calls.pause,0);assert.equal(h.app.querySelectorAll('[data-music-playlist-host]').length,1);
});

browserTest('the inline-open event selects Playlist without recursively opening the player again',async t=>{
  const h=harness(t);h.mount();const host=h.get('[data-music-playlist-host]');host.dispatchEvent(new h.w.CustomEvent('sota-playlist-inline-open',{bubbles:true}));await flush();h.selected('playlist');assert.equal(h.calls.show.length,0);
  host.dispatchEvent(new h.w.CustomEvent('sota-playlist-inline-open',{bubbles:true}));await flush();assert.equal(h.calls.show.length,0,'Repeated player state events are handled as selection updates');assert.equal(h.calls.pause,0);
});

browserTest('arrow keys wrap, Home and End select the correct tab and focus follows the active view',async t=>{
  const h=harness(t);h.mount();h.tab('visualiser').focus();
  assert(h.key('visualiser','ArrowRight').defaultPrevented);await flush();h.selected('playlist');assert.equal(h.d.activeElement,h.tab('playlist'));
  h.key('playlist','ArrowRight');await flush();h.selected('visualiser');assert.equal(h.d.activeElement,h.tab('visualiser'));
  h.key('visualiser','ArrowLeft');await flush();h.selected('playlist');assert.equal(h.d.activeElement,h.tab('playlist'));
  h.key('playlist','Home');await flush();h.selected('visualiser');assert.equal(h.d.activeElement,h.tab('visualiser'));
  h.key('visualiser','End');await flush();h.selected('playlist');assert.equal(h.d.activeElement,h.tab('playlist'));assert.equal(h.calls.pause,0);
});

browserTest('stop detaches the inline player and removes handlers while preserving playback',async t=>{
  const h=harness(t);h.mount();h.tab('playlist').click();await flush();const shows=h.calls.show.length,detaches=h.calls.detach;h.api.stop();assert.equal(h.calls.detach-detaches,1);
  h.tab('visualiser').click();h.tab('playlist').click();h.get('[data-music-playlist-host]').dispatchEvent(new h.w.CustomEvent('sota-playlist-inline-open',{bubbles:true}));h.key('visualiser','End');await flush();assert.equal(h.calls.show.length,shows,'Detached tab handlers cannot open the playlist');assert.equal(h.calls.pause,0);
});

browserTest('remounting keeps one click handler per tab and does not recreate or pause audio',async t=>{
  const h=harness(t);h.mount();h.mount();h.mount();const before=h.calls.show.length;h.tab('playlist').click();await flush();assert.equal(h.calls.show.length-before,1);assert.equal(h.calls.pause,0);assert.equal(h.app.querySelectorAll('#bv-music').length,1);
});

test('the real welcome template groups the one music photo before the tab strip and visualiser stage',()=>{
  const studio=source('skin-studio.js'),artwork=studio.indexOf('<div class="sk-hero-artwork">'),group=studio.indexOf('id="sota-music-home"',artwork),photo=studio.indexOf('id="bv-music"',group),tabs=studio.indexOf('role="tablist"',photo),stage=studio.indexOf('class="sk-music-stage"',tabs);
  assert(artwork>=0&&group>artwork&&photo>group&&tabs>photo&&stage>tabs,'Supplied hero → music group → music photograph → tab strip → visualiser');
  assert.equal((studio.match(/\bid="bv-music"/g)||[]).length,1);assert.equal((studio.match(/src="\/assets\/fiji-music\.jpg"/g)||[]).length,1,'The original music photograph is moved, not duplicated');
  const feature=studio.slice(studio.lastIndexOf('<section',photo),studio.indexOf('</section>',photo));assert.equal((feature.match(/\bid="bv-home-play"/g)||[]).length,1);assert.equal((feature.match(/\bdata-playlist-open\b/g)||[]).length,1,'The photo retains one music-play action');
  assert.match(studio,/SotaMusicHome\?\.mount\(app\)/);
});

browserTest('the actual grouped music markup links both tabs to their labelled panels',()=>{
  const studio=source('skin-studio.js'),group=studio.indexOf('id="sota-music-home"');assert(group>=0);const start=studio.lastIndexOf('<section',group),end=studio.indexOf('</section><main',group);assert(start>=0&&end>start);
  const fragment=JSDOM.fragment(studio.slice(start,end)),music=fragment.querySelector('#sota-music-home');assert(music);const tabs=[...music.querySelectorAll('[role="tab"]')];assert.equal(tabs.length,2);
  for(const tab of tabs){const panel=music.querySelector('[id="'+tab.getAttribute('aria-controls')+'"]');assert(panel,'A tab controls a real panel');assert.equal(panel.getAttribute('role'),'tabpanel');assert.equal(panel.getAttribute('aria-labelledby'),tab.id);}
  assert.equal(music.querySelectorAll('#bv-music').length,1);assert.equal(music.querySelectorAll('[data-music-playlist-host]').length,1);
});
