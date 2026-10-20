(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SotaConnections=api;
})(typeof window==='object'?window:globalThis,function(){
  'use strict';
  const MAX_FRIENDS=120,MAX_GROUPS=40;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pid=id=>'person:'+id, gid=id=>'group:'+id;
  let ctx,epoch=0,mounted=null;
  function model(me,friends,groups,memberships){
    const nodes=[],edges=[],people=new Set(),crews=new Set(),seenEdges=new Set();
    const self=pid(me.id);
    function person(p,isSelf){
      if(!p.id||people.has(String(p.id)))return;
      people.add(String(p.id));nodes.push({id:pid(p.id),key:String(p.id),type:isSelf?'you':'person',
        label:isSelf?'You':String(p.display_name||p.handle||'Friend'),handle:String(p.handle||''),emoji:String(p.avatar_emoji||'🌺')});
    }
    function edge(a,b,type){const key=[a,b,type].join('|');if(!seenEdges.has(key)){seenEdges.add(key);edges.push({source:a,target:b,type});}}
    person(me,true);
    for(const f of friends){person(f,false);if(f.id&&pid(f.id)!==self)edge(self,pid(f.id),'friend');}
    for(const c of groups){
      if(c.id==null||crews.has(String(c.id)))continue;
      crews.add(String(c.id));nodes.push({id:gid(c.id),key:String(c.id),type:'group',label:String(c.name||'Your Koro'),emoji:String(c.emoji||'🪸')});
      edge(self,gid(c.id),'member');
    }
    // A membership is drawn only for an accepted friend AND a Koro returned by bv_my_crews.
    // It never discovers strangers, private groups or someone else's friendship network.
    for(const m of memberships){
      if(people.has(String(m.member))&&crews.has(String(m.crew_id))&&pid(m.member)!==self)edge(pid(m.member),gid(m.crew_id),'member');
    }
    return {nodes,edges,self};
  }
  async function load(client,state){
    if(!state.user?.id||!state.me)throw new Error('Sign in to see your connections.');
    const [fr,gr]=await Promise.all([client.rpc('bv_my_friends'),client.rpc('bv_my_crews')]);
    if(fr.error||gr.error)throw new Error('Your connections could not be loaded. Please try again.');
    const notices=[];
    const allFriends=fr.data||[],allGroups=gr.data||[];
    const friends=allFriends.filter(f=>f.id).slice(0,MAX_FRIENDS),groups=allGroups.slice(0,MAX_GROUPS);
    if(allFriends.some(f=>!f.id))notices.push('Some friend records could not be mapped.');
    if(allFriends.length>MAX_FRIENDS||allGroups.length>MAX_GROUPS)notices.push('Showing up to 120 friends and 40 Koro.');
    const memberships=[];
    if(friends.length&&groups.length){
      // Narrow both sides before reading. The signed-in Supabase client retains its existing policies.
      for(let offset=0;offset<5000;offset+=1000){
        const r=await client.from('bv_crew_members').select('crew_id,member')
          .in('crew_id',groups.map(c=>c.id)).in('member',friends.map(f=>f.id)).range(offset,offset+999);
        if(r.error){notices.push('Shared Koro memberships are unavailable. Your direct connections are shown.');memberships.length=0;break;}
        const page=r.data||[];memberships.push(...page);if(page.length<1000)break;
        if(offset===4000)notices.push('Shared memberships are limited to the first 5,000 visible records.');
      }
    }
    return {graph:model({...state.me,id:state.user.id},friends,groups,memberships),notices,updated:new Date()};
  }
  function path(graph,target){
    const queue=[[graph.self]],visited=new Set([graph.self]);
    while(queue.length){const route=queue.shift(),last=route[route.length-1];if(last===target)return route;
      for(const e of graph.edges){const next=e.source===last?e.target:e.target===last?e.source:null;
        if(next&&!visited.has(next)){visited.add(next);queue.push([...route,next]);}}
    }return [];
  }
  function layout(graph){
    const positions=new Map([[graph.self,{x:450,y:310}]]);
    const people=graph.nodes.filter(n=>n.type==='person'),groups=graph.nodes.filter(n=>n.type==='group');
    function ring(list,rx,ry,phase){list.forEach((n,i)=>{const a=phase+2*Math.PI*i/Math.max(1,list.length);positions.set(n.id,{x:450+rx*Math.cos(a),y:310+ry*Math.sin(a)});});}
    if(people.length<=18)ring(people,205,180,-Math.PI/2);
    else for(let i=0;i<people.length;i+=24)ring(people.slice(i,i+24),75+Math.floor(i/24)*42,65+Math.floor(i/24)*35,-Math.PI/2);
    ring(groups,355,265,-Math.PI/2+0.35);
    return positions;
  }
  function example(){
    return {graph:model({id:'you',handle:'your_room'},[
      {id:'sina',display_name:'Sina',handle:'sina',avatar_emoji:'🌺'},
      {id:'jone',display_name:'Jone',handle:'jone',avatar_emoji:'🌴'},
      {id:'ana',display_name:'Ana',handle:'ana',avatar_emoji:'🐚'},
      {id:'lani',display_name:'Lani',handle:'lani',avatar_emoji:'☀️'},
      {id:'tevita',display_name:'Tevita',handle:'tevita',avatar_emoji:'🌊'},
      {id:'mere',display_name:'Mere',handle:'mere',avatar_emoji:'🌻'}
    ],[{id:1,name:'Our village',emoji:'🪸'},{id:2,name:'Sunday stories',emoji:'📖'},{id:3,name:'Island music',emoji:'🎵'}],
    [{member:'sina',crew_id:1},{member:'jone',crew_id:1},{member:'ana',crew_id:1},{member:'ana',crew_id:2},
      {member:'lani',crew_id:2},{member:'mere',crew_id:2},{member:'jone',crew_id:3},{member:'tevita',crew_id:3},{member:'mere',crew_id:3}]),
      notices:[],updated:null};
  }
  function init(context){ctx=context;}
  function stop(){epoch++;if(mounted)mounted.dispose();mounted=null;}
  const hero=()=>`<section class="glass sc-hero"><p class="sc-kicker">Sota Kece · Connections</p><h1>Our people. Our circles.</h1>
    <p>See the friendships and Koro that bring your community together.</p></section>`;
  function preview(){
    stop();const run=epoch;
    ctx.app.innerHTML=`<div class="sc-preview"><button class="btn sm ghost" id="sc-back">← Back to Sota Kece</button>${hero()}<div id="sc-root"></div></div>`;
    document.querySelector('#sc-back').onclick=()=>{stop();if(location.hash==='#connections=example')history.replaceState(null,'',location.pathname+location.search);ctx.auth();};
    mounted=mount(document.querySelector('#sc-root'),example(),{demo:true,valid:()=>run===epoch});
  }
  async function view(){
    stop();const run=epoch,user=ctx.state.user?.id;
    if(!user)return ctx.auth();
    ctx.shell(`${hero()}<div id="sc-root" class="glass card" role="status">Loading your connections…</div>`);
    try{
      const result=await load(ctx.client,ctx.state);
      if(run!==epoch||ctx.state.tab!=='connections'||ctx.state.user?.id!==user)return;
      mounted=mount(document.querySelector('#sc-root'),result,{demo:false,valid:()=>run===epoch,reload:view,
        open:n=>{stop();if(n.type==='group'){ctx.state.tab='crews';ctx.state.crew=Number(n.key);ctx.render();}else ctx.openRoom(n.handle);}});
    }catch(err){
      if(run!==epoch||ctx.state.tab!=='connections')return;
      const box=document.querySelector('#sc-root');if(!box)return;
      box.innerHTML='<h2>Connection interrupted</h2><p>We could not load your connections. Try again when your signal returns.</p><button class="btn sm" id="sc-retry">Try again</button>';
      document.querySelector('#sc-retry').onclick=view;
    }
  }
  function mount(host,result,options){
    host.className='sc-workspace';const graph=result.graph,byId=new Map(graph.nodes.map(n=>[n.id,n]));
    let selected=graph.self,filter='all',query='',focus=false,scale=1,pan={x:0,y:0},drag=null,disposed=false;
    const listeners=[];
    function on(el,type,fn){el.addEventListener(type,fn);listeners.push(()=>el.removeEventListener(type,fn));}
    host.innerHTML=`${options.demo?'<div class="sc-notice"><b>Example community</b> · These people, groups and connections are fictional. Sign in for your own map.</div>':''}
      <div class="sc-toolbar glass"><div class="sc-search"><label for="sc-search">Find a person or Koro</label><input id="sc-search" type="search" maxlength="80" placeholder="Search names…" autocomplete="off"></div>
      <fieldset class="sc-filters"><legend>Show connections</legend><button type="button" data-filter="all" aria-pressed="true">Everyone</button><button type="button" data-filter="people" aria-pressed="false">Friends</button><button type="button" data-filter="groups" aria-pressed="false">Koro</button></fieldset>
      <button class="btn sm ghost" id="sc-refresh" ${options.demo?'hidden':''}>Refresh</button></div>
      <div class="sc-columns"><section class="glass sc-map-card" aria-label="Community connection map">
      <div class="sc-map-heading"><div><h2>Your connection map</h2><p id="sc-count" role="status" aria-live="polite"></p></div><label class="sc-focus"><input type="checkbox" id="sc-focus"> Focus selection</label></div>
      <div class="sc-key"><span>● You</span><span>○ Friend</span><span>◇ Koro</span><span>— Friendship</span><span>┄ Membership</span></div>
      <div class="sc-map"><svg id="sc-svg" viewBox="0 0 900 620" role="group" aria-label="Interactive map. Select a person or Koro, or use the list below."><g id="sc-camera"></g></svg>
      <div class="sc-zoom"><button id="sc-in" aria-label="Zoom in">+</button><button id="sc-out" aria-label="Zoom out">−</button><button id="sc-fit">Reset view</button></div></div>
      <p class="sc-hint">Tap a name to explore. Drag the background to move the map. The list offers the same connections.</p>
      <div class="sc-list-area"><h3>People &amp; Koro</h3><div class="sc-list" id="sc-list"></div></div></section>
      <aside class="glass sc-detail"><p class="sc-kicker">Connection details</p><div id="sc-detail" aria-live="polite"></div></aside></div>
      <div class="glass sc-privacy"><strong>Your view of the community</strong><p>Only your accepted friends and Koro you belong to appear here. Shared memberships appear when available to your account. A shared Koro does not mean two people are friends. This is not a map of every member.</p>
      <p id="sc-fresh">${options.demo?'Fictional example · no member data is loaded.':'Loaded '+esc(result.updated.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}))+'. Refresh to check for changes.'}</p>
      ${result.notices.map(n=>`<p class="sc-warning" role="status">${esc(n)}</p>`).join('')}</div>`;
    const q=s=>host.querySelector(s),svg=q('#sc-svg'),camera=q('#sc-camera');
    function visible(){
      let nodes=graph.nodes.filter(n=>n.type==='you'||filter==='all'||(filter==='people'?n.type==='person':n.type==='group'));
      if(query)nodes=nodes.filter(n=>n.id===graph.self||`${n.label} ${n.handle}`.toLocaleLowerCase().includes(query));
      if(focus){const neighbours=new Set([selected]);graph.edges.forEach(e=>{if(e.source===selected)neighbours.add(e.target);if(e.target===selected)neighbours.add(e.source);});nodes=nodes.filter(n=>neighbours.has(n.id));}
      const ids=new Set(nodes.map(n=>n.id));return {nodes,edges:graph.edges.filter(e=>ids.has(e.source)&&ids.has(e.target)),self:graph.self};
    }
    function setCamera(){camera.setAttribute('transform',`translate(${450+pan.x} ${310+pan.y}) scale(${scale}) translate(-450 -310)`);}
    function zoom(factor){scale=Math.min(3,Math.max(.5,scale*factor));setCamera();}
    function detail(){
      const n=byId.get(selected)||byId.get(graph.self),related=graph.edges.filter(e=>e.source===n.id||e.target===n.id);
      const neighbours=related.map(e=>({node:byId.get(e.source===n.id?e.target:e.source),type:e.type}));
      const route=path(graph,n.id).map(id=>byId.get(id).label);
      q('#sc-detail').innerHTML=`<div class="sc-avatar" aria-hidden="true">${esc(n.type==='you'?'🏝':n.emoji)}</div><h2>${esc(n.label)}</h2><p>${n.type==='group'?'Your Koro':n.type==='you'?'Your place in the community':'Your accepted friend'}${n.type!=='group'&&n.handle?' · @'+esc(n.handle):''}</p>
        ${n.id!==graph.self?`<p class="sc-route"><b>How you connect</b><br>${route.map(esc).join(' → ')}</p>`:'<p>Select a person or group to see what connects you.</p>'}
        ${!options.demo&&n.type!=='you'&&(n.type==='group'||n.handle)?'<button class="btn sm" id="sc-open">'+(n.type==='group'?'Open Koro':'Visit room')+'</button>':''}
        <h3>Visible connections (${neighbours.length})</h3><div class="sc-neighbours">${neighbours.map(({node:x,type})=>`<button type="button" data-select="${esc(x.id)}"><strong>${esc(x.label)}</strong><span>${type==='friend'?'Accepted friendship':'Koro membership'}</span></button>`).join('')||'<p>No connections yet. Add a friend or join a Koro to grow your map.</p>'}</div>
        ${!options.demo&&!related.length?'<button class="btn sm ghost" id="sc-find">Find friends</button>':''}`;
      if(q('#sc-open'))q('#sc-open').onclick=()=>{if(options.valid())options.open(n);};
      if(q('#sc-find'))q('#sc-find').onclick=()=>rootGo('friends');
    }
    function rootGo(tab){stop();ctx.go(tab);}
    function draw(){
      if(disposed||!options.valid())return;
      const v=visible(),p=layout(v),adjacent=new Set([selected]);
      svg.classList.toggle('sc-dense',v.nodes.length>24);
      v.edges.forEach(e=>{if(e.source===selected)adjacent.add(e.target);if(e.target===selected)adjacent.add(e.source);});
      camera.innerHTML=v.edges.map(e=>{const a=p.get(e.source),b=p.get(e.target),active=e.source===selected||e.target===selected;
        return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="sc-edge ${e.type==='member'?'sc-membership':''} ${active?'sc-active':''}"/>`;}).join('')+
        v.nodes.map(n=>{const a=p.get(n.id);return `<g class="sc-node sc-${n.type} ${n.id===selected?'sc-selected':''} ${adjacent.has(n.id)?'sc-near':''}" transform="translate(${a.x} ${a.y})" role="button" tabindex="0" aria-label="${esc(n.label+' · '+(n.type==='group'?'Koro':n.type==='you'?'you':'friend'))}" aria-pressed="${n.id===selected}" data-select="${esc(n.id)}">
          <title>${esc(n.label)}</title><circle class="sc-hit" r="30"/>${n.type==='group'?'<rect x="-24" y="-24" width="48" height="48" rx="8" transform="rotate(45)"/>':'<circle r="25"/>'}<text class="sc-symbol" y="7" text-anchor="middle" aria-hidden="true">${esc(n.type==='you'?'🏝':n.emoji)}</text><text class="sc-label" y="49" text-anchor="middle">${esc(n.label.length>18?n.label.slice(0,16)+'…':n.label)}</text></g>`;}).join('');
      setCamera();q('#sc-count').textContent=`${v.nodes.filter(n=>n.type==='person').length} friends · ${v.nodes.filter(n=>n.type==='group').length} Koro · ${v.edges.length} connections shown`;
      q('#sc-list').innerHTML=v.nodes.map(n=>`<button type="button" data-select="${esc(n.id)}" aria-pressed="${n.id===selected}"><span aria-hidden="true">${esc(n.type==='you'?'🏝':n.emoji)}</span><span>${esc(n.label)}<small>${n.type==='group'?'Koro':n.type==='you'?'You':'Friend'}</small></span></button>`).join('')+(v.nodes.length<=1&&query?'<p>No matching people or Koro.</p>':'');
      detail();
    }
    on(host,'click',event=>{const button=event.target.closest('[data-select]');if(button&&host.contains(button)){selected=button.dataset.select;draw();}});
    on(svg,'keydown',event=>{const node=event.target.closest('[data-select]');if(node&&(event.key==='Enter'||event.key===' ')){event.preventDefault();selected=node.dataset.select;draw();Array.from(q('#sc-list').querySelectorAll('[data-select]')).find(b=>b.dataset.select===selected)?.focus();}});
    on(q('#sc-search'),'input',event=>{query=event.target.value.trim().toLocaleLowerCase();draw();});
    host.querySelectorAll('[data-filter]').forEach(button=>on(button,'click',()=>{filter=button.dataset.filter;host.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));draw();}));
    on(q('#sc-focus'),'change',event=>{focus=event.target.checked;draw();});
    on(q('#sc-in'),'click',()=>zoom(1.25));on(q('#sc-out'),'click',()=>zoom(.8));on(q('#sc-fit'),'click',()=>{scale=1;pan={x:0,y:0};setCamera();});
    on(q('#sc-refresh'),'click',()=>options.reload?.());
    on(svg,'pointerdown',event=>{if(event.button!==0||event.target.closest('[data-select]'))return;drag={x:event.clientX,y:event.clientY,px:pan.x,py:pan.y};svg.setPointerCapture?.(event.pointerId);});
    on(svg,'pointermove',event=>{if(!drag)return;const rect=svg.getBoundingClientRect();if(!rect.width)return;pan={x:drag.px+(event.clientX-drag.x)*900/rect.width,y:drag.py+(event.clientY-drag.y)*620/rect.height};setCamera();});
    on(svg,'pointerup',()=>{drag=null;});on(svg,'pointercancel',()=>{drag=null;});
    draw();return {dispose(){disposed=true;listeners.forEach(fn=>fn());host.replaceChildren();}};
  }
  return {init,view,preview,stop,model,load,path,layout,example,mount};
});
