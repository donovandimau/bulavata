(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SotaLifeConnections=api;
})(typeof window==='object'?window:globalThis,function(){
  'use strict';
  const CATEGORIES=Object.freeze([
    {id:'friends',name:'Friends',icon:'🤝',color:'#f26045',ink:'#8a281a',note:'The mates who make ordinary days better.'},
    {id:'family',name:'Family',icon:'❤️',color:'#e64e90',ink:'#962850',note:'Your roots. Your people. Your home.'},
    {id:'teachers',name:'Teachers',icon:'📚',color:'#9662dc',ink:'#65309f',note:'The people who helped you find your way.'},
    {id:'workmates',name:'Workmates',icon:'💼',color:'#4388e9',ink:'#21569c',note:'The crew you take on the day with.'},
    {id:'schoolmates',name:'School mates',icon:'🎓',color:'#20a8b5',ink:'#176a73',note:'Old classmates. New stories. Shared memories.'},
    {id:'dog',name:'Dog',icon:'🐶',color:'#df9b28',ink:'#80551b',note:'Four paws. A whole lot of love.'},
    {id:'cat',name:'Cat',icon:'🐱',color:'#de7b43',ink:'#8b4721',note:'Your independent little housemate.'},
    {id:'pets',name:'Other pets',icon:'🐾',color:'#76992a',ink:'#4d6818',note:'Feathers, fins, fur — all part of your world.'},
    {id:'nature',name:'Nature',icon:'🌿',color:'#29a578',ink:'#196947',note:'The living things you care for and connect with.'},
    {id:'other',name:'Other connections',icon:'🌺',color:'#bb5bb3',ink:'#81387b',note:'Neighbours, mentors and every other living connection.'}
  ]);
  const LIMIT=120,MAX_NAME=60,MAX_KIND=40;
  const category=id=>CATEGORIES.find(c=>c.id===id)||CATEGORIES[0];
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clean=(value,max)=>typeof value==='string'?value.trim().replace(/[\u0000-\u001f\u007f]/g,'').slice(0,max):'';
  const keyFor=owner=>'sota-life-connections:v1:'+(owner?'account:'+encodeURIComponent(String(owner)):'guest');
  function sanitize(records){
    if(!Array.isArray(records))return [];
    const seen=new Set();
    return records.slice(0,LIMIT).flatMap(record=>{
      if(!record||typeof record!=='object')return [];
      const id=clean(record.id,80),name=clean(record.name,MAX_NAME),kind=clean(record.kind,MAX_KIND);
      if(!id||!name||seen.has(id)||!CATEGORIES.some(c=>c.id===record.category))return [];
      seen.add(id);return [{id,name,category:record.category,kind}];
    });
  }
  function readRecords(storage,owner){
    try{
      const raw=storage?.getItem(keyFor(owner));
      if(!raw)return {records:[],available:!!storage};
      const value=JSON.parse(raw);
      if(!value||value.version!==1||!Array.isArray(value.records))return {records:[],available:true,invalid:true};
      return {records:sanitize(value.records),available:true};
    }catch(_){return {records:[],available:false};}
  }
  function saveRecords(storage,owner,records){
    try{if(!storage)return false;storage.setItem(keyFor(owner),JSON.stringify({version:1,records:sanitize(records)}));return true;}
    catch(_){return false;}
  }
  function acceptedFriends(friends){
    const seen=new Set();
    return (Array.isArray(friends)?friends:[]).slice(0,LIMIT).flatMap(friend=>{
      if(!friend||typeof friend!=='object')return [];
      const id=clean(String(friend.id||friend.key||friend.handle||''),100),name=clean(friend.display_name||friend.label||friend.handle,MAX_NAME);
      if(!id||!name||seen.has(id))return [];
      seen.add(id);
      return [{id:'accepted:'+id,name,category:'friends',kind:'Accepted Sota Kece friend',accepted:true,handle:clean(friend.handle,30)}];
    });
  }
  function graphModel(records,friends){
    const members=[...sanitize(records),...acceptedFriends(friends)];
    return {self:'you',hubs:CATEGORIES.map(c=>({...c,count:members.filter(m=>m.category===c.id).length})),members,
      edges:CATEGORIES.map(c=>({source:'you',target:c.id}))};
  }
  // Percent coordinates remain stable while selecting, searching and editing.
  // A tall portrait orbit keeps 44px targets and names legible on small phones.
  function positions(){
    const result={you:{x:50,y:50}};
    const ys=[10,30,50,70,90];
    CATEGORIES.forEach((c,i)=>{result[c.id]={x:i<5?19:81,y:ys[i%5]};});
    return result;
  }
  let sequence=0;
  function mount(host,{owner='',friends=[]}={}){
    if(!host)throw new Error('A life connections container is required.');
    const uid='slc-'+(++sequence),listeners=[],q=s=>host.querySelector(s);
    let storage=null;
    try{storage=window.localStorage;}catch(_){}
    const saved=readRecords(storage,owner);
    let records=saved.records,remote=acceptedFriends(friends),selected='friends',query='',editing='',disposed=false,saveAvailable=saved.available;
    let motion=!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const on=(el,event,fn)=>{el.addEventListener(event,fn);listeners.push(()=>el.removeEventListener(event,fn));};
    host.classList.add('slc');
    host.innerHTML=`<div class="slc-topline"><span class="slc-eyebrow">A LITTLE MAP OF YOUR WORLD</span><button type="button" class="slc-motion" data-slc-motion aria-pressed="${motion}">${motion?'Ⅱ Pause motion':'▷ Start motion'}</button></div>
      <div class="slc-intro"><h3>Life is better.<br><span>Connected.</span></h3><p>People, paws, plants and everyone in between. There’s a place for them all.</p></div>
      <div class="slc-map" data-slc-map role="group" aria-label="Your life connection categories. Choose a branch to see or add connections.">
        <svg class="slc-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${CATEGORIES.map(c=>{const p=positions()[c.id];return `<path data-slc-edge="${c.id}" d="M 50 50 C ${p.x<50?38:62} 50, ${p.x<50?41:59} ${p.y}, ${p.x} ${p.y}" style="--slc-color:${c.color}"/>`;}).join('')}</svg>
        <div class="slc-center" aria-label="You, at the heart of your connections"><span aria-hidden="true">☀</span><strong>You</strong><small>at the heart</small></div>
        ${CATEGORIES.map((c,i)=>{const p=positions()[c.id];return `<button type="button" class="slc-node" style="--slc-x:${p.x}%;--slc-y:${p.y}%;--slc-color:${c.color};--slc-ink:${c.ink};--slc-delay:${i*-0.37}s" data-slc-category="${c.id}" aria-pressed="${c.id===selected}" aria-controls="${uid}-details"><span class="slc-node-icon" aria-hidden="true">${c.icon}</span><span class="slc-node-name">${esc(c.name)}</span><span class="slc-node-count" data-slc-count="${c.id}"></span></button>`;}).join('')}
      </div>
      <div class="slc-under-map"><p><span class="slc-tap-dot" aria-hidden="true"></span> Tap a branch. Grow your world.</p><strong data-slc-total></strong></div>
      <div class="slc-details" id="${uid}-details"><div class="slc-branch-head"><span class="slc-branch-icon" data-slc-branch-icon aria-hidden="true"></span><div><h4 data-slc-branch-name></h4><p data-slc-branch-note></p></div><button type="button" class="slc-add" data-slc-add>＋ Add</button></div>
      <label class="slc-search"><span class="slc-sr-only">Search all life connections</span><span aria-hidden="true">⌕</span><input type="search" maxlength="60" placeholder="Find someone in your world…" data-slc-search autocomplete="off"></label>
      <p class="slc-results-label" data-slc-results-label hidden></p><div class="slc-members" data-slc-members></div>
      <form class="slc-form" data-slc-form hidden><div class="slc-form-heading"><h4 data-slc-form-title>Add a connection</h4><button class="slc-close" type="button" data-slc-cancel aria-label="Close connection form">×</button></div><label for="${uid}-name">Name<input id="${uid}-name" name="connectionName" required maxlength="60" placeholder="A person, pet or living thing" autocomplete="off"></label>
      <div class="slc-form-row"><label for="${uid}-category">Connection<select id="${uid}-category" name="connectionCategory">${CATEGORIES.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label><label for="${uid}-kind">Their role <span>(optional)</span><input id="${uid}-kind" name="connectionKind" maxlength="40" placeholder="e.g. cousin, horse, mango tree" autocomplete="off"></label></div>
      <p class="slc-form-note">Only add details you’re comfortable keeping in this browser.</p><p class="slc-form-error" data-slc-error role="alert" hidden></p><button type="submit" class="slc-save">Save connection ↗</button></form>
      </div><div class="slc-storage"><span aria-hidden="true">⌂</span><p><strong data-slc-storage-title>Saved on this device</strong><span data-slc-storage-note>${owner?'Your additions are kept separately for this account in this browser.':'Your personal map stays in this browser. Signing in uses a separate map.'} Accepted Sota Kece friends appear when signed in.</span></p></div><p class="slc-status slc-sr-only" data-slc-status role="status" aria-live="polite"></p>`;
    function allMembers(){return [...records,...remote];}
    function message(text){q('[data-slc-status]').textContent=text;}
    function setStorageState(){
      q('[data-slc-storage-title]').textContent=saveAvailable?'Saved on this device':'Temporary map · saving unavailable';
      if(!saveAvailable)q('[data-slc-storage-note]').textContent='This browser could not save your additions. They will be lost when you leave or reload.';
    }
    function persist(){saveAvailable=saveRecords(storage,owner,records);setStorageState();}
    function countText(count){return count?String(count):'';}
    function draw(){
      if(disposed)return;
      const c=category(selected),members=allMembers(),filtered=query?members.filter(m=>`${m.name} ${m.kind} ${category(m.category).name}`.toLocaleLowerCase().includes(query)):members.filter(m=>m.category===selected);
      host.classList.toggle('slc-paused',!motion);host.style.setProperty('--slc-selected',c.color);host.style.setProperty('--slc-selected-ink',c.ink);
      q('[data-slc-motion]').textContent=motion?'Ⅱ Pause motion':'▷ Start motion';q('[data-slc-motion]').setAttribute('aria-pressed',String(motion));
      q('[data-slc-total]').textContent=members.length?`${members.length} ${members.length===1?'connection':'connections'}`:'Your story starts here';
      CATEGORIES.forEach(cat=>{const button=q(`[data-slc-category="${cat.id}"]`),count=members.filter(m=>m.category===cat.id).length;button.setAttribute('aria-pressed',String(selected===cat.id));button.setAttribute('aria-label',cat.name+(count?`, ${count} ${count===1?'connection':'connections'}`:', add a connection'));q(`[data-slc-count="${cat.id}"]`).textContent=countText(count);q(`[data-slc-count="${cat.id}"]`).hidden=!count;q(`[data-slc-edge="${cat.id}"]`).classList.toggle('slc-edge-selected',selected===cat.id);});
      q('[data-slc-branch-icon]').textContent=c.icon;q('[data-slc-branch-name]').textContent=c.name;q('[data-slc-branch-note]').textContent=c.note;
      q('[data-slc-results-label]').hidden=!query;q('[data-slc-results-label]').textContent=`${filtered.length} ${filtered.length===1?'match':'matches'} across your world`;
      q('[data-slc-add]').setAttribute('aria-label','Add to '+c.name);
      q('[data-slc-members]').innerHTML=filtered.length?filtered.map(m=>`<div class="slc-member" style="--slc-member-color:${category(m.category).color}"><span class="slc-member-icon" aria-hidden="true">${category(m.category).icon}</span><div><strong>${esc(m.name)}</strong><small>${esc(m.kind||category(m.category).name)}${query?' · '+esc(category(m.category).name):''}</small></div>${m.accepted?'<span class="slc-accepted">Sota friend</span>':`<button type="button" class="slc-edit" data-slc-edit="${esc(m.id)}" aria-label="Edit ${esc(m.name)}">Edit</button>`}</div>`).join(''):`<div class="slc-empty"><span aria-hidden="true">${query?'⌕':c.icon}</span><p><strong>${query?'No connections found.':'Make room for '+(c.id==='other'?'every living connection':c.name.toLocaleLowerCase())+'.'}</strong><span>${query?'Try another name, role or connection.':'Add a name and see this branch grow. No personal connections have been added here yet.'}</span></p></div>`;
      setStorageState();
    }
    function openForm(id){
      const record=id?records.find(r=>r.id===id):null;
      editing=record?.id||'';
      q('[data-slc-form-title]').textContent=editing?'Edit connection':'Add a connection';
      q('[data-slc-form] [name="connectionName"]').value=record?.name||'';
      q('[data-slc-form] [name="connectionCategory"]').value=record?.category||selected;
      q('[data-slc-form] [name="connectionKind"]').value=record?.kind||'';
      q('[data-slc-error]').hidden=true;
      const old=q('[data-slc-remove]');if(old)old.remove();
      if(editing){const button=document.createElement('button');button.type='button';button.className='slc-remove';button.dataset.slcRemove=editing;button.textContent='Remove connection';q('[data-slc-form]').append(button);}
      q('[data-slc-form]').hidden=false;q('[data-slc-form] [name="connectionName"]').focus();
    }
    function closeForm(){q('[data-slc-form]').hidden=true;editing='';q('[data-slc-add]').focus({preventScroll:true});}
    on(host,'click',event=>{
      const hub=event.target.closest('[data-slc-category]');
      if(hub&&host.contains(hub)){selected=hub.dataset.slcCategory;query='';q('[data-slc-search]').value='';q('[data-slc-form]').hidden=true;editing='';draw();message(category(selected).name+' branch selected.');return;}
      const edit=event.target.closest('[data-slc-edit]');if(edit&&host.contains(edit)){openForm(edit.dataset.slcEdit);return;}
      const remove=event.target.closest('[data-slc-remove]');
      if(remove&&host.contains(remove)){const deleted=records.find(r=>r.id===editing);records=records.filter(r=>r.id!==editing);persist();closeForm();draw();message((deleted?.name||'Connection')+' removed.');}
    });
    on(q('[data-slc-add]'),'click',()=>openForm());
    on(q('[data-slc-cancel]'),'click',closeForm);
    on(q('[data-slc-motion]'),'click',()=>{motion=!motion;draw();});
    on(q('[data-slc-search]'),'input',event=>{query=event.target.value.trim().toLocaleLowerCase();draw();});
    on(q('[data-slc-form]'),'keydown',event=>{if(event.key==='Escape'){event.preventDefault();closeForm();}});
    on(q('[data-slc-form]'),'submit',event=>{
      event.preventDefault();
      const name=clean(q('[data-slc-form] [name="connectionName"]').value,MAX_NAME),cat=q('[data-slc-form] [name="connectionCategory"]').value,kind=clean(q('[data-slc-form] [name="connectionKind"]').value,MAX_KIND),issue=q('[data-slc-error]');
      if(!name){issue.textContent='Add a name for this connection.';issue.hidden=false;return;}
      if(!editing&&records.length>=LIMIT){issue.textContent='This device map can hold 120 personal connections. Edit or remove one before adding another.';issue.hidden=false;return;}
      const id=editing||('life-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10)),record={id,name,category:category(cat).id,kind};
      records=editing?records.map(r=>r.id===editing?record:r):[...records,record];selected=record.category;query='';q('[data-slc-search]').value='';persist();closeForm();draw();message(name+(saveAvailable?' saved on this device.':' added temporarily. Saving is unavailable.'));
    });
    on(window,'storage',event=>{if(event.key===keyFor(owner)){const updated=readRecords(storage,owner);records=updated.records;saveAvailable=updated.available;draw();}});
    draw();
    return {updateFriends(next){if(disposed)return;remote=acceptedFriends(next);draw();},dispose(){disposed=true;listeners.forEach(fn=>fn());records=[];remote=[];host.replaceChildren();host.classList.remove('slc','slc-paused');}};
  }
  return {mount,CATEGORIES,keyFor,sanitize,readRecords,saveRecords,acceptedFriends,graphModel,positions};
});
