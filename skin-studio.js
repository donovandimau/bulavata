(function() {
  'use strict';
  const skins = window.BulaSkins;
  if (!skins) return;
  let studio = null, draft = null, legacy = '', focusBefore = null;
  const example = {display_name:'Your name goes here',handle:'yourhandle',avatar_emoji:'🌺',bio:'A little corner of the internet that feels like you.'};
  function picked() {
    try { return skins.normalize(JSON.parse(localStorage.getItem('bv-picked-skin')||'null')); }
    catch (_) { return skins.normalize(); }
  }
  function preview(profile, settings) {
    const s=skins.normalize(settings),p=skins.presets.find(p=>p.id===s.id);
    const interests=s.interests.split(',').map(x=>x.trim()).filter(Boolean).slice(0,8);
    return `<div class="bv-preview" style="${esc(skins.inline(s))}" data-layout="${s.layout}">
      <div class="bv-cover"><div class="bv-cover-words">${esc(s.note||p.note)}</div><span class="bv-skin-tag">${esc(p.name)}</span></div>
      <div class="bv-profile-intro"><div class="bv-profile-avatar">${esc(profile.avatar_emoji||'🌺')}</div>
        <h2>${esc(profile.display_name||profile.handle||'Your name')}</h2>
        <p>@${esc(profile.handle||'yourhandle')}</p><p>${esc(profile.bio||'Your profile. Your people. Your rules.')}</p>
        ${interests.length?`<div class="bv-interests">${interests.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`:''}</div>
      <div class="bv-preview-columns"><section class="bv-mini-card"><h3>Talanoa · Whiteboard</h3><p>Banter, memes and shoutouts. Straight from your mates, with no algorithm in between.</p></section>
        <section class="bv-mini-card"><h3>Top Mates · 16</h3><div class="bv-mini-friends">${['🌺','🌴','🌊','🐚','☀️','🪸','🍍','🦋','🏉','🎸','🥥','🌻','🐬','🦜','⭐','🌈'].map((e,i)=>`<span title="Example mate #${i+1}"><small>${i+1}</small>${e}</span>`).join('')}</div></section></div>
        ${trackMarkup(s)}</div>`;
  }
  function trackMarkup(settings) {
    return settings.trackUrl?`<div class="bv-track"><span>♫ ${esc(settings.trackTitle||'My profile track')}</span><button type="button" class="btn sm ghost" data-profile-track="${esc(settings.trackUrl)}">Play track</button><small>Tap to load. No autoplay.</small></div>`:'';
  }
  function wireMedia(root) {
    root.querySelectorAll('[data-profile-track]:not([data-bv-bound])').forEach(button=>{button.dataset.bvBound='true';button.addEventListener('click',()=>{
      const audio=document.createElement('audio');audio.controls=true;audio.preload='none';audio.src=button.dataset.profileTrack;
      audio.setAttribute('aria-label','Profile track');button.replaceWith(audio);
      audio.play().catch(()=>{audio.parentElement.querySelector('small').textContent='Tap the audio controls to play. If unavailable, try again later.';});
    },{once:true});});
    root.querySelectorAll('[data-media-url]:not([data-bv-bound])').forEach(button=>{button.dataset.bvBound='true';button.addEventListener('click',()=>{
      const image=document.createElement('img');image.alt='Shared image';image.loading='lazy';image.decoding='async';image.referrerPolicy='no-referrer';image.src=button.dataset.mediaUrl;
      image.addEventListener('error',()=>{image.replaceWith(button);button.textContent='Image unavailable · tap to retry';});button.replaceWith(image);
    });});
  }
  function reset() {
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
      const cover=document.createElement('div');cover.className='bv-cover';
      cover.innerHTML=`<div class="bv-cover-words">${esc(s.note||p.note)}</div><span class="bv-skin-tag">${esc(p.name)}</span>`;
      head.prepend(cover);
      const stats=document.createElement('div');stats.className='bv-profile-stats';
      stats.innerHTML=`<span><b>${(room.top||[]).length}</b>Top friends</span><span><b>${(room.moments||[]).length}</b>Moments</span><span><b>${(room.wall||[]).length}</b>Whiteboard notes</span>`;
      head.appendChild(stats);
      if(s.trackUrl){const track=document.createElement('div');track.innerHTML=trackMarkup(s);head.appendChild(track.firstElementChild);}
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
  renderAuth=function(mode='in'){
    reset();originalAuth(mode);
    const auth=app.innerHTML;
    app.classList.add('bv-welcome');
    app.innerHTML=`<header class="top glass"><div class="row">${LOGO}<div class="brand">Sota Kece<small>alive together</small></div></div><div class="spacer"></div><span class="pill">Real friends. Real colour.</span></header>
      <div class="bv-welcome-grid"><section class="bv-intro"><div class="bv-eyebrow">Remember when your profile felt like you?</div>
        <h1>Your friends.<br>Your space.<br><span>Your rules.</span></h1>
        <p>Your people, from home to wherever life takes you. Pick a skin, rank your Top Mates, share a track and leave some banter on the Talanoa whiteboard.</p>
        <div class="row wrap"><button type="button" class="btn" id="bv-try-studio">Try the skin studio ↗</button><span class="sub">No account needed to play.</span></div>
        <div class="bv-badges"><span>Top Mates 16</span><span>Personal skins + music</span><span>Low data by default</span></div>
        <div class="bv-example-label"><span>Example room · try a skin</span><span id="bv-welcome-skin-name"></span></div>
        <div id="bv-welcome-preview"></div><div class="bv-gallery-strip" id="bv-welcome-chips"></div></section>
        <section aria-label="Sign in or create your room">${auth}</section></div>`;
    // Replacing the wrapper recreates controls, so restore the original auth handlers.
    $('#a-go').onclick=()=>mode==='up'?signUp():signIn();
    app.querySelectorAll('.authwrap input').forEach(i=>i.addEventListener('keydown',e=>{if(e.key==='Enter')$('#a-go').click();}));
    $('#bv-try-studio').addEventListener('click',()=>open());
    showWelcome(picked());
  };
  function showWelcome(settings) {
    const s=skins.normalize(settings);
    const box=document.querySelector('#bv-welcome-preview');if(!box)return;
    box.innerHTML=preview(example,s);
    wireMedia(box);
    $('#bv-welcome-skin-name').textContent=skins.presets.find(p=>p.id===s.id).name;
    $('#bv-welcome-chips').innerHTML=skins.presets.map(p=>`<button type="button" class="bv-chip" data-welcome-skin="${p.id}" aria-pressed="${p.id===s.id}"><span class="bv-dot" style="${esc(skins.inline({id:p.id}))}"></span>${esc(p.name)}</button>`).join('');
    $('#bv-welcome-chips').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
      const selected=skins.normalize({id:b.dataset.welcomeSkin});
      try{localStorage.setItem('bv-picked-skin',JSON.stringify(selected));}catch(_){}
      showWelcome(selected);
    }));
  }
  function open(initial) {
    if(studio)return;
    const parsed=skins.read(S.me?.room_css);
    const current=String(S.me?.room_css||'');
    draft=skins.normalize(initial||(!S.user||!current?picked():current.startsWith('/* bv-skin:v1 ')?parsed.settings:{...parsed.settings,accent:S.me.room_accent}));
    legacy=parsed.legacy;focusBefore=document.activeElement;
    const p=S.me||example;
    studio=document.createElement('dialog');studio.className='bv-studio';studio.setAttribute('aria-labelledby','bv-studio-title');
    studio.innerHTML=`<div class="bv-studio-head"><div><h2 id="bv-studio-title">Make it yours.</h2><p>Pick a skin. Mix the colours. Give your room a personality.</p></div><button type="button" class="bv-close" aria-label="Close skin studio">×</button></div>
      <div class="bv-studio-body"><div><h3>Find your skin</h3><div class="bv-skin-grid" id="bv-skin-options"></div>
      <h3>Add your own twist</h3><div class="bv-controls">
        <div><label for="bv-accent">Accent colour</label><input id="bv-accent" type="color" value="${draft.accent}"></div>
        <div><label for="bv-background">Page colour</label><input id="bv-background" type="color" value="${draft.background}"></div>
        <div><label for="bv-pattern">Background pattern</label><select id="bv-pattern">${skins.patterns.map(v=>`<option value="${v}" ${draft.pattern===v?'selected':''}>${v[0].toUpperCase()+v.slice(1)}</option>`).join('')}</select></div>
        <div><label for="bv-font">Your lettering</label><select id="bv-font">${[['rounded','Rounded'],['serif','Storybook'],['mono','Typewriter']].map(([v,t])=>`<option value="${v}" ${draft.font===v?'selected':''}>${t}</option>`).join('')}</select></div>
        <div class="bv-span"><label for="bv-layout">Room layout</label><select id="bv-layout"><option value="classic" ${draft.layout==='classic'?'selected':''}>Classic · wall and friends side by side</option><option value="wide" ${draft.layout==='wide'?'selected':''}>Wide · give your wall more space</option></select></div>
        <div class="bv-span"><label for="bv-note">Words on your cover</label><input id="bv-note" value="${esc(draft.note)}" maxlength="80" placeholder="Whatever feels like you"></div>
        <div class="bv-span"><label for="bv-interests">Your favourites, separated by commas</label><input id="bv-interests" value="${esc(draft.interests)}" maxlength="160" placeholder="Drua, music, sunsets, good company"></div>
        <div class="bv-span"><label for="bv-trackTitle">Your profile track</label><input id="bv-trackTitle" value="${esc(draft.trackTitle)}" maxlength="80" placeholder="Song name · artist"></div>
        <div class="bv-span"><label for="bv-trackUrl">Audio file link (optional)</label><input id="bv-trackUrl" type="url" value="${esc(draft.trackUrl)}" maxlength="320" placeholder="https://…/your-track.mp3"><p class="sub">Use an HTTPS MP3, M4A, OGG, Opus or WAV file you can share. Loads only when a visitor taps Play.</p></div></div>
      ${S.user&&S.me?`<details><summary>Edit your profile</summary><div class="stack"><div><label for="d-name">Display name</label><input id="d-name" value="${esc(p.display_name||'')}" maxlength="40"></div>
        <div><label for="d-pro">Pronouns</label><input id="d-pro" value="${esc(p.pronouns||'')}" maxlength="24"></div>
        <div><label for="d-bio">Bio</label><textarea id="d-bio" maxlength="400">${esc(p.bio||'')}</textarea></div>
        <div><label for="d-emo">Your emoji</label><input id="d-emo" value="${esc(p.avatar_emoji||'🌺')}" maxlength="8"></div></div></details>
        <details><summary>Advanced: your custom CSS</summary><p class="sub">Style room cards and text. External files and page overlays are excluded.</p><label for="d-css">Room CSS</label><textarea id="d-css" maxlength="3000" placeholder=".scrawl { border-radius: 20px; }">${esc(legacy)}</textarea></details>`:''}</div>
      <aside class="bv-studio-preview"><div class="bv-example-label"><span>${S.user?'Your room · live preview':'Example room · live preview'}</span><span id="bv-preview-name"></span></div><div id="bv-studio-preview"></div><p class="sub" style="font-size:11px;line-height:1.7;margin-top:14px">${S.user?'Your friends will see this skin when they visit your room.':'These are example details. Your own name, friends and posts appear when you make a room.'}</p></aside></div>
      <div class="bv-studio-footer"><div class="bv-studio-error" id="bv-studio-error" role="status" aria-live="polite"></div><div class="row"><button type="button" class="btn ghost" id="bv-cancel">Cancel</button><button type="button" class="btn" id="bv-save">${S.user?'Save my room':'Use this skin'}</button></div></div>`;
    document.body.appendChild(studio);
    studio.querySelector('.bv-close').addEventListener('click',close);
    studio.querySelector('#bv-cancel').addEventListener('click',close);
    studio.querySelector('#bv-save').addEventListener('click',save);
    studio.addEventListener('cancel',()=>{studio=null;draft=null;focusBefore?.focus();});
    studio.addEventListener('close',()=>{const dialog=document.querySelector('dialog.bv-studio');dialog?.remove();studio=null;draft=null;focusBefore?.focus();});
    studio.addEventListener('input',update);studio.addEventListener('change',update);
    drawOptions();drawPreview();studio.showModal();
  }
  function close() {studio?.close();}
  function drawOptions() {
    studio.querySelector('#bv-skin-options').innerHTML=skins.presets.map(p=>`<button type="button" class="bv-skin-option" data-skin="${p.id}" aria-pressed="${draft.id===p.id}" aria-label="${esc(p.name)} skin"><div class="bv-skin-swatch" style="${esc(skins.inline({id:p.id}))}">Aa.</div><strong>${esc(p.name)}</strong><small>${esc(p.category)} · ${esc(p.note)}</small></button>`).join('');
    studio.querySelectorAll('[data-skin]').forEach(b=>b.addEventListener('click',()=>{
      draft=skins.normalize({id:b.dataset.skin,layout:draft.layout,interests:draft.interests,trackUrl:draft.trackUrl,trackTitle:draft.trackTitle});
      for(const key of ['accent','background','pattern','font','note','layout','interests','trackUrl','trackTitle'])studio.querySelector('#bv-'+key).value=draft[key];
      drawOptions();drawPreview();studio.querySelector(`[data-skin="${draft.id}"]`).focus();
    }));
  }
  function update() {
    if(!studio||!draft)return;
    for(const key of ['accent','background','pattern','font','note','layout','interests','trackUrl','trackTitle'])draft[key]=studio.querySelector('#bv-'+key).value;
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
    if(!studio||!draft)return;
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
      Object.assign(S.me,data);close();toast('Your room, your skin. Saved.');S.tab='room';S.roomHandle=null;await render();
    }catch(e){errorBox.textContent=e.message||'Your room could not be saved. Your changes are still here.';}
    finally{button.disabled=false;button.textContent='Save my room';}
  }
  openDecorate=function(){open();};
  window.BulaSkinStudio={apply,reset,open,preview};
})();
