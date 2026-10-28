(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.SotaPlaylist=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const AUDIO_BASE='https://xnxmumbvgtmlpenutlii.supabase.co/storage/v1/object/public/fiji-audio/';
const PREFS_KEY='sk-music-prefs';
const ICON={
play:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5.2v13.6L19 12z"/></svg>',
pause:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.5 5h4v14h-4zM13.5 5h4v14h-4z"/></svg>',
prev:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5.5 5h2.2v14H5.5zM19.5 5.4v13.2L9 12z"/></svg>',
next:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.3 5h2.2v14h-2.2zM4.5 5.4v13.2L15 12z"/></svg>',
shuffle:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>',
repeat:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>',
volume:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path fill="currentColor" d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
mute:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path fill="currentColor" d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6M16 9l6 6"/></svg>'
};
function validateCatalog(value){
if(!Array.isArray(value)||!value.length||value.length>500)throw Error('Playlist unavailable.');
const ids=new Set();
return value.map(track=>{
if(!track||typeof track.id!=='string'||!/^[a-z0-9-]{1,80}$/.test(track.id)||ids.has(track.id)||typeof track.title!=='string'||!track.title.trim()||track.title.length>250||typeof track.path!=='string'||!(track.path==='fiji-default-soundtrack.mp3'||/^fiji-(?:remix|song)-\d{2,3}\.mp3$/.test(track.path)))throw Error('Playlist unavailable.');
ids.add(track.id);return {id:track.id,title:track.title.trim(),url:AUDIO_BASE+track.path};
});
}
function readPrefs(){
const base={shuffle:false,repeat:'off',autoplay:true,volume:1,muted:false};
try{
const saved=JSON.parse(root.localStorage?.getItem(PREFS_KEY)||'{}')||{};
if(typeof saved.shuffle==='boolean')base.shuffle=saved.shuffle;
if(['off','all','one'].includes(saved.repeat))base.repeat=saved.repeat;
if(typeof saved.autoplay==='boolean')base.autoplay=saved.autoplay;
if(typeof saved.volume==='number'&&saved.volume>=0&&saved.volume<=1)base.volume=saved.volume;
if(typeof saved.muted==='boolean')base.muted=saved.muted;
}catch(_){}
return base;
}
const prefs=readPrefs();
function savePrefs(){try{root.localStorage?.setItem(PREFS_KEY,JSON.stringify(prefs));}catch(_){}}
let dialog=null,audio=null,tracks=[],current=-1,selectedTrack=null,authoritative=false,loading=null,attempt=0,beforePlay=()=>{},focusBefore=null,inlineHost=null,message='Choose a song to start listening.';
let order=[],seeking=false;
root.SotaPlayback?.register('playlist',pause);
let list,filter,count,status,title,play,previous,next,retry,mood,subtitle,shuffleBtn,repeatBtn,autoplayInput,seek,elapsed,total,muteBtn,volume;
function el(tag,text,cls){const node=root.document.createElement(tag);if(text)node.textContent=text;if(cls)node.className=cls;return node;}
function button(text,action){const node=el('button',text);node.type='button';node.addEventListener('click',action);return node;}
function iconButton(cls,label,icon,action){const node=button('',action);node.className=cls;node.setAttribute('aria-label',label);node.title=label;node.innerHTML=icon;return node;}
function live(){return !!audio&&!audio.paused&&!audio.ended;}
function homeHost(){return root.document?.querySelector?.('[data-music-playlist-host]')||null;}
function clock(seconds){if(!Number.isFinite(seconds)||seconds<0)return '0:00';const whole=Math.floor(seconds);return Math.floor(whole/60)+':'+String(whole%60).padStart(2,'0');}
function fill(range){const max=Number(range.max)||1;range.style.setProperty('--p',(Number(range.value)/max*100)+'%');}
function buildOrder(){
order=tracks.map((_,i)=>i);
for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
if(current>=0){const at=order.indexOf(current);if(at>0){order.splice(at,1);order.unshift(current);}}
}
function nextIndex(delta,auto){
const length=tracks.length;if(!length)return -1;
if(prefs.shuffle){
if(order.length!==length)buildOrder();
let at=order.indexOf(current);if(at<0)at=-1;
let target=at+delta;
if(target>=length){if(auto&&prefs.repeat==='off')return -1;const last=current;buildOrder();if(length>1&&order[0]===last){order.push(order.shift());}target=0;}
if(target<0)target=length-1;
return order[target];
}
let target=current<0?0:current+delta;
if(target>=length){if(auto&&prefs.repeat==='off')return -1;target=0;}
if(target<0)target=length-1;
return target;
}
function syncTime(){
if(!seek)return;
const duration=audio&&Number.isFinite(audio.duration)?audio.duration:0;
if(!seeking){seek.value=duration?String(Math.round(audio.currentTime/duration*1000)):'0';}
fill(seek);seek.disabled=!duration;
elapsed.textContent=clock(seeking&&duration?Number(seek.value)/1000*duration:audio?.currentTime||0);
total.textContent=clock(duration);
seek.setAttribute('aria-valuetext',elapsed.textContent+' of '+total.textContent);
}
function syncModes(){
if(!shuffleBtn)return;
shuffleBtn.setAttribute('aria-pressed',String(prefs.shuffle));
shuffleBtn.title=shuffleBtn.ariaLabel=prefs.shuffle?'Shuffle on':'Shuffle off';
shuffleBtn.setAttribute('aria-label',shuffleBtn.title);
repeatBtn.dataset.repeat=prefs.repeat;
repeatBtn.setAttribute('aria-pressed',String(prefs.repeat!=='off'));
const repeatLabel=prefs.repeat==='one'?'Repeat this song':prefs.repeat==='all'?'Repeat playlist':'Repeat off';
repeatBtn.title=repeatLabel;repeatBtn.setAttribute('aria-label',repeatLabel);
autoplayInput.checked=prefs.autoplay;
volume.value=String(Math.round((prefs.muted?0:prefs.volume)*100));fill(volume);
muteBtn.innerHTML=prefs.muted||prefs.volume===0?ICON.mute:ICON.volume;
const muteLabel=prefs.muted?'Unmute':'Mute';muteBtn.title=muteLabel;muteBtn.setAttribute('aria-label',muteLabel);
if(audio){audio.volume=prefs.volume;audio.muted=prefs.muted;}
}
function syncMediaSession(selected,playing){
const session=root.navigator?.mediaSession;if(!session)return;
try{
if(selected&&root.MediaMetadata&&session.metadata?.title!==selected.title)session.metadata=new root.MediaMetadata({title:selected.title,artist:'Sota Kece',album:'Island Mix'});
session.playbackState=selected?(playing?'playing':'paused'):'none';
}catch(_){}
}
function sync(){
const selected=tracks[current]||selectedTrack,playing=live();
root.document.querySelectorAll('[data-playlist-open]').forEach(b=>{
b.setAttribute('aria-expanded',String(!!dialog?.open));b.setAttribute('aria-pressed',String(playing));
if(homeHost())b.removeAttribute('aria-haspopup');else b.setAttribute('aria-haspopup','dialog');
b.title=selected?(playing?'Playing: ':'Paused: ')+selected.title+' · Open music playlist':'Open music playlist';
});
root.document.querySelectorAll('[data-playlist-status]').forEach(s=>s.textContent=selected?(playing?'Playing · ':'Paused · ')+selected.title:'Music playlist · tap to choose a song');
if(!dialog)return;
title.textContent=selected?selected.title:'Your island soundtrack';status.textContent=message;
dialog.classList.toggle('is-playing',playing);
mood.textContent=selected?(playing?'Now playing':'On pause'):'Turn up the island vibes';
subtitle.textContent=selected?'Track '+(current+1)+' of '+tracks.length+' · Sota Kece':'Pick a song. Find your rhythm.';
play.innerHTML=playing?ICON.pause:ICON.play;
play.setAttribute('aria-label',playing?'Pause':'Play');play.title=playing?'Pause':'Play';
play.disabled=previous.disabled=next.disabled=!tracks.length;
list.querySelectorAll('[data-track-index]').forEach(b=>{
const active=Number(b.dataset.trackIndex)===current;
if(active)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');
});
syncModes();syncTime();syncMediaSession(selected,playing);
}
function pause(){attempt++;if(audio)audio.pause();if(selectedTrack)message='Paused · '+selectedTrack.title;sync();}
async function playTrack(index){
const selected=tracks[index];if(!selected)return;
beforePlay();const request=++attempt;
if(current!==index||audio.getAttribute('src')!==selected.url||audio.error){audio.pause();current=index;audio.src=selected.url;}
selectedTrack=selected;
message='Loading · '+selected.title;sync();
root.SotaHeroVisualiser?.prepare(audio);
try{await audio.play();if(request!==attempt)return;message='Playing · '+selected.title;sync();}
catch(_){if(request===attempt){message='Could not play this song. Tap Play to retry, or choose another song.';sync();}}
}
function move(delta){const target=nextIndex(delta,false);if(target>=0)playTrack(target);}
function back(){if(audio&&audio.currentTime>3&&current>=0){audio.currentTime=0;syncTime();if(!live())playTrack(current);return;}move(-1);}
function finished(){
const done=selectedTrack?.title||'';
if(prefs.repeat==='one'&&current>=0){audio.currentTime=0;playTrack(current);return;}
if(!prefs.autoplay){message='Finished · '+done+'. Auto-play is off — tap Next for another song.';sync();return;}
const target=nextIndex(1,true);
if(target<0){message='End of the playlist. Turn on Repeat to keep the music going.';sync();return;}
playTrack(target);
}
function render(){
list.replaceChildren();const query=filter.value.trim().toLocaleLowerCase();let shown=0;
tracks.forEach((track,index)=>{
if(query&&!track.title.toLocaleLowerCase().includes(query))return;
shown++;const row=el('li'),pick=button('',()=>playTrack(index));pick.dataset.trackIndex=String(index);pick.setAttribute('aria-label','Play '+track.title);
const number=el('span',String(index+1).padStart(2,'0'),'sk-playlist-number');number.setAttribute('aria-hidden','true');pick.append(number,el('span',track.title,'sk-playlist-song-name'));row.append(pick);list.append(row);
});
if(!shown)list.append(el('li',tracks.length?'No songs match your search.':'The playlist could not load.'));
count.textContent=query?shown+' of '+tracks.length+' songs':tracks.length+' songs';sync();
}
async function readCatalogue(){
try{
const shared=await import('/shared-music/core.mjs');
const result=await shared.loadCatalogue();
authoritative=true;return result;
}catch(error){
if(authoritative)throw error;
const response=await root.fetch('/music-playlist.json?v=20261026-shared-music',{credentials:'omit',cache:'no-cache'});
if(!response.ok)throw Error('Playlist unavailable.');
return {tracks:validateCatalog(await response.json()),source:'fallback',stale:true};
}
}
async function load(){
if(loading)return loading;
retry.hidden=true;message='Loading playlist…';sync();
loading=(async()=>{
try{
const result=await readCatalogue();
const selectedId=(tracks[current]||selectedTrack)?.id;
tracks=result.tracks;current=selectedId?tracks.findIndex(track=>track.id===selectedId):-1;
if(current>=0)selectedTrack=tracks[current];
buildOrder();
message=result.stale?'Saved playlist · Connection unavailable. Music needs an internet connection.':selectedTrack?(live()?'Playing · ':'Paused · ')+selectedTrack.title:'Choose a song to start listening.';
retry.hidden=!result.stale;render();
}
catch(_){message=tracks.length?'The shared playlist could not refresh. Your current selection is kept.':'The playlist could not load. Check your connection and try again.';retry.hidden=false;sync();}
finally{loading=null;}
})();
return loading;
}
function styles(){
const doc=root.document;
if(doc.querySelector('link[data-sk-deck-styles]'))return;
const link=doc.createElement('link');link.rel='stylesheet';link.href='/music-controls.css?v=20261028-deck';link.dataset.skDeckStyles='true';doc.head.append(link);
}
function buildDeck(){
const deck=el('div','','sk-deck');deck.setAttribute('role','group');deck.setAttribute('aria-label','Music controls');
const time=el('div','','sk-deck-seek');elapsed=el('span','0:00','sk-deck-time');total=el('span','0:00','sk-deck-time');
seek=el('input');seek.type='range';seek.min='0';seek.max='1000';seek.step='1';seek.value='0';seek.disabled=true;seek.className='sk-deck-range';seek.setAttribute('aria-label','Song position');
seek.addEventListener('input',()=>{seeking=true;syncTime();});
seek.addEventListener('change',()=>{const duration=audio.duration;if(Number.isFinite(duration))audio.currentTime=Number(seek.value)/1000*duration;seeking=false;syncTime();});
time.append(elapsed,seek,total);
const main=el('div','','sk-deck-main');
shuffleBtn=iconButton('sk-deck-mode sk-deck-shuffle','Shuffle off',ICON.shuffle,()=>{prefs.shuffle=!prefs.shuffle;if(prefs.shuffle)buildOrder();savePrefs();message=prefs.shuffle?'Shuffle on · songs play in a random order.':'Shuffle off · songs play in list order.';sync();});
previous=iconButton('sk-deck-skip','Previous song',ICON.prev,back);
play=iconButton('sk-deck-play','Play',ICON.play,()=>live()?pause():playTrack(current<0?(prefs.shuffle?nextIndex(1,false):0):current));
next=iconButton('sk-deck-skip','Next song',ICON.next,()=>move(1));
repeatBtn=iconButton('sk-deck-mode sk-deck-repeat','Repeat off',ICON.repeat,()=>{prefs.repeat=prefs.repeat==='off'?'all':prefs.repeat==='all'?'one':'off';savePrefs();message=prefs.repeat==='one'?'Repeat on · this song plays again.':prefs.repeat==='all'?'Repeat on · the playlist starts again at the end.':'Repeat off.';sync();});
main.append(shuffleBtn,previous,play,next,repeatBtn);
const extra=el('div','','sk-deck-extra');
const toggle=el('label','','sk-deck-switch');autoplayInput=el('input');autoplayInput.type='checkbox';autoplayInput.setAttribute('role','switch');
autoplayInput.addEventListener('change',()=>{prefs.autoplay=autoplayInput.checked;savePrefs();message=prefs.autoplay?'Auto-play on · the next song starts by itself.':'Auto-play off · music stops after each song.';sync();});
toggle.append(autoplayInput,el('span','','sk-deck-knob'),el('span','Auto-play','sk-deck-switch-label'));
const sound=el('div','','sk-deck-volume');
muteBtn=iconButton('sk-deck-mute','Mute',ICON.volume,()=>{if(prefs.muted||prefs.volume===0){prefs.muted=false;if(prefs.volume===0)prefs.volume=.6;}else prefs.muted=true;savePrefs();syncModes();});
volume=el('input');volume.type='range';volume.min='0';volume.max='100';volume.step='1';volume.className='sk-deck-range';volume.setAttribute('aria-label','Volume');
volume.addEventListener('input',()=>{prefs.volume=Number(volume.value)/100;prefs.muted=prefs.volume===0;savePrefs();syncModes();});
sound.append(muteBtn,volume);
extra.append(toggle,sound);
deck.append(time,main,extra);
return deck;
}
function mediaKeys(){
const session=root.navigator?.mediaSession;if(!session)return;
const set=(action,handler)=>{try{session.setActionHandler(action,handler);}catch(_){}};
set('play',()=>playTrack(current<0?0:current));set('pause',pause);
set('previoustrack',back);set('nexttrack',()=>move(1));
set('seekto',details=>{if(Number.isFinite(details?.seekTime))audio.currentTime=details.seekTime;syncTime();});
}
function create(){
styles();
dialog=el('dialog','','sk-playlist');dialog.id='sk-music-playlist';dialog.setAttribute('aria-labelledby','sk-playlist-heading');
const head=el('div','','sk-playlist-head'),brand=el('div'),heading=el('h2','Music playlist');heading.id='sk-playlist-heading';
brand.append(el('span','SOTA KECE · ISLAND MIX','sk-playlist-eyebrow'),heading);
const close=button('×',()=>{if(inlineHost){const host=inlineHost;host.dispatchEvent(new root.CustomEvent('sota-playlist-inline-close',{bubbles:true}));if(inlineHost)hideInline();}else dialog.close();});close.className='sk-playlist-close';close.setAttribute('aria-label','Close music playlist');head.append(brand,close);
const hero=el('div','','sk-playlist-hero'),record=el('div','','sk-playlist-record');record.setAttribute('aria-hidden','true');
record.append(el('span','♫','sk-playlist-record-label'));
const details=el('div','','sk-playlist-details');mood=el('span','Turn up the island vibes','sk-playlist-mood');
title=el('strong','Your island soundtrack','sk-playlist-title');subtitle=el('span','Pick a song. Find your rhythm.','sk-playlist-subtitle');
details.append(mood,title,subtitle);hero.append(record,details);
audio=el('audio');audio.id='sota-playlist-audio';audio.crossOrigin='anonymous';audio.controls=false;audio.hidden=true;audio.preload='none';audio.setAttribute('aria-hidden','true');audio.setAttribute('data-sota-playback-source','playlist');
audio.volume=prefs.volume;audio.muted=prefs.muted;
const deck=buildDeck();
status=el('p','','sk-playlist-status');status.setAttribute('role','status');retry=button('Retry playlist',load);retry.hidden=true;
const search=el('div','','sk-playlist-search'),label=el('label','Find your next favourite');label.htmlFor='sk-playlist-filter';filter=el('input');filter.id='sk-playlist-filter';filter.type='search';filter.placeholder='Search song or artist';filter.addEventListener('input',render);search.append(label,filter);
count=el('small','Loading playlist…');count.setAttribute('aria-live','polite');list=el('ol','','sk-playlist-songs');list.setAttribute('aria-label','Playlist songs');
const queue=el('div','','sk-playlist-queue');queue.append(el('span','THE PLAYLIST'),count);
const visuals=el('dimau-music-visualiser');visuals.setAttribute('for','sota-playlist-audio');
dialog.append(head,hero,deck,audio,visuals,status,retry,search,queue,list);root.document.body.append(dialog);
audio.addEventListener('play',()=>{
root.SotaPlayback?.activate('playlist',audio);
beforePlay();root.document.querySelectorAll('audio').forEach(other=>{if(other!==audio)other.pause();});
message='Playing · '+(selectedTrack?.title||'');sync();
});
audio.addEventListener('pause',()=>{if(selectedTrack&&!audio.ended)message='Paused · '+selectedTrack.title;sync();});
audio.addEventListener('timeupdate',syncTime);
audio.addEventListener('loadedmetadata',syncTime);
audio.addEventListener('durationchange',syncTime);
audio.addEventListener('ended',finished);
audio.addEventListener('error',()=>{message='This song could not load. Tap Play to retry, or choose another song.';sync();});
dialog.addEventListener('close',()=>{sync();if(dialog.open)return;stopVisuals();if(!inlineHost&&focusBefore?.isConnected)focusBefore.focus({preventScroll:true});focusBefore=null;});
mediaKeys();syncModes();
}
function stopVisuals(){const visual=dialog?.querySelector('dimau-music-visualiser');visual?.finishRecording?.();visual?.stop?.();}
function relocate(parent){
if(dialog.parentNode===parent)return;
// Modern browsers preserve the audio element's playback and custom-element
// state during a connected move. The fallback still reuses the same nodes.
if(typeof parent.moveBefore==='function'&&dialog.isConnected&&parent.isConnected){
try{parent.moveBefore(dialog,null);return;}catch(_){}
}
parent.append(dialog);
}
function showInline(host){
if(!host||!host.isConnected||typeof host.append!=='function')return null;
if(!dialog)create();
if(inlineHost===host&&dialog.parentNode===host&&dialog.open){sync();return dialog;}
const active=root.document.activeElement;
focusBefore=null;
if(dialog.open)dialog.close();
inlineHost=host;dialog.classList.add('sk-playlist-inline');
relocate(host);dialog.show();sync();
if(active&&active!==root.document.body&&active.isConnected)active.focus({preventScroll:true});
dialog.querySelector('dimau-music-visualiser')?.wake?.();
if(!tracks.length)load();
return dialog;
}
function hideInline(){
if(!dialog||!inlineHost)return;
const active=root.document.activeElement;
focusBefore=null;
if(dialog.open)dialog.close();
inlineHost=null;dialog.classList.remove('sk-playlist-inline');
relocate(root.document.body);stopVisuals();sync();
if(active&&active!==root.document.body&&active.isConnected&&!dialog.contains(active))active.focus({preventScroll:true});
}
function open(){
const host=homeHost();
if(host){
host.dispatchEvent(new root.CustomEvent('sota-playlist-inline-open',{bubbles:true}));
const target=host.isConnected?host:homeHost();
if(target&&showInline(target)){
target.scrollIntoView?.({behavior:root.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?'auto':'smooth',block:'start'});
filter.focus({preventScroll:true});
return;
}
}
hideInline();
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
return {validateCatalog,mount,open,pause,showInline,hideInline,detachInline:hideInline,isInline:()=>!!inlineHost&&!!dialog?.open&&inlineHost.isConnected};
});
