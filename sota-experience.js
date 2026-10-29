/* A shared, responsive front door to Sota Kece's existing features. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.SotaExperience=api;})(typeof globalThis==='object'?globalThis:this,function(root){
  'use strict';
  const routes=[['home','Home','pulse'],['people','People','friends'],['talanoa','Talanoa','crews'],['music','Music','music'],['profile','My space','room']];
  const paths={home:'M3 10 12 3l9 7v11h-6v-7H9v7H3Z',people:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',talanoa:'M21 11a8 8 0 0 1-8 8H7l-5 3 2-6a8 8 0 1 1 17-5ZM7 10h10M7 14h6',music:'M9 18V5l12-2v13M9 8l12-2M9 18a3 2 0 1 1-6 0 3 2 0 0 1 6 0M21 16a3 2 0 1 1-6 0 3 2 0 0 1 6 0',profile:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 22v-2a8 8 0 0 1 16 0v2'};
  const aliases={'':'home',welcome:'home',connect:'people','bv-music':'music','sota-music-home':'music','bv-circle':'talanoa','bv-your-room':'skins','sota-connections':'world'};
  const validPages=new Set([...routes.map(r=>r[0]),'skins','world']);
  const titles={home:['YOUR DAILY CONNECTION','Bula. Make yourself at home.'],people:['GOOD PEOPLE. CLOSE CONNECTIONS.','Your people, closer.'],talanoa:['A LITTLE TIME TOGETHER','Pull up a seat.'],music:['YOUR ISLAND SOUNDTRACK','Find your rhythm.'],profile:['A LITTLE MORE YOU','Your space. Your rules.'],skins:['COLOUR. CULTURE. PERSONALITY.','Make it feel like you.'],world:['A DIFFERENT PERSPECTIVE','Your world, connected.']};
  let config={},session=null;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=key=>`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[key]||paths.home}"/></svg>`;
  const brand=()=>`<a class="sx-brand" href="#home"><img src="/assets/sota-kece-logo-20261020.svg" width="44" height="44" alt=""><span>Sota Kece<small>alive together</small></span></a>`;
  function nav(member=false,tab='home',pending=0){return `<nav class="sx-nav" aria-label="Main navigation">${routes.map(([key,label,target])=>`<${member?'button type="button"':'a'} ${member?`data-sx-member="${target}"`:`href="#${key}" data-sx-route="${key}"`} aria-current="${tab===(member?target:key)?'page':'false'}">${icon(key)}<span>${label}</span>${key==='people'&&pending?`<b class="sx-count" aria-label="${pending} pending requests">${pending}</b>`:''}</${member?'button':'a'}>`).join('')}</nav>`;}
  function stop(){if(session){session.listeners.forEach(remove=>remove());session=null;}root.document?.body.classList.remove('sx-enabled','sx-guest','sx-member');}
  function start(app,member){stop();root.SotaIconControls?.stop();root.document.body.classList.add('sx-enabled',member?'sx-member':'sx-guest');app.classList.add('sx-app');session={app,listeners:[],member};return session;}
  function listen(s,node,event,fn){node.addEventListener(event,fn);s.listeners.push(()=>node.removeEventListener(event,fn));}
  function fromHash(hash){const key=String(hash||'').replace(/^#/,'');return validPages.has(key)?key:aliases[key]||null;}
  function init(options={}){config=options;root.SotaIconControls?.stop();}
  function musicDetails(){
    const player=root.document.querySelector('#sk-music-playlist'),visual=player?.querySelector(':scope > dimau-music-visualiser');
    if(visual){const details=root.document.createElement('details');details.className='sx-music-visuals';const summary=root.document.createElement('summary');summary.textContent='Show music visuals';details.append(summary);visual.before(details);details.append(visual);}
  }
  function miniPlayer(s){
    const bar=root.document.createElement('section');bar.className='sx-mini-player';bar.hidden=true;bar.setAttribute('aria-label','Now playing');bar.innerHTML=`<span class="sx-mini-icon">${icon('music')}</span><button class="sx-mini-open" type="button"><small>YOUR SOUNDTRACK</small><b></b></button><button class="sx-mini-toggle" type="button" aria-label="Pause music">Ⅱ</button>`;s.app.append(bar);
    const current=()=>root.document.querySelector('#sota-playlist-audio');
    function update(){const audio=current();bar.hidden=!audio?.getAttribute('src');if(bar.hidden)return;bar.querySelector('b').textContent=root.document.querySelector('.sk-playlist-title')?.textContent||'Your soundtrack';const button=bar.querySelector('.sx-mini-toggle');button.textContent=audio.paused?'▶':'Ⅱ';button.setAttribute('aria-label',audio.paused?'Resume music':'Pause music');}
    for(const event of ['play','pause','ended','loadedmetadata','emptied']){root.document.addEventListener(event,update,true);s.listeners.push(()=>root.document.removeEventListener(event,update,true));}
    listen(s,bar.querySelector('.sx-mini-toggle'),'click',()=>{root.document.querySelector('#sk-music-playlist .sk-deck-play,#sk-music-playlist .sk-playlist-play')?.click();});
    listen(s,bar.querySelector('.sx-mini-open'),'click',()=>{if(s.member){config.go?.('music');}else{root.history.pushState(null,'','#music');s.show?.('music');}});update();
  }
  function welcome(){return `<section class="sx-hero" aria-labelledby="sx-welcome-title"><img class="sx-hero-photo" src="/assets/fiji-sunset.jpg" alt="Sunset over a turquoise Pacific lagoon" fetchpriority="high" width="1920" height="1081"><div class="sx-hero-copy"><span class="sx-eyebrow">FIJI ROOTS. EVERYWHERE ENERGY.</span><h1 id="sx-welcome-title" tabindex="-1">Your people.<br>Your music.<br><em>Your space.</em></h1><p>A little corner of the internet that feels like home. Bring your people. Make it yours.</p><div class="sx-actions"><button class="sx-button sx-primary" data-sx-auth="up">Create your space <span aria-hidden="true">↗</span></button><a class="sx-button sx-white" href="#profile">Take a look around</a></div><small>Already part of the circle? <button class="sx-inline" data-sx-auth="in">Sign in</button></small></div><a class="sx-postcard" href="#profile"><span class="sx-postcard-top">A SPACE THAT IS SO YOU <span>↗</span></span><div class="sx-postcard-cover"></div><div class="sx-postcard-body"><svg viewBox="121 951 215 215" class="sx-avatar" role="img" aria-label="Example profile portrait"><image href="/assets/mobile-front-reference.png" width="1008" height="1896"/></svg><div><b>Sema’s space</b><span>Good people. Brighter days.</span></div><span class="sx-example">EXAMPLE</span></div><div class="sx-postcard-song">${icon('music')} <span>Your life has a soundtrack.</span><span aria-hidden="true">▂▅▃▇▅</span></div></a><div class="sx-hero-caption">SOTA KECE <span>Come as you are.</span></div></section><section class="sx-intro"><div><span class="sx-eyebrow">MORE CONNECTION. MORE YOU.</span><h2>All the things that<br>bring us together.</h2></div><p>Catch up with your people, share a favourite song and build a space that tells your story.</p></section><div class="sx-discover"><a class="sx-discover-card sx-discover-people" href="#people">${icon('people')}<small>01 / YOUR PEOPLE</small><h3>Good company.<br>Wherever you are.</h3><span>Find your people ↗</span></a><a class="sx-discover-card sx-discover-music" href="#music">${icon('music')}<small>02 / YOUR SOUNDTRACK</small><h3>Island roots.<br>Volume up.</h3><span>Explore the music ↗</span></a><a class="sx-discover-card sx-discover-space" href="#skins">${icon('profile')}<small>03 / YOUR OWN SPACE</small><h3>A whole lot<br>of personality.</h3><span>Find your look ↗</span></a></div><section class="sx-together"><span class="sx-eyebrow">SIT DOWN. CATCH UP.</span><h2>There’s a place for you<br>in the circle.</h2><a class="sx-button" href="#talanoa">Explore Talanoa ${icon('talanoa')}</a></section>`;}
  function mountGuest(app,{roomMarkup=''}={}){
    root.SotaFrontPages?.stop();
    const s=start(app,false),take=selector=>app.querySelector(selector);
    const kept={music:take('#sota-music-home'),people:take('.bv-connect-header'),talanoa:take('#bv-circle'),world:take('#sota-connections'),skins:take('#bv-your-room'),account:take('#bv-entry'),footer:take('.bv-classic-footer')};
    const accountActions=take('.bv-entry-account-actions');
    Object.values(kept).forEach(node=>node?.remove());accountActions?.remove();
    root.SotaProfilePhotos?.stop();root.SotaRoomSocial?.stop();root.SotaRoomSocialLayout?.stop();
    app.innerHTML=`<a class="sx-skip" href="#sx-content">Skip to content</a><aside class="sx-rail">${brand()}<p class="sx-rail-caption">A little closer to home.</p>${nav()}<div class="sx-rail-bottom"><span class="sx-masi-mark" aria-hidden="true">✦</span><p>Your people.<br>Your place in the world.</p><small>Made for connection.</small></div></aside><header class="sx-top"><a class="sx-mobile-brand" href="#home">Sota Kece<span>✦</span></a><span class="sx-top-note">A place to be yourself.</span><div class="sx-account-actions"></div></header><main id="sx-content" class="sx-content" tabindex="-1"><div class="sx-page-heading" hidden><a href="#home" class="sx-back">← Back home</a><span class="sx-eyebrow"></span><h1 tabindex="-1"></h1></div><div class="sx-panel" data-sx-page="home">${welcome()}</div><section class="sx-panel" data-sx-page="people" hidden><p class="sx-lead">Find a familiar face, invite your friends and keep the people who matter close.</p><div class="sx-people-layout"><div data-sx-slot="people"></div><aside class="sx-side-card"><span class="sx-eyebrow">A NEW WAY TO SEE YOUR WORLD</span><h2>Every connection<br>has a story.</h2><p>Explore an interactive map of the people, pets and places in your life.</p><a class="sx-button" href="#world">Explore the 3D map ↗</a></aside></div></section><section class="sx-panel" data-sx-page="talanoa" hidden><p class="sx-lead">A space for your conversations and your circles. Make time for the people who make you feel at home.</p><div class="sx-talanoa-layout"><div data-sx-slot="talanoa"></div><aside class="sx-side-card"><span class="sx-eyebrow">KEEP THE CONVERSATION GOING</span><h2>Your circles.<br>Your conversations.</h2><p>Sign in to find your circles, accept invitations and catch up with your people.</p><button class="sx-button sx-primary" data-sx-auth="in">Open my circles ↗</button><a class="sx-text-link" href="/communications.html?app=sota-kece">Open chats & calls ↗</a></aside></div></section><section class="sx-panel" data-sx-page="music" hidden><p class="sx-lead">Pick something you love. Explore the playlist, bring your own music or watch your sound come alive.</p><div data-sx-slot="music"></div></section><section class="sx-panel" data-sx-page="profile" hidden><div class="sx-profile-toolbar"><p><b>Meet Sema’s example space.</b> Your own profile, people and memories appear when you sign in.</p><div class="sx-actions"><a class="sx-button" href="#skins">Explore skins</a><button class="sx-button sx-primary" data-sx-auth="up">Make my space ↗</button></div></div><div class="sx-room-example">${roomMarkup}</div><div class="sx-profile-foot"><span>Change the colours. Choose a cover. Add your soundtrack.</span><button class="sx-button" data-sx-customise>Customise this example ↗</button></div></section><section class="sx-panel" data-sx-page="skins" hidden><p class="sx-lead">Your vanua, school, music, memories—or something entirely your own.</p><div data-sx-slot="skins"></div><a class="sx-text-link" href="#profile">← See the example space</a></section><section class="sx-panel" data-sx-page="world" hidden><p class="sx-lead">Explore the example map, or sign in to open your own connections.</p><div data-sx-slot="world"></div><a class="sx-text-link" href="#people">← Back to People</a></section></main><footer class="sx-footer"><a href="#home">Sota Kece <span>· alive together</span></a><div data-sx-slot="footer"></div></footer>`;
    for(const [key,node] of Object.entries(kept)){if(!node)continue;if(key==='account')app.append(node);else app.querySelector(`[data-sx-slot="${key}"]`)?.append(node);}
    if(accountActions)app.querySelector('.sx-account-actions').append(accountActions);
    // Keep the original account buttons and their listeners; only the wording changes.
    const signup=app.querySelector('#sk-sign-up');if(signup)signup.textContent='Join the circle';
    const people=kept.people;
    people?.querySelector('.bv-entry-copy')?.remove();people?.querySelector('.bv-wordmark')?.remove();
    if(people){const search=people.querySelector('#bv-home-search');if(search)people.prepend(search);}
    kept.skins?.querySelector('h1')?.setAttribute('aria-label','Skin collections');
    const profile=app.querySelector('.sx-room-example');config.wireRoom?.(profile);
    let musicOpened=false;
    function show(page,{focus=true}={}){
      if(session!==s||!validPages.has(page))return;
      s.page=page;app.dataset.frontPage=page;app.dataset.sxPage=page;
      app.querySelectorAll('[data-sx-page]').forEach(panel=>panel.hidden=panel.dataset.sxPage!==page);
      app.querySelectorAll('[data-sx-route]').forEach(link=>link.setAttribute('aria-current',String(link.dataset.sxRoute===(page==='skins'?'profile':page==='world'?'people':page)?'page':'false')));
      const heading=app.querySelector('.sx-page-heading');heading.hidden=page==='home';heading.querySelector('.sx-eyebrow').textContent=titles[page][0];heading.querySelector('h1').textContent=titles[page][1];
      if(page==='music'&&!musicOpened){root.SotaMusicHome?.choose('playlist');musicDetails();musicOpened=true;}
      // Switching pages hides existing panels without recreating the player or its draft state.
      root.dispatchEvent(new root.CustomEvent('sota-front-page-change',{detail:{view:page}}));root.dispatchEvent(new root.Event('resize'));
      if(focus){(page==='home'?app.querySelector('#sx-welcome-title'):heading.querySelector('h1')).focus({preventScroll:true});root.scrollTo?.({top:0,behavior:'instant'});}
    }
    s.show=show;
    listen(s,app,'click',event=>{
      const auth=event.target.closest('[data-sx-auth]');if(auth){app.querySelector(auth.dataset.sxAuth==='up'?'#sk-sign-up':'#sk-sign-in')?.click();return;}
      if(event.target.closest('[data-sx-customise]')){root.BulaSkinStudio?.open();return;}
      const link=event.target.closest('a[href^="#"]');if(!link||event.defaultPrevented||event.button||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      const page=fromHash(link.getAttribute('href'));if(!page)return;
      event.preventDefault();if(root.location.hash!=='#'+page)root.history.pushState(null,'','#'+page);show(page);
    });
    listen(s,root,'hashchange',()=>{const page=fromHash(root.location.hash);if(page)show(page);});
    listen(s,root,'popstate',()=>{const page=fromHash(root.location.hash);if(page)show(page);});
    show(fromHash(root.location.hash)||'home',{focus:false});
    // Opening the playlist from an existing control must also reveal its page.
    const host=app.querySelector('[data-music-playlist-host]');if(host)listen(s,host,'sota-playlist-inline-open',()=>{if(s.page!=='music'){root.history.pushState(null,'','#music');show('music');}});
    miniPlayer(s);
    return ()=>{if(session===s)stop();};
  }
  function mountMember(app,state={}){
    if(!app.querySelector('#view'))return;
    const s=start(app,true),member=!!state.user,oldNav=app.querySelector('nav.bottom'),wasNav=!!root.document.activeElement?.closest('nav.bottom');oldNav?.remove();
    const top=app.querySelector('header.top');
    const utilities=[...(top?.querySelectorAll('button,.luvchip')||[])].filter((node,index,all)=>!all.some(other=>other!==node&&other.contains(node)));
    if(top){top.classList.add('sx-top');top.innerHTML=`<a class="sx-mobile-brand" href="#home">Sota Kece<span>✦</span></a><span class="sx-top-note">Bula, ${esc(state.me?.display_name||state.me?.handle||'friend')}.</span><details class="sx-more"><summary>More <span aria-hidden="true">⌄</span></summary><div><button type="button" data-sx-member="moments">My moments</button><button type="button" data-sx-member="circles">Talanoa Circle</button><button type="button" data-sx-member="connections">3D connections</button><button type="button" data-sx-design>Design this page</button><div class="sx-utilities"></div></div></details>`;utilities.forEach(node=>top.querySelector('.sx-utilities').append(node));}
    if(!member&&top){top.innerHTML=`<a class="sx-mobile-brand" href="#home">Sota Kece<span>✦</span></a><span class="sx-top-note">Explore an example circle.</span><a class="sx-button" href="#talanoa" data-sx-route="talanoa">Back to Talanoa</a>`;}
    const aside=root.document.createElement('aside');aside.className='sx-rail';aside.innerHTML=`${brand()}<p class="sx-rail-caption">A little closer to home.</p>${nav(member,member?state.tab:'talanoa',state.pending?.length||0)}<div class="sx-rail-bottom"><p>${esc(state.me?.display_name||state.me?.handle||'Your space')}</p><small>${state.me?.handle?'@'+esc(state.me.handle):'alive together'}</small></div>`;app.prepend(aside);
    const selected=routes.find(r=>r[2]===state.tab),view=app.querySelector('#view');view.classList.add('sx-member-content');
    if(selected&&state.tab!=='room'){const heading=root.document.createElement('header');heading.className='sx-member-heading';heading.innerHTML=`<span class="sx-eyebrow">${titles[selected[0]][0]}</span><h1>${titles[selected[0]][1]}</h1>`;view.prepend(heading);}
    if(state.tab==='friends'){const link=root.document.createElement('button');link.type='button';link.className='sx-button sx-map-entry';link.dataset.sxMember='connections';link.textContent='Explore my 3D connections ↗';view.append(link);}
    listen(s,app,'click',event=>{const publicLink=event.target.closest('[data-sx-route],.sx-brand,.sx-mobile-brand');if(!member&&publicLink){event.preventDefault();root.history.pushState(null,'',publicLink.getAttribute('href'));config.welcome?.();return;}const button=event.target.closest('[data-sx-member]');if(button){config.go?.(button.dataset.sxMember);return;}if(event.target.closest('[data-sx-design]'))root.SotaSpaceDesign?.open();if(event.target.closest('.sx-brand,.sx-mobile-brand')){event.preventDefault();config.go?.('pulse');}});
    if(wasNav)app.querySelector(`[data-sx-member="${state.tab}"]`)?.focus({preventScroll:true});
    if(member)miniPlayer(s);
  }
  function mountMusic(app){root.SotaLocalMusic?.mount(app);root.SotaHeroVisualiser?.mount(app);root.SotaPlaylist?.mount(app);root.SotaMusicHome?.mount(app);root.SotaMusicHome?.choose('playlist');musicDetails();}
  return {init,stop,mountGuest,mountMember,mountMusic,fromHash,nav};
});
