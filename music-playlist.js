(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.SotaPlaylist=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  const AUDIO_BASE='https://xnxmumbvgtmlpenutlii.supabase.co/storage/v1/object/public/fiji-audio/';
  function validateCatalog(value){
    if(!Array.isArray(value)||!value.length||value.length>500)throw Error('Playlist unavailable.');
    const ids=new Set();
    return value.map(track=>{
      if(!track||typeof track.id!=='string'||!/^[a-z0-9-]{1,80}$/.test(track.id)||ids.has(track.id)||typeof track.title!=='string'||!track.title.trim()||track.title.length>250||typeof track.path!=='string'||!/^fiji-(?:remix|song)-\d{2,3}\.mp3$/.test(track.path))throw Error('Playlist unavailable.');
      ids.add(track.id);return {id:track.id,title:track.title.trim(),url:AUDIO_BASE+track.path};
    });
  }
  let dialog=null,audio=null,tracks=[],current=-1,loading=null,attempt=0,beforePlay=()=>{},focusBefore=null,message='Choose a song to start listening.';
  let list,filter,count,status,title,play,previous,next,retry;
  function el(tag,text,cls){const node=root.document.createElement(tag);if(text)node.textContent=text;if(cls)node.className=cls;return node;}
  function button(text,action){const node=el('button',text);node.type='button';node.addEventListener('click',action);return node;}
  function live(){return !!audio&&!audio.paused&&!audio.ended;}
  function sync(){
    const selected=tracks[current],playing=live();
    root.document.querySelectorAll('[data-playlist-open]').forEach(b=>{
      b.setAttribute('aria-expanded',String(!!dialog?.open));b.setAttribute('aria-pressed',String(playing));
      b.title=selected?(playing?'Playing: ':'Paused: ')+selected.title+' · Open music playlist':'Open music playlist';
    });
    root.document.querySelectorAll('[data-playlist-status]').forEach(s=>s.textContent=selected?(playing?'Playing · ':'Paused · ')+selected.title:'Music playlist · tap to choose a song');
    if(!dialog)return;
    title.textContent=selected?selected.title:'Choose a song';status.textContent=message;
    play.textContent=playing?'Pause':'Play';play.disabled=previous.disabled=next.disabled=!tracks.length;
    list.querySelectorAll('[data-track-index]').forEach(b=>{
      const active=Number(b.dataset.trackIndex)===current;
      if(active)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');
    });
  }
  function pause(){attempt++;if(audio)audio.pause();if(tracks[current])message='Paused · '+tracks[current].title;sync();}
  async function playTrack(index){
    const selected=tracks[index];if(!selected)return;
    beforePlay();const request=++attempt;
    if(current!==index||!audio.getAttribute('src')||audio.error){audio.pause();current=index;audio.src=selected.url;}
    message='Loading · '+selected.title;sync();
    try{await audio.play();if(request!==attempt)return;message='Playing · '+selected.title;sync();}
    catch(_){if(request===attempt){message='Could not play this song. Tap Play to retry, or choose another song.';sync();}}
  }
  function move(delta){if(tracks.length)playTrack(current<0?0:(current+delta+tracks.length)%tracks.length);}
  function render(){
    list.replaceChildren();const query=filter.value.trim().toLocaleLowerCase();let shown=0;
    tracks.forEach((track,index)=>{
      if(query&&!track.title.toLocaleLowerCase().includes(query))return;
      shown++;const row=el('li'),pick=button('',()=>playTrack(index));pick.dataset.trackIndex=String(index);pick.setAttribute('aria-label','Play '+track.title);
      const number=el('span',String(index+1),'sk-playlist-number');number.setAttribute('aria-hidden','true');pick.append(number,el('span',track.title));row.append(pick);list.append(row);
    });
    if(!shown)list.append(el('li',tracks.length?'No songs match your search.':'The playlist could not load.'));
    count.textContent=query?shown+' of '+tracks.length+' songs':tracks.length+' songs';sync();
  }
  async function load(){
    if(tracks.length)return;
    if(loading)return loading;
    retry.hidden=true;message='Loading playlist…';sync();
    loading=(async()=>{
      try{const response=await root.fetch('/music-playlist.json?v=20261020',{credentials:'omit',cache:'no-cache'});if(!response.ok)throw Error('Playlist unavailable.');tracks=validateCatalog(await response.json());message='Choose a song to start listening.';render();}
      catch(_){message='The playlist could not load. Check your connection and try again.';retry.hidden=false;sync();}
      finally{loading=null;}
    })();
    return loading;
  }
  function create(){
    dialog=el('dialog','','sk-playlist');dialog.id='sk-music-playlist';dialog.setAttribute('aria-labelledby','sk-playlist-heading');
    const head=el('div','','sk-playlist-head'),heading=el('h2','Music playlist');heading.id='sk-playlist-heading';
    const close=button('Close',()=>dialog.close());close.setAttribute('aria-label','Close music playlist');head.append(heading,close);
    title=el('strong','Choose a song','sk-playlist-title');audio=el('audio');audio.controls=true;audio.preload='none';audio.setAttribute('aria-label','Playlist audio');
    const transport=el('div','','sk-playlist-transport');transport.setAttribute('role','group');transport.setAttribute('aria-label','Playlist playback controls');
    previous=button('Previous',()=>move(-1));play=button('Play',()=>live()?pause():playTrack(current<0?0:current));next=button('Next',()=>move(1));transport.append(previous,play,next);
    status=el('p','','sk-playlist-status');status.setAttribute('role','status');retry=button('Retry playlist',load);retry.hidden=true;
    const label=el('label','Find a song');label.htmlFor='sk-playlist-filter';filter=el('input');filter.id='sk-playlist-filter';filter.type='search';filter.placeholder='Song or artist';filter.addEventListener('input',render);
    count=el('small','Loading playlist…');count.setAttribute('aria-live','polite');list=el('ol','','sk-playlist-songs');list.setAttribute('aria-label','Playlist songs');
    dialog.append(head,title,audio,transport,status,retry,label,filter,count,list);root.document.body.append(dialog);
    audio.addEventListener('play',()=>{
      beforePlay();root.document.querySelectorAll('audio').forEach(other=>{if(other!==audio)other.pause();});
      message='Playing · '+(tracks[current]?.title||'');sync();
    });
    audio.addEventListener('pause',()=>{if(tracks[current])message='Paused · '+tracks[current].title;sync();});
    audio.addEventListener('ended',()=>move(1));
    audio.addEventListener('error',()=>{message='This song could not load. Tap Play to retry, or choose another song.';sync();});
    dialog.addEventListener('close',()=>{sync();if(focusBefore?.isConnected)focusBefore.focus({preventScroll:true});});
  }
  function open(){
    if(!dialog)create();if(dialog.open)return;
    focusBefore=root.document.activeElement;dialog.showModal();dialog.querySelector('button').focus();sync();load();
  }
  function mount(target,options={}){
    beforePlay=options.beforePlay||beforePlay;
    target.querySelectorAll('[data-playlist-open]:not([data-playlist-bound])').forEach(b=>{
      b.dataset.playlistBound='true';b.setAttribute('aria-haspopup','dialog');b.setAttribute('aria-controls','sk-music-playlist');b.addEventListener('click',open);
    });sync();
  }
  if(root.document)root.document.addEventListener('play',event=>{if(event.target.tagName==='AUDIO'&&event.target!==audio)pause();},true);
  return {validateCatalog,mount,open,pause};
});
