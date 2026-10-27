'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
let JSDOM;try{({JSDOM}=require(process.env.JSDOM_MODULE||'jsdom'));}catch(_){}
const browserTest=(name,fn)=>test(name,{skip:!JSDOM?'Install jsdom or set JSDOM_MODULE to run front page routing integration':false},fn);
const root=path.join(__dirname,'..');
const fixture=`<main id="app" class="bv-welcome">
 <header class="sk-site-header"><a href="/" class="sk-site-brand">Sota Kece</a><button data-playlist-open>Music</button></header>
 <section class="sk-original-front"><div class="sk-hero-artwork"><picture><img class="sk-original-design" alt="Your room"></picture><section class="sota-social-hero"><button data-social-panel="wall">Talanoa</button><button data-social-panel="mates">Top Mates</button></section><button class="sk-hero-create">Create your space</button><button class="spp-hero-edit" data-profile-photo-edit>Edit profile</button><button class="sk-artwork-play" data-playlist-open>Play</button></div>
  <section id="sota-music-home" class="sota-music-home"><section class="bv-music-feature" id="bv-music"><img alt="Island music"><div class="bv-music-copy"><h1>Viti roots. Volume up.</h1><p>Music explanatory paragraph.</p><div class="bv-music-actions"><button data-playlist-open>Try a sample</button><button data-local-music-open>Upload music</button></div></div></section>
   <div class="sota-music-views"><div class="sota-music-view-tabs"><button data-music-view="visualiser">Visualiser</button><button data-music-view="playlist">Playlist</button></div><div id="music-panel-visualiser" class="sota-music-view-panel" data-music-panel="visualiser"><section class="sk-music-stage"><header class="sk-music-stage-heading"><h2>Your soundtrack, in colour.</h2><button data-playlist-open>Choose a song</button></header><div class="sk-music-stage-picture"><canvas id="music-canvas"></canvas></div><footer class="sk-music-stage-footer"><p data-stage-status>Song status</p><div class="sk-music-stage-controls"><select data-stage-mode><option value="halo">Halo</option><option value="spectrum">Spectrum</option></select><button data-stage-motion>Pause visuals</button></div></footer></section></div><div class="sota-music-view-panel" data-music-panel="playlist" hidden><div data-music-playlist-host><input id="playlist-search" value="Keep this track search"><audio id="active-audio"></audio></div></div></div>
  </section>
 </section>
 <section class="bv-neon-section"><div class="bv-classic"><header class="bv-classic-header bv-connect-header"><h2>Bring your whole world together.</h2><div class="bv-entry-account-actions"><button id="sk-sign-up">Sign up</button><button id="sk-sign-in">Sign in</button></div><section class="bv-entry-invite"><button id="sk-share-app">Share app</button></section><form class="bv-home-search"><input id="bv-find-mate" value="my_mate"><input type="file" id="pending-upload"></form></header>
 <nav class="bv-home-section-nav"><a href="#bv-music">Music legacy</a><a href="#sota-connections">World legacy</a><a href="#bv-circle">Talanoa legacy</a><a href="#bv-your-room">Skins legacy</a></nav>
 <dialog id="bv-entry" class="bv-account-dialog"><input id="auth-email" value="owner@example.test"></dialog>
 <section id="bv-circle" class="bv-social-stage"><section class="bv-circle-feature"><div class="bv-circle-art"><img alt="Talanoa Circle"></div><h2>Same circle. New stories.</h2><p>Pull up a seat.</p><button class="bv-circle-explore">Explore Our Talanoa Circle</button></section></section>
 <section id="sota-connections" class="sc-friends"><header class="scf-heading"><h2>Your world, connected.</h2><p>Every life has a connection.</p></header><div class="slc"><div class="slc-map"><div class="lg3d"><div class="lg3d-stage" data-lg3d-stage><canvas data-lg3d-canvas></canvas><div class="lg3d-labels"></div><div class="lg3d-controls"><button data-lg3d-zoom-in>+</button></div><select class="lg3d-background"><option>Galaxy</option></select></div><details class="lg3d-outline"><summary>Connection list</summary></details></div></div><div class="slc-details"><input id="living-name" value="Mere"><button class="slc-add">Add</button></div><div class="slc-storage">Saved on this device</div></div></section>
 <section id="bv-your-room" class="bv-discovery"><header><h2>Where you belong.</h2><p>Your school. Your vanua.</p><button class="bv-discovery-all">Explore all skins</button></header><div class="bv-collection-grid"><button class="bv-collection-card" data-collection="school"><img alt="School pride"><strong>School pride</strong><small>8 skins</small></button><button class="bv-collection-card" data-collection="music"><img alt="Music crowd"><strong>The music crowd</strong><small>6 skins</small></button></div><p class="bv-discovery-note">Original cover artwork.</p></section>
 <footer class="bv-classic-footer">Sota Kece · alive together</footer></div></section>
</main>`;
function harness(t,hash=''){
 const dom=new JSDOM('<!doctype html><html><head></head><body>'+fixture+'</body></html>',{url:'https://sotakece.com/'+hash,runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document,app=d.querySelector('#app');
 const scrollCalls=[];w.scrollTo=value=>scrollCalls.push(value);w.history.scrollRestoration='auto';w.HTMLElement.prototype.scrollIntoView=function(){};
 let pauses=0,previews=0;w.SotaPlaylist={pause(){pauses++;}};w.SotaKavaUI={preview(){previews++;}};
 w.eval(fs.readFileSync(path.join(root,'front-pages.js'),'utf8'));
 const style=d.createElement('style');style.textContent=fs.readFileSync(path.join(root,'front-pages.css'),'utf8');d.head.append(style);
 const api=w.SotaFrontPages;api.mount(app);
 t.after(()=>{api.stop();w.close();});
 const visible=element=>{let node=typeof element==='string'?d.querySelector(element):element;if(!node)return false;for(;node&&node.nodeType===1;node=node.parentElement)if(node.hidden||w.getComputedStyle(node).display==='none'||w.getComputedStyle(node).visibility==='hidden')return false;return true;};
 return {w,d,app,api,visible,scrollCalls,get pauses(){return pauses;},get previews(){return previews;}};
}

browserTest('home becomes a visual gallery and moves account, share and search controls into Connect',t=>{
 const h=harness(t);
 assert.equal(h.app.dataset.frontPage,'home');assert.equal(h.visible('.bv-connect-header'),false);assert.equal(h.visible('.bv-home-section-nav'),false);
 for(const selector of ['.sk-hero-artwork','#sota-music-home .bv-music-feature','#music-canvas','[data-lg3d-canvas]','#bv-circle','#bv-your-room'])assert(h.visible(selector),selector+' remains a front-page visual');
 assert.equal(h.visible('.bv-music-actions'),false);assert.equal(h.visible('.sk-music-stage-controls'),false);assert.equal(h.visible('.slc-details'),false);assert.equal(h.visible('.lg3d-controls'),false);
 h.api.open('connect');assert.equal(h.w.location.hash,'#connect');assert(h.visible('.bv-connect-header'));assert.equal(h.visible('#sota-music-home'),false);assert.equal(h.visible('#sota-connections'),false);
 assert.equal(h.d.querySelector('#auth-email').value,'owner@example.test','Account dialog state remains available on its detail page');
});

browserTest('every front-page visual has a native detail anchor without swallowing existing photo controls',t=>{
 const h=harness(t);
 const routes=[['.sk-hero-artwork','#profile'],['.bv-music-feature','#music'],['.sk-music-stage-picture','#music'],['[data-lg3d-stage]','#world'],['.bv-circle-feature','#talanoa']];
 for(const [selector,href] of routes){const target=h.d.querySelector(selector),link=target.querySelector('a[href="'+href+'"]');assert(link,selector+' has a real '+href+' link');assert(link.textContent.trim()||link.getAttribute('aria-label'),'Visual links have accessible names');assert.equal(link.querySelector('button,input,select'),null,'Native anchors must not wrap active controls');assert(link.querySelector('.sfp-visual-symbol svg'),'Every artwork detail action uses a glass symbol');assert.equal(link.querySelector('.sfp-visual-symbol').getAttribute('aria-hidden'),'true');assert.equal(link.hasAttribute('data-sota-icon'),false,'The whole artwork remains the link hit area');}
 const edit=h.d.querySelector('[data-profile-photo-edit]');assert.equal(edit.closest('a'),null);assert(h.visible(edit));
 const header=h.d.querySelector('.sk-site-header');assert(header.nextElementSibling.querySelector('a[href="#home"]'),'Compact navigation immediately follows the masthead');
});

browserTest('Home keeps the printed Create action live while restoring social controls on Profile',t=>{
 const h=harness(t),social=h.d.querySelector('.sota-social-hero'),create=h.d.querySelector('.sk-hero-create'),edit=h.d.querySelector('.spp-hero-edit'),music=h.d.querySelector('.sk-artwork-play');
 assert(social.hasAttribute('inert'));assert.equal(create.hasAttribute('inert'),false);
 assert.equal(edit.closest('[inert]'),null);assert.equal(music.closest('[inert]'),null);
 h.api.open('profile');assert.equal(social.hasAttribute('inert'),false);assert.equal(create.hasAttribute('inert'),false);assert(h.visible(social));assert(h.visible(create));
 h.api.open('home');assert(social.hasAttribute('inert'));assert.equal(create.hasAttribute('inert'),false);
 h.api.stop();assert.equal(social.hasAttribute('inert'),false);assert.equal(create.hasAttribute('inert'),false);
});

browserTest('detail routes reveal the existing full controls and keep unrelated sections out of view',t=>{
 const h=harness(t),cases=[['music','#sota-music-home','.bv-music-actions'],['world','#sota-connections','.slc-details'],['skins','#bv-your-room','.bv-discovery-all'],['talanoa','#bv-circle','.bv-circle-explore'],['profile','.sk-hero-artwork','[data-profile-photo-edit]']];
 for(const [view,section,control] of cases){h.api.open(view);assert.equal(h.app.dataset.frontPage,view);assert.equal(h.w.location.hash,'#'+view);assert(h.visible(section),view+' content is visible');assert(h.visible(control),view+' controls are visible');if(view!=='music')assert.equal(h.visible('#sota-music-home'),false,view+' does not retain the music page');}
 assert.equal(h.previews,0,'Routing to Talanoa must not auto-open or replace the app with its separate preview');
 assert([...h.app.querySelectorAll('a[href="#home"]')].some(a=>/back/i.test(a.textContent+' '+a.getAttribute('aria-label'))),'Detail routes have a Back to home link');
});

browserTest('detail pages keep one reachable X in sticky navigation without stopping music',t=>{
 const h=harness(t),close=h.d.querySelector('[data-front-pages="close"]'),audio=h.d.querySelector('#active-audio');audio.currentTime=42;
 assert.equal(h.visible(close),false);assert.equal(h.w.history.scrollRestoration,'manual');
 for(const view of ['music','world','connect','talanoa','skins','profile']){
  h.api.open(view);assert(h.visible(close));assert.equal(close.getAttribute('href'),'#home');assert.match(close.getAttribute('aria-label'),/Close .+ and return to home/);
  const style=h.w.getComputedStyle(close);assert.equal(style.position,'relative');assert.equal(close.parentElement,h.d.querySelector('.sfp-navigation'));assert.equal(h.w.getComputedStyle(close.parentElement).position,'sticky','Close stays reachable inside the navigation layout');assert(parseFloat(style.minWidth)>=44);assert(parseFloat(style.minHeight)>=44);
  h.d.documentElement.style.scrollBehavior='smooth';h.d.documentElement.scrollTop=2400;h.d.body.scrollTop=1800;close.click();
  assert.equal(h.app.dataset.frontPage,'home');assert.equal(h.w.location.hash,'#home');assert.equal(h.visible(close),false);assert.equal(h.d.documentElement.scrollTop,0);assert.equal(h.d.body.scrollTop,0);assert.equal(h.d.documentElement.style.scrollBehavior,'smooth','The user scroll preference is restored');
  const last=h.scrollCalls.at(-1);assert.equal(last.top,0);assert.equal(last.left,0);assert.equal(last.behavior,'instant');
  assert.equal(h.d.activeElement,h.d.querySelector('[data-front-pages="navigation"] [data-front-view="home"]'),'Focus returns to the visible Home link');
  assert.equal(h.d.querySelector('#active-audio'),audio);assert.equal(audio.currentTime,42);assert.equal(h.pauses,0);
 }
 h.api.stop();assert.equal(h.d.querySelector('[data-front-pages="close"]'),null);assert.equal(h.w.history.scrollRestoration,'auto');
});

browserTest('route changes never leave duplicate panel exits over content',t=>{
 const h=harness(t);
 for(const view of ['music','world','connect','talanoa','skins','profile']){
  h.api.open(view);assert.equal(h.d.querySelectorAll('[data-front-pages="panel-close"]').length,0);
  const exits=[...h.d.querySelectorAll('[data-front-pages="close"]')].filter(h.visible);assert.equal(exits.length,1);
  exits[0].click();assert.equal(h.app.dataset.frontPage,'home');assert.equal(h.pauses,0);
 }
});

browserTest('navigation preserves the same canvas, playlist, draft fields and native event listeners',t=>{
 const h=harness(t),canvas=h.d.querySelector('[data-lg3d-canvas]'),music=h.d.querySelector('#sota-music-home'),audio=h.d.querySelector('#active-audio'),search=h.d.querySelector('#playlist-search'),mate=h.d.querySelector('#bv-find-mate');
 let clicks=0;const button=h.d.querySelector('.bv-discovery-all'),upload=h.d.querySelector('#pending-upload'),files=[new h.w.File(['same bytes'],'still-selected.png',{type:'image/png'})];Object.defineProperty(upload,'files',{configurable:true,value:files});button.addEventListener('click',()=>clicks++);search.value='My playing track';mate.value='Keep this mate';canvas.dataset.liveRenderer='preserved';audio.currentTime=42;
 for(const view of ['music','world','connect','skins','profile','home'])h.api.open(view);
 assert.equal(h.d.querySelector('[data-lg3d-canvas]'),canvas);assert.equal(h.d.querySelector('#sota-music-home'),music);assert.equal(h.d.querySelector('#active-audio'),audio);assert.equal(h.d.querySelector('#playlist-search'),search);
 assert.equal(search.value,'My playing track');assert.equal(mate.value,'Keep this mate');assert.equal(canvas.dataset.liveRenderer,'preserved');assert.equal(audio.currentTime,42);assert.equal(h.d.querySelector('#pending-upload'),upload);assert.equal(upload.files,files);h.api.open('skins');button.click();assert.equal(clicks,1);assert.equal(h.pauses,0,'Routing must not pause or recreate the audio owner');
});

browserTest('skin collections retain their labelled native actions without duplicate overlays or empty wrappers',t=>{
 const h=harness(t),grid=h.d.querySelector('.bv-collection-grid'),cards=[...grid.querySelectorAll('.bv-collection-card')];let selected;
 for(const card of cards){card.addEventListener('click',()=>{selected=card.dataset.collection;});assert.equal(card.hasAttribute('inert'),false);assert.equal(card.parentElement,grid);assert(card.querySelector('strong').textContent.trim());}
 assert.equal(grid.querySelector('.sfp-skin-tile,a[href="#skins"]'),null);
 cards[1].click();assert.equal(selected,'music','Home keeps the original category callback');
 assert(h.visible('.bv-discovery-all'),'The all-skins action has a visible text label on Home');
 h.api.open('skins');cards[0].click();assert.equal(selected,'school');
 h.api.open('home');assert(cards.every(card=>!card.hasAttribute('inert')));h.api.stop();assert(cards.every(card=>card.parentElement===grid));
});

browserTest('initial hashes, legacy visual links and browser Back select the matching detail view',async t=>{
 const h=harness(t,'#world');assert.equal(h.app.dataset.frontPage,'world');
 const cases=[['#bv-music','music'],['#sota-connections','world'],['#bv-circle','talanoa'],['#bv-your-room','skins']];
 for(const [hash,view] of cases){h.d.querySelector('.bv-home-section-nav a[href="'+hash+'"]').click();assert.equal(h.app.dataset.frontPage,view);assert.equal(h.w.location.hash,'#'+view);}
 h.api.open('home');h.api.open('music');h.api.open('world');
 h.d.documentElement.scrollTop=1800;h.d.body.scrollTop=900;
 const changed=new Promise(resolve=>h.w.addEventListener('hashchange',resolve,{once:true}));h.w.history.back();await changed;
 assert.equal(h.w.location.hash,'#music');assert.equal(h.app.dataset.frontPage,'music');assert.equal(h.d.documentElement.scrollTop,0);assert.equal(h.d.body.scrollTop,0);
});

browserTest('inline playlist opening enters the Music page before the music component receives its event',t=>{
 const h=harness(t),host=h.d.querySelector('[data-music-playlist-host]');let observed;
 host.addEventListener('sota-playlist-inline-open',()=>{observed=h.app.dataset.frontPage;});
 host.dispatchEvent(new h.w.CustomEvent('sota-playlist-inline-open',{bubbles:true}));
 assert.equal(observed,'music');assert.equal(h.w.location.hash,'#music');assert(h.visible('#sota-music-home'));
});

browserTest('stop and remount remove only router-owned UI and leave page state and playback untouched',t=>{
 const h=harness(t),canvas=h.d.querySelector('[data-lg3d-canvas]'),originalHero=h.d.querySelector('.sk-original-design'),dialog=h.d.querySelector('#bv-entry');
 h.api.open('connect');h.api.stop();assert.equal(h.app.dataset.frontPage,undefined);assert.equal(h.d.querySelector('[data-lg3d-canvas]'),canvas);assert.equal(h.d.querySelector('.sk-original-design'),originalHero);assert.equal(h.d.querySelector('#bv-entry'),dialog);assert.equal(h.pauses,0);
 assert.equal(h.d.querySelector('.sk-site-header').nextElementSibling.className,'sk-original-front','Added navigation is removed');
 assert.equal(h.d.querySelector('.sk-hero-artwork a[href="#profile"]'),null);assert.equal(h.d.querySelector('[data-lg3d-stage] a[href="#world"]'),null);
 h.w.history.replaceState(null,'','#world');h.w.dispatchEvent(new h.w.HashChangeEvent('hashchange'));assert.equal(h.app.dataset.frontPage,undefined,'Stopped global listeners do not mutate the page');
 h.api.mount(h.app);assert.equal(h.app.dataset.frontPage,'world');h.api.mount(h.app);assert.equal(h.d.querySelectorAll('[data-front-pages="navigation"]').length,1,'Remount replaces its own navigation rather than duplicating it');
});
