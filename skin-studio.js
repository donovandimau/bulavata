(function() {
  'use strict';
  const skins = window.BulaSkins;
  if (!skins) return;
  let studio = null, draft = null, legacy = '', focusBefore = null;
  const example = {display_name:'Sema',handle:'sema',bio:'Good people. Brighter days. Suva, Fiji.'};
  let sampleAudio = null, sampleTimer = null;
  function stopSample() {
    clearTimeout(sampleTimer);
    if(sampleAudio) { sampleAudio.close().catch(()=>{}); sampleAudio=null; }
    document.querySelectorAll('[data-sample-play]').forEach(button=>{
      button.textContent=button.id==='bv-home-play'?'▶ Try a sample':'▶';button.setAttribute('aria-label','Play sample loop');button.setAttribute('aria-pressed','false');
    });
    document.querySelectorAll('[data-sample-status]').forEach(status=>status.textContent='Sample melody · tap to play');
    document.querySelector('.bv-mixtape')?.classList.remove('is-playing');
  }
  async function playSample() {
    if(sampleAudio) { stopSample();return; }
    const status=document.querySelector('#bv-home-status')||document.querySelector('#bv-sample-status');
    try {
      const Audio=window.AudioContext||window.webkitAudioContext;
      if(!Audio)throw new Error('Audio unavailable');
      const context=new Audio();sampleAudio=context;
      await context.resume();
      if(sampleAudio!==context)return;
      const start=context.currentTime;
      [261.63,329.63,392,523.25,392,329.63,293.66,392,440,587.33,440,392].forEach((frequency,i)=>{
        const oscillator=context.createOscillator(),gain=context.createGain();
        oscillator.type='sine';oscillator.frequency.value=frequency;
        const time=start+i*.32;
        gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(.09,time+.025);gain.gain.exponentialRampToValueAtTime(.001,time+.44);
        oscillator.connect(gain);gain.connect(context.destination);oscillator.start(time);oscillator.stop(time+.46);
      });
      document.querySelectorAll('[data-sample-play]').forEach(button=>{
        button.textContent=button.id==='bv-home-play'?'��� Stop sample':'���';button.setAttribute('aria-label','Stop sample loop');button.setAttribute('aria-pressed','true');
      });
      document.querySelector('.bv-mixtape')?.classList.add('is-playing');
      document.querySelectorAll('[data-sample-status]').forEach(status=>status.textContent='Playing a sample melody · made here');
      sampleTimer=setTimeout(()=>{stopSample();if(status.isConnected)status.textContent='Sample loop · tap to play again';},4200);
    }catch(_){stopSample();if(status)status.textContent='Audio unavailable in this browser. Your room can still have a profile track.';}
  }
  function picked() {
    try { return skins.normalize(JSON.parse(localStorage.getItem('bv-picked-skin')||'{"id":"midnight"}')); }
    catch (_) { return skins.normalize({id:'midnight'}); }
  }
  function preview(profile, settings) {
    const s=skins.normalize(settings),p=skins.presets.find(p=>p.id===s.id);
    const interests=s.interests.split(',').map(x=>x.trim()).filter(Boolean).slice(0,8);
    const portraits=Array.from({length:16},(_,i)=>frontCrop([1020,1080,1141,1202][i%4],448+Math.floor(i/4)*50,48,48,`Example friend ${i+1}`));
    return `<div class="bv-preview bv-photo-room" style="${esc(skins.inline(s))}" data-layout="${s.layout}">
      <div class="bv-cover" data-pattern="${s.pattern}">${s.coverPath?coverMediaMarkup(s):'<svg class="bv-cover-photo sk-photo" viewBox="632 100 677 224" role="img" aria-label="Fijian friends from the supplied Sema design"><image href="/assets/front-reference.jpg" width="1360" height="768"/></svg>'}<div class="bv-cover-words">${esc(s.note||p.note)}</div><span class="bv-skin-tag">${esc(p.name)}</span></div>
      <div class="bv-profile-intro"><div class="bv-profile-avatar">${frontAvatar('Sema — example profile portrait')}</div>
        <h2>${esc(profile.display_name||profile.handle||'Your name')}</h2><p>@${esc(profile.handle||'yourhandle')}</p><p>${esc(profile.bio||'Good people. Brighter days.')}</p>
        ${interests.length?`<div class="bv-interests">${interests.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:''}</div>
      <div class="bv-preview-columns"><section class="bv-mini-card"><h3>Talanoa <small>Example notes</small></h3><div class="bv-photo-note">${frontCrop(660,500,46,49,'Example portrait of Donu')}<div><b>Donu</b><p>Same time, same sunset?</p></div><small>2h ago</small></div><div class="bv-photo-note">${frontCrop(658,562,46,48,'Example portrait of Jo')}<div><b>Jo</b><p>Bring your favourite track. See you there.</p></div><small>4h ago</small></div></section>
      <section class="bv-mini-card"><h3>Top Mates · 16</h3><div class="bv-photo-friends">${portraits.map(p=>`<span>${p}</span>`).join('')}</div></section></div>
      ${s.trackUrl||s.trackPath?trackMarkup(s):`<div class="bv-photo-track"><img src="/assets/fiji-music.jpg" width="720" height="480" alt="Band rehearsal" loading="lazy"><div><b>Your room. Your soundtrack.</b><small>Add your own track in the studio.</small></div><span class="bv-photo-wave" aria-hidden="true">▁▃▆▂��▇▃▂��▂▆▃▁</span></div>`}</div>`;
  }
  function coverMediaMarkup(settings) {
    return settings.coverPath?`<button type="button" class="bv-cover-load" data-cover-path="${esc(settings.coverPath)}">Load my cover artwork ↗</button>`:'';
  }
  function trackMarkup(settings) {
    const attribute=settings.trackPath?`data-profile-path="${esc(settings.trackPath)}"`:settings.trackUrl?`data-profile-track="${esc(settings.trackUrl)}"`:'';
    return attribute?`<div class="bv-track"><span>♫ ${esc(settings.trackTitle||'My profile track')}</span><button type="button" class="btn sm ghost" ${attribute}>Play track</button><small>Tap to load. No autoplay.</small></div>`:'';
  }
  function wireMedia(root) {
    root.querySelectorAll('[data-profile-track]:not([data-bv-bound]),[data-profile-path]:not([data-bv-bound])').forEach(button=>{
      button.dataset.bvBound='true';button.addEventListener('click',async()=>{
        button.disabled=true;button.textContent='Loading…';
        try{
          const url=button.dataset.profilePath?await window.SotaRoomMedia.signed(sb,button.dataset.profilePath,'music'):button.dataset.profileTrack;
          if(!button.isConnected)return;
          const audio=document.createElement('audio');audio.controls=true;audio.preload='none';audio.src=url;audio.setAttribute('aria-label','Profile track');
          audio.addEventListener('error',()=>{audio.parentElement.querySelector('small').textContent='Track unavailable. Check the file or try again later.';});
          button.replaceWith(audio);audio.play().catch(()=>{audio.parentElement?.querySelector('small')&&(audio.parentElement.querySelector('small').textContent='Tap the audio controls to play.');});
        }catch(_){button.disabled=false;button.textContent='Try track again';button.parentElement.querySelector('small').textContent='Uploaded tracks are for the room owner and mutual friends. Sign in or check your connection.';}
      });
    });
    root.querySelectorAll('[data-cover-path]:not([data-bv-bound])').forEach(button=>{
      button.dataset.bvBound='true';button.addEventListener('click',async()=>{
        button.disabled=true;button.textContent='Loading cover…';
        try{
          const url=await window.SotaRoomMedia.signed(sb,button.dataset.coverPath,'covers');if(!button.isConnected)return;
          const image=document.createElement('img');image.className='bv-cover-photo';image.alt='Room cover artwork';image.decoding='async';image.src=url;
          image.addEventListener('error',()=>{image.remove();button.hidden=false;button.disabled=false;button.textContent='Cover unavailable · try again';});
          button.closest('.bv-cover').prepend(image);button.hidden=true;
        }catch(_){button.disabled=false;button.textContent='Sign in or retry to load cover';}
      });
    });
    root.querySelectorAll('[data-media-url]:not([data-bv-bound])').forEach(button=>{button.dataset.bvBound='true';button.addEventListener('click',()=>{
      const image=document.createElement('img');image.alt='Shared image';image.loading='lazy';image.decoding='async';image.referrerPolicy='no-referrer';image.src=button.dataset.mediaUrl;
      image.addEventListener('error',()=>{image.replaceWith(button);button.textContent='Image unavailable · tap to retry';});button.replaceWith(image);
    });});
  }
  let mediaUploads=[],mediaBusy=false;
  async function uploadRoomMedia(event) {
    const kind=event.target.id==='bv-music-upload'?'music':'covers',file=event.target.files?.[0];if(!file)return;
    const dialog=studio,userId=S.user?.id;if(!dialog||!draft||!userId)return;
    const status=dialog.querySelector('#bv-upload-status'),saveButton=dialog.querySelector('#bv-save');
    mediaBusy=true;saveButton.disabled=true;status.textContent=kind==='music'?'Uploading your track…':'Uploading your artwork…';
    dialog.querySelectorAll('input[type=file]').forEach(input=>input.disabled=true);
    try{
      const uploaded=await window.SotaRoomMedia.api(sb,userId).upload(file,kind);
      if(studio!==dialog||!draft){await window.SotaRoomMedia.api(sb,userId).remove(uploaded.path);return;}
      mediaUploads.push({path:uploaded.path,userId});
      if(kind==='music'){draft.trackPath=uploaded.path;draft.trackTitle=uploaded.title;draft.trackUrl='';dialog.querySelector('#bv-trackTitle').value=draft.trackTitle;dialog.querySelector('#bv-trackUrl').value='';}
      else draft.coverPath=uploaded.path;
      status.textContent=kind==='music'?'Track uploaded. Save your room to add it.':'Cover uploaded. Save your room to use it.';drawPreview();
    }catch(error){if(studio===dialog)status.textContent=error.message||'Upload interrupted. Your design is still here.';}
    finally{mediaBusy=false;if(studio===dialog){saveButton.disabled=false;dialog.querySelectorAll('input[type=file]').forEach(input=>input.disabled=false);event.target.value='';}}
  }
  function discardUploads(keep=[]) {
    const pending=mediaUploads.filter(file=>!keep.includes(file.path));mediaUploads=[];
    pending.forEach(file=>window.SotaRoomMedia.api(sb,file.userId).remove(file.path).catch(()=>{}));
  }

  function reset() {
    stopSample();
    document.body.classList.remove('bv-room-active');
    document.querySelector('#bv-active-skin')?.remove();
    app.classList.remove('bv-welcome');
    document.documentElement.style.setProperty('--accent',S.me?.room_accent||'#086779');
  }
  function apply(profile, room) {
    const parsed=skins.read(profile.room_css),s=parsed.settings;
    if (!String(profile.room_css||'').startsWith('/* bv-skin:v1 ')) s.accent=/^#[0-9a-f]{6}$/i.test(profile.room_accent)?profile.room_accent:s.accent;
    const view=document.querySelector('#view');
    if(!view)return;
    view.classList.add('bv-room');view.dataset.layout=s.layout;
    const style=document.createElement('style');style.id='bv-active-skin';
    style.textContent='body.bv-room-active{'+skins.inline(s)+'}\n'+skins.safeLegacy(parsed.legacy);
    document.head.appendChild(style);document.body.classList.add('bv-room-active');
    const p=skins.presets.find(p=>p.id===s.id),head=document.querySelector('#room-head');
    if(head){
      const cover=document.createElement('div');cover.className='bv-cover';cover.dataset.pattern=s.pattern;
      cover.innerHTML=`${coverMediaMarkup(s)}<div class="bv-cover-words">${esc(s.note||p.note)}</div><span class="bv-skin-tag">${esc(p.name)}</span>`;
      head.prepend(cover);
      const stats=document.createElement('div');stats.className='bv-profile-stats';
      stats.innerHTML=`<span><b>${(room.top||[]).length}</b>Top friends</span><span><b>${(room.moments||[]).length}</b>Moments</span><span><b>${(room.wall||[]).length}</b>Whiteboard notes</span>`;
      head.appendChild(stats);
      if(s.trackUrl||s.trackPath){const track=document.createElement('div');track.innerHTML=trackMarkup(s);head.appendChild(track.firstElementChild);}
    }
    const side=view.querySelector('.grid.two>.stack:nth-child(2)');
    if(side){
      const about=document.createElement('section');about.className='glass card';
      const interests=s.interests.split(',').map(x=>x.trim()).filter(Boolean).slice(0,8);
      about.innerHTML=`<h3>A little about me</h3><p class="sub" style="line-height:1.8">${esc(profile.bio||'Still making this space my own.')}</p>
        ${interests.length?`<div class="bv-interests">${interests.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:''}
        <div class="hr"></div><div class="sub">Wearing ${esc(p.name)}</div>
        ${!room.is_me?`<button type="button" class="btn sm ghost" style="margin-top:12px" id="bv-borrow-skin">Try this skin</button>`:''}`;
      side.prepend(about);
      about.querySelector('#bv-borrow-skin')?.addEventListener('click',()=>open(s));
    }
    wireMedia(view);
  }
  const originalShell=shell;
  shell=function(body){reset();originalShell(body);wireMedia(app);};
  const originalAuth=renderAuth;
  let pendingMate='';
  function peopleCollage() {
    const tiles=[['photo',680,135,120,145],['text','bula!'],['photo',866,125,133,164],['photo',969,149,120,138],['emoji','🌺'],['music'],['text','YOUR\nSPACE'],['photo',1184,125,108,160],['photo',1020,448,48,48],['emoji','🌊'],['photo',1080,448,48,48],['text','♫'],['photo',866,125,133,164],['emoji','🦋'],['photo',1141,448,48,48],['text','16\nMATES'],['music'],['photo',969,149,120,138],['emoji','🎸'],['photo',1202,448,48,48],['text','talanoa'],['photo',1184,125,108,160],['emoji','🌴'],['photo',1020,498,48,48],['photo',1080,498,48,48],['text','GOOD\nTIMES'],['emoji','☀️'],['music'],['photo',1141,498,48,48],['text','♥']];
    return tiles.map((tile,i)=>`<button type="button" class="bv-collage-tile bv-tile-${tile[0]}" data-collage-skin="${skins.presets[i%skins.presets.length].id}" aria-label="Try ${esc(skins.presets[i%skins.presets.length].name)} skin" style="--tile-tone:${['#086779','#ac244c','#362459','#187e9c','#a05617','#194f47'][i%6]};${tile[0]==='music'?`background-image:url('/assets/fiji-music.jpg');background-position:65% 35%;`:''}">${tile[0]==='photo'?frontCrop(tile[1],tile[2],tile[3],tile[4],'Friends from your Fijian community design'):['text','emoji'].includes(tile[0])?esc(tile[1]).replace(/\n/g,'<br>'):''}</button>`).join('');
  }
  function skinThumbnail(p) {
    const photo=p.category==='Dark'?'/assets/fiji-music.jpg':p.category==='Bright'?'/assets/fiji-sunset.jpg':p.category==='Masi-inspired'?'/assets/masi-band.svg':p.category==='Sport'?'/assets/friends.jpg':'/assets/beach.jpg';
    return `<div class="bv-room-thumbnail" style="${esc(skins.inline({id:p.id}))}" aria-hidden="true"><div class="bv-thumb-cover"><img src="${photo}" width="720" height="480" alt="" loading="lazy"><span></span></div><div class="bv-thumb-profile"><i>${frontAvatar('')}</i><div><b></b><span></span></div></div><div class="bv-thumb-panels"><i></i><i></i></div></div><div class="bv-skin-palette" aria-hidden="true">${[p.bg,p.panel,p.accent,p.cover].map(c=>`<i style="background:${c}"></i>`).join('')}</div>`;
  }
  function frontCrop(x,y,w,h,label) {
    return `<svg class="sk-photo" viewBox="${x} ${y} ${w} ${h}" role="img" aria-label="${esc(label)}"><image href="/assets/front-reference.jpg" width="1360" height="768"/></svg>`;
  }
  function frontAvatar(label) { return frontCrop(647,294,153,158,label); }
  function placeResponsiveNavigation() {
    const app=document.querySelector('#app'), nav=app?.querySelector('.bv-classic-nav');
    const classic=app?.querySelector('.bv-classic'), panels=app?.querySelector('.bv-classic-panels');
    if(!nav||!classic||!panels)return;
    if(window.matchMedia('(max-width:760px)').matches)panels.insertBefore(nav,panels.querySelector('.bv-people-feature'));
    else classic.insertBefore(nav,classic.querySelector('.bv-register')||panels);
  }
  window.matchMedia('(max-width:760px)').addEventListener('change',placeResponsiveNavigation);
  renderAuth=function(mode='in',expanded=false){
    reset();originalAuth(mode);
    const authNode=app.querySelector('.authwrap');
    authNode.querySelectorAll(':scope > .row,:scope > .tagline,:scope > .promises,:scope > .btn').forEach(node=>node.remove());
    authNode.querySelector('.seg').remove();
    authNode.querySelectorAll('label').forEach(label=>label.htmlFor=label.nextElementSibling.id);
    authNode.querySelector('#a-email').autocomplete='email';
    authNode.querySelector('#a-pass').autocomplete=mode==='up'?'new-password':'current-password';
    const auth=authNode.outerHTML;
    app.classList.add('bv-welcome');
    app.innerHTML=`<section class="sk-front sk-original-front" aria-label="Sota Kece original supplied design">
      <picture class="sk-original-picture"><source media="(max-width:760px)" srcset="/assets/mobile-front-reference.png" width="1008" height="1792"><img class="sk-original-design" src="/assets/front-reference.jpg" width="1360" height="768" fetchpriority="high" alt="Sota Kece: Create your own space with friends. The original sunset design with Sema's slanted room, masi border, Talanoa, Top Mates and music player."></picture>
      <nav class="sk-original-actions" aria-label="Get started"><button class="sk-create" type="button" onclick="renderAuth('up',true)">Create your space</button><button type="button" id="sk-room-menu"><span class="sk-action-full">Open room design studio</span><span class="sk-action-short">Room studio</span></button><button type="button" id="sk-sign-in">Sign in</button><a href="#bv-music"><span class="sk-action-full">Explore music, mates & rooms</span><span class="sk-action-short">Explore</span></a></nav>
    </section><div class="bv-neon-section" id="bv-neon"><div class="bv-classic">
      <header class="bv-classic-header"><div class="bv-wordmark" aria-label="Sota Kece"><a href="/" aria-label="Sota Kece home"><span>sota</span>kece</a><small>FIJI ROOTS. EVERYWHERE ENERGY.</small></div>
        <form class="bv-home-search" id="bv-home-search"><label for="bv-find-mate">Find your people</label><div><input id="bv-find-mate" placeholder="Find a mate by @handle" value="${esc(pendingMate)}" maxlength="21" autocapitalize="off" spellcheck="false"><button type="submit" aria-label="Find a mate">⌕</button></div><small id="bv-search-status" role="status">Your people, one handle away.</small></form>
      </header>
      <nav class="bv-classic-nav" aria-label="Explore Sota Kece"><a href="#bv-music">Music</a><a href="#bv-people">Top Mates</a><a href="#bv-your-room">Talanoa & skins</a><button type="button" onclick="window.SotaKavaUI.preview()">Kava Circle</button><span>Bula! You're home.</span></nav>
      <dialog class="bv-account-dialog" id="bv-entry" aria-labelledby="bv-account-title"><div class="bv-account-head"><h2 id="bv-account-title">${mode==='up'?'Create your room':'Sign in'}</h2><button type="button" id="bv-account-close" aria-label="Close account form">×</button></div>${auth}<button type="button" class="bv-link" onclick="renderAuth('${mode==='up'?'in':'up'}',true)">${mode==='up'?'Already have a room? Sign in':'New here? Sign up'}</button></dialog>
      <div class="bv-classic-panels">
        <section class="bv-music-feature" id="bv-music" aria-labelledby="bv-music-title"><img src="/assets/fiji-music.jpg" width="720" height="480" alt="Fijian singer and friends sharing live music at a seaside gathering" fetchpriority="high"><div class="bv-music-copy"><small>YOUR ROOM. YOUR SOUNDTRACK.</small><h1 id="bv-music-title">Viti roots.<br>Volume up.</h1><p>Your tunes. Your people. Your island energy.</p><button id="bv-home-play" data-sample-play type="button" aria-label="Play sample loop" aria-pressed="false">▶ Try a sample</button><small id="bv-home-status" data-sample-status role="status">Sample melody · tap to play</small></div></section>
        <section class="bv-people-feature" id="bv-people" aria-label="Sample collage and room skins"><div class="bv-people-collage">${peopleCollage()}</div><div class="bv-collage-caption"><b>Your people. Your vibe.</b><span>Sample photos & skins · tap a tile</span></div></section>
      </div>
      <section class="bv-social-stage" id="bv-circle" aria-label="Your circle starts here">        <section class="bv-circle-feature" aria-labelledby="bv-circle-title"><div class="bv-circle-art" aria-hidden="true"><svg viewBox="0 0 120 120"><defs><linearGradient id="bv-circle-gradient" x2="0" y2="1"><stop stop-color="#d9ff82"/><stop offset="1" stop-color="#05bb84"/></linearGradient></defs><g stroke="url(#bv-circle-gradient)" stroke-width="16" stroke-linecap="round"><path d="M60 17V103M23 38L97 82M23 82L97 38"/></g></svg></div><small>SIT DOWN. CATCH UP.</small><h2 id="bv-circle-title">Same circle. New stories.</h2><p>Pull up a seat in the Digital Kava Circle.</p><button type="button" class="bv-link" onclick="window.SotaKavaUI.preview()">Take a look →</button></section>
<section class="bv-community-tools" aria-label="Invite your mates"><p>Moments, music and proper Talanoa. Bring your mates into the circle.</p><button type="button" class="bv-link" id="bv-copy-invite">Copy invite link →</button><small id="bv-invite-status" role="status"></small></section>
      </section>
      <section class="bv-room-entry" id="bv-your-room" aria-label="Design your room"><div><h2>Your room. Your rules.</h2><p>24 skins. Masi borders. Your colours, music and cover art.</p><small>Studio choice · <span id="bv-welcome-skin-name"></span></small></div><button type="button" class="btn" id="bv-edit-room">Open the skin studio →</button></section>
      <footer class="bv-classic-footer"><span>Sota Kece · alive together</span><span>Mutual friends · Your own archive · No ads</span><details><summary>Photo credits</summary><p>Sample photography by <a href="https://unsplash.com/photos/i6r5kQMQ9Zk" target="_blank" rel="noopener noreferrer">Ben Collins</a>, <a href="https://unsplash.com/photos/roOETBSa8mA" target="_blank" rel="noopener noreferrer">Samsung UK</a> and <a href="https://unsplash.com/photos/tZhEr2d3oeM" target="_blank" rel="noopener noreferrer">Hoi An and Da Nang Photographer</a>, via Unsplash.</p></details></footer>
    </div></div>`;
    placeResponsiveNavigation();
    // Replacing the wrapper recreates controls, so restore the original auth handlers.
    $('#a-go').onclick=()=>mode==='up'?signUp():signIn();
    app.querySelectorAll('.authwrap input').forEach(i=>i.addEventListener('keydown',e=>{if(e.key==='Enter')$('#a-go').click();}));
    $('#bv-edit-room').addEventListener('click',()=>open());
    $('#bv-home-play').addEventListener('click',playSample);
    $('#sk-room-menu').addEventListener('click',()=>open());
    $('#sk-sign-in').setAttribute('aria-haspopup','dialog');
    $('#sk-sign-in').setAttribute('aria-controls','bv-entry');
    $('#sk-sign-in').addEventListener('click',()=>renderAuth('in',true));
    const account=$('#bv-entry');
    $('#bv-account-close').addEventListener('click',()=>account.close());
    account.addEventListener('close',()=>$('#sk-sign-in').focus({preventScroll:true}));
    if(expanded){account.showModal();$(mode==='up'?'#a-handle':'#a-email').focus();}
    app.querySelectorAll('[data-collage-skin]').forEach(button=>button.addEventListener('click',()=>open({id:button.dataset.collageSkin})));
    $('#bv-home-search').addEventListener('submit',event=>{
      event.preventDefault();pendingMate=$('#bv-find-mate').value.trim().toLowerCase().replace(/^@/,'');
      if(!/^[a-z0-9_]{3,20}$/.test(pendingMate)){ $('#bv-search-status').textContent='Use a handle: 3–20 letters, numbers or underscores.';return; }
      try{sessionStorage.setItem('sota-find-mate',pendingMate);}catch(_){}
      if(mode==='up')renderAuth('in',true);else if(!$('#bv-entry').open)$('#bv-entry').showModal();
      $('#bv-search-status').textContent=`Sign in to find @${pendingMate}. Profiles stay private.`;
      $('#a-email').focus();
    });
    $('#bv-copy-invite').addEventListener('click',async()=>{
      try{await navigator.clipboard.writeText('https://bulavata.vercel.app/');$('#bv-invite-status').textContent='Invite link copied. Share it with your mates.';}
      catch(_){$('#bv-invite-status').textContent='Invite your mates: https://bulavata.vercel.app/';}
    });
    showWelcome(picked());
  };
  function showWelcome(settings) {
    const label=document.querySelector('#bv-welcome-skin-name');
    if(label)label.textContent=skins.presets.find(p=>p.id===skins.normalize(settings).id).name;
    const box=document.querySelector('#bv-welcome-preview');
    if(box){box.innerHTML=preview(example,{...skins.normalize(settings),note:'Good people. Brighter days.'});wireMedia(box);}
  }
  function open(initial) {
    if(studio)return;
    const parsed=skins.read(S.me?.room_css);
    const current=String(S.me?.room_css||'');
    draft=skins.normalize(initial||(!S.user||!current?picked():current.startsWith('/* bv-skin:v1 ')?parsed.settings:{...parsed.settings,accent:S.me.room_accent}));
    legacy=parsed.legacy;focusBefore=document.activeElement;
    const p=S.me||example;skinCategory='All';
    studio=document.createElement('dialog');studio.className='bv-studio';studio.setAttribute('aria-labelledby','bv-studio-title');
    studio.innerHTML=`<div class="bv-studio-head"><div><h2 id="bv-studio-title">Make it yours.</h2><p>Pick a skin. Mix the colours. Give your room a personality.</p></div><button type="button" class="bv-close" aria-label="Close skin studio">×</button></div>
      <div class="bv-studio-body"><div class="bv-studio-controls"><div class="bv-studio-picker"><h3>Choose your room style</h3><p class="bv-style-intro">24 photo-led designs. Start with a palette, then make it yours.</p><div class="bv-skin-categories" id="bv-skin-categories"></div><div class="bv-skin-grid" id="bv-skin-options"></div></div>
      <div class="bv-studio-custom"><h3>Add your own twist</h3><div class="bv-controls">
        <div><label for="bv-accent">Accent colour</label><input id="bv-accent" type="color" value="${draft.accent}"></div>
        <div><label for="bv-background">Page colour</label><input id="bv-background" type="color" value="${draft.background}"></div>
        <div><label for="bv-panel">Card colour</label><input id="bv-panel" type="color" value="${draft.panel}"></div><div><label for="bv-cover">Cover colour</label><input id="bv-cover" type="color" value="${draft.cover}"></div>
        <div><label for="bv-cardStyle">Card corners</label><select id="bv-cardStyle">${['soft','square','round'].map(v=>`<option value="${v}" ${draft.cardStyle===v?'selected':''}>${v}</option>`).join('')}</select></div><div><label for="bv-effect">Card finish</label><select id="bv-effect">${['flat','glow','sticker'].map(v=>`<option value="${v}" ${draft.effect===v?'selected':''}>${v}</option>`).join('')}</select></div>
        <div><label for="bv-pattern">Background pattern</label><select id="bv-pattern">${skins.patterns.map(v=>`<option value="${v}" ${draft.pattern===v?'selected':''}>${v[0].toUpperCase()+v.slice(1)}</option>`).join('')}</select></div>
        <div><label for="bv-font">Your lettering</label><select id="bv-font">${[['rounded','Rounded'],['serif','Storybook'],['mono','Typewriter']].map(([v,t])=>`<option value="${v}" ${draft.font===v?'selected':''}>${t}</option>`).join('')}</select></div>
        <div class="bv-span"><label for="bv-layout">Room layout</label><select id="bv-layout"><option value="classic" ${draft.layout==='classic'?'selected':''}>Classic · wall and friends side by side</option><option value="wide" ${draft.layout==='wide'?'selected':''}>Wide · give your wall more space</option></select></div>
        <div class="bv-span"><label for="bv-note">Words on your cover</label><input id="bv-note" value="${esc(draft.note)}" maxlength="80" placeholder="Whatever feels like you"></div>
        <div class="bv-span"><label for="bv-interests">Your favourites, separated by commas</label><input id="bv-interests" value="${esc(draft.interests)}" maxlength="160" placeholder="Drua, music, sunsets, good company"></div>
        <div class="bv-span"><label for="bv-trackTitle">Your profile track</label><input id="bv-trackTitle" value="${esc(draft.trackTitle)}" maxlength="80" placeholder="Song name · artist"></div>
        <div class="bv-upload-box"><h4>Bring your own music & artwork</h4><p>File uploads are being prepared. You can use a direct audio link and try every skin and design control now.</p><label for="bv-music-upload">Upload your track · MP3, M4A, OGG, Opus or WAV · up to 6 MB</label><input id="bv-music-upload" type="file" accept=".mp3,.m4a,.ogg,.opus,.wav" disabled><label for="bv-cover-upload">Upload cover artwork · JPG, PNG or WebP · up to 6 MB</label><input id="bv-cover-upload" type="file" accept=".jpg,.jpeg,.png,.webp" disabled><div class="bv-upload-status" id="bv-upload-status" role="status"></div><div class="bv-upload-actions"><button type="button" class="btn ghost" id="bv-remove-track">Remove track</button><button type="button" class="btn ghost" id="bv-remove-cover">Remove cover</button></div></div>
        <div class="bv-span"><label for="bv-trackUrl">Or paste a direct audio link</label><input id="bv-trackUrl" type="url" value="${esc(draft.trackUrl)}" maxlength="320" placeholder="https://…/your-track.mp3"><p class="sub">Use an HTTPS MP3, M4A, OGG, Opus or WAV file you can share. Loads only when a visitor taps Play.</p></div></div>
      ${S.user&&S.me?`<details><summary>Edit your profile</summary><div class="stack"><div><label for="d-name">Display name</label><input id="d-name" value="${esc(p.display_name||'')}" maxlength="40"></div>
        <div><label for="d-pro">Pronouns</label><input id="d-pro" value="${esc(p.pronouns||'')}" maxlength="24"></div>
        <div><label for="d-bio">Bio</label><textarea id="d-bio" maxlength="400">${esc(p.bio||'')}</textarea></div>
        <div><label for="d-emo">Your emoji</label><input id="d-emo" value="${esc(p.avatar_emoji||'🌺')}" maxlength="8"></div></div></details>
        <details><summary>Advanced: your custom CSS</summary><p class="sub">Style room cards and text. External files and page overlays are excluded.</p><label for="d-css">Room CSS</label><textarea id="d-css" maxlength="3000" placeholder=".scrawl { border-radius: 20px; }">${esc(legacy)}</textarea></details>`:''}</div></div>
      <aside class="bv-studio-preview"><div class="bv-example-label"><span>${S.user?'Your room · live preview':'Example room · live preview'}</span><span id="bv-preview-name"></span></div><div id="bv-studio-preview"></div><p class="sub" style="font-size:11px;line-height:1.7;margin-top:14px">${S.user?'Your friends will see this skin when they visit your room.':'These are example details. Your own name, friends and posts appear when you make a room.'}</p></aside></div>
      <div class="bv-studio-footer"><div class="bv-studio-error" id="bv-studio-error" role="status" aria-live="polite"></div><div class="row"><button type="button" class="btn ghost" id="bv-cancel">Cancel</button><button type="button" class="btn" id="bv-save">${S.user?'Save my room':'Use this skin'}</button></div></div>`;
    document.body.appendChild(studio);
    studio.querySelector('.bv-close').addEventListener('click',close);
    studio.querySelector('#bv-cancel').addEventListener('click',close);
    studio.querySelector('#bv-save').addEventListener('click',save);
    studio.addEventListener('cancel',event=>{event.preventDefault();close();});
    studio.addEventListener('close',()=>{discardUploads();const dialog=document.querySelector('dialog.bv-studio');dialog?.remove();studio=null;draft=null;focusBefore?.focus();});
    studio.addEventListener('input',update);studio.addEventListener('change',update);
    studio.querySelectorAll('input[type=file]').forEach(input=>input.addEventListener('change',uploadRoomMedia));
    studio.querySelector('#bv-remove-track').addEventListener('click',()=>{draft.trackPath='';draft.trackUrl='';draft.trackTitle='';studio.querySelector('#bv-trackUrl').value='';studio.querySelector('#bv-trackTitle').value='';drawPreview();});
    studio.querySelector('#bv-remove-cover').addEventListener('click',()=>{draft.coverPath='';drawPreview();});
    drawOptions();drawPreview();studio.showModal();
  }
  function close() {studio?.close();}
  let skinCategory='All';
  function drawOptions() {
    const categories=['All',...new Set(skins.presets.map(p=>p.category))];
    studio.querySelector('#bv-skin-categories').innerHTML=categories.map(category=>`<button type="button" data-skin-category="${esc(category)}" aria-pressed="${category===skinCategory}">${esc(category)}</button>`).join('');
    studio.querySelectorAll('[data-skin-category]').forEach(button=>button.addEventListener('click',()=>{skinCategory=button.dataset.skinCategory;drawOptions();studio.querySelector(`[data-skin-category="${skinCategory}"]`).focus();}));
    studio.querySelector('#bv-skin-options').innerHTML=skins.presets.filter(p=>skinCategory==='All'||p.category===skinCategory).map(p=>`<button type="button" class="bv-skin-option" data-skin="${p.id}" aria-pressed="${draft.id===p.id}" aria-label="${esc(p.name)} skin">${skinThumbnail(p)}<strong>${esc(p.name)}</strong><small>${esc(p.category)} · ${esc(p.note)}</small></button>`).join('');
    studio.querySelectorAll('[data-skin]').forEach(b=>b.addEventListener('click',()=>{
      draft=skins.normalize({id:b.dataset.skin,layout:draft.layout,interests:draft.interests,trackUrl:draft.trackUrl,trackTitle:draft.trackTitle,trackPath:draft.trackPath,coverPath:draft.coverPath});
      for(const key of ['accent','background','panel','cover','cardStyle','effect','pattern','font','note','layout','interests','trackUrl','trackTitle'])studio.querySelector('#bv-'+key).value=draft[key];
      drawOptions();drawPreview();studio.querySelector(`[data-skin="${draft.id}"]`).focus();
    }));
  }
  function update(event) {
    if(!studio||!draft)return;
    for(const key of ['accent','background','panel','cover','cardStyle','effect','pattern','font','note','layout','interests','trackUrl','trackTitle'])draft[key]=studio.querySelector('#bv-'+key).value;
    if(event?.target.id==='bv-trackUrl'&&draft.trackUrl)draft.trackPath='';
    draft=skins.normalize(draft);drawPreview();
  }
  function drawPreview() {
    const profile={...(S.me||example)};
    for(const [id,field] of [['d-name','display_name'],['d-bio','bio'],['d-emo','avatar_emoji']]){const el=studio.querySelector('#'+id);if(el)profile[field]=el.value;}
    studio.querySelector('#bv-studio-preview').innerHTML=preview(profile,draft);
    wireMedia(studio.querySelector('#bv-studio-preview'));
    studio.querySelector('#bv-preview-name').textContent=skins.presets.find(p=>p.id===draft.id).name;
  }
  async function save() {
    if(!studio||!draft||mediaBusy)return;
    const button=studio.querySelector('#bv-save'),errorBox=studio.querySelector('#bv-studio-error');
    errorBox.textContent='';
    const trackInput=studio.querySelector('#bv-trackUrl').value.trim();
    if(trackInput&&!skins.safeUrl(trackInput,true)){errorBox.textContent='Use a direct HTTPS audio-file link, or leave it empty.';studio.querySelector('#bv-trackUrl').focus();return;}
    if(!S.user||!S.me){
      try{localStorage.setItem('bv-picked-skin',JSON.stringify(draft));}catch(_){errorBox.textContent='This browser could not keep your choice. You can still pick it after signing in.';return;}
      const chosen={...draft};close();showWelcome(chosen);toast('Skin picked. Make your room to save it with your profile.');return;
    }
    const name=studio.querySelector('#d-name').value.trim();
    if(!name){errorBox.textContent='Give your profile a display name.';studio.querySelector('#d-name').focus();return;}
    let patch;
    try{patch={display_name:name,pronouns:studio.querySelector('#d-pro').value.trim(),bio:studio.querySelector('#d-bio').value,
      avatar_emoji:studio.querySelector('#d-emo').value.trim()||'🌺',room_accent:draft.accent,room_css:skins.encode(draft,studio.querySelector('#d-css').value)};}
    catch(e){errorBox.textContent=e.message;return;}
    button.disabled=true;button.textContent='Saving…';
    try{
      const {data,error}=await sb.from('bv_profiles').update(patch).eq('id',S.user.id).select('id,display_name,pronouns,bio,avatar_emoji,room_accent,room_css').single();
      if(error)throw error;
      if(!data||data.id!==S.user.id||data.room_css!==patch.room_css)throw new Error('Your saved skin could not be confirmed. Please try again.');
      Object.assign(S.me,data);discardUploads([draft.trackPath,draft.coverPath]);close();toast('Your room, your skin. Saved.');S.tab='room';S.roomHandle=null;await render();
    }catch(e){errorBox.textContent=e.message||'Your room could not be saved. Your changes are still here.';}
    finally{button.disabled=false;button.textContent='Save my room';}
  }
  openDecorate=function(){open();};
  window.BulaSkinStudio={apply,reset,open,preview};
})();
