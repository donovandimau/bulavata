(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.SotaPlaylist=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
const AUDIO_BASE='https://xnxmumbvgtmlpenutlii.supabase.co/storage/v1/object/public/fiji-audio/';
const SITE='https://sotakece.com/';
const PREFS_KEY='sk-music-prefs',LISTS_KEY='sk-music-playlists';
const MAX_LISTS=50,MAX_ITEMS=500;
const ICON={
play:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5.2v13.6L19 12z"/></svg>',
pause:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.5 5h4v14h-4zM13.5 5h4v14h-4z"/></svg>',
prev:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5.5 5h2.2v14H5.5zM19.5 5.4v13.2L9 12z"/></svg>',
next:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.3 5h2.2v14h-2.2zM4.5 5.4v13.2L15 12z"/></svg>',
shuffle:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>',
repeat:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>',
volume:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path fill="currentColor" d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
mute:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path fill="currentColor" d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6M16 9l6 6"/></svg>',
share:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>',
add:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
remove:'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>'
};
function validateCatalog(value){
if(!Array.isArray(value)||!value.length||value.length>500)throw Error('Playlist unavailable.');
const ids=new Set();
return value.map(track=>{
if(!track||typeof track.id!=='string'||!/^[a-z0-9-]{1,80}$/.test(track.id)||ids.has(track.id)||typeof track.title!=='string'||!track.title.trim()||track.title.length>250||typeof track.path!=='string'||!(track.path==='fiji-default-soundtrack.mp3'||/^fiji-(?:remix|song)-\d{2,3}\.mp3$/.test(track.path)))throw Error('Playlist unavailable.');
ids.add(track.id);return {id:track.id,title:track.title.trim(),url:AUDIO_BASE+track.path};
});
}
function readJson(key,fallback){try{const value=JSON.parse(root.localStorage?.getItem(key)||'null');return value==null?fallback:value;}catch(_){return fallback;}}
function writeJson(key,value){try{root.localStorage?.setItem(key,JSON.stringify(value));return true;}catch(_){return false;}}
function readPrefs(){
const base={shuffle:false,repeat:'off',autoplay:true,volume:1,muted:false,view:'mix'};
const saved=readJson(PREFS_KEY,{});
if(saved&&typeof saved==='object'){
if(typeof saved.shuffle==='boolean')base.shuffle=saved.shuffle;
if(['off','all','one'].includes(saved.repeat))base.repeat=saved.repeat;
if(typeof saved.autoplay==='boolean')base.autoplay=saved.autoplay;
if(typeof saved.volume==='number'&&saved.volume>=0&&saved.volume<=1)base.volume=saved.volume;
if(typeof saved.muted==='boolean')base.muted=saved.muted;
if(typeof saved.view==='string'&&/^(?:mix|device|pl:[a-z0-9]{4,20})$/.test(saved.view))base.view=saved.view;
}
return base;
}
function cleanName(value){return String(value||'').replace(/\s+/g,' ').trim().slice(0,60);}
function readLists(){
const saved=readJson(LISTS_KEY,[]);if(!Array.isArray(saved))return [];
const ids=new Set();
return saved.filter(list=>list&&typeof list.id==='string'&&/^[a-z0-9]{4,20}$/.test(list.id)&&!ids.has(list.id)&&ids.add(list.id)&&cleanName(list.name)).slice(0,MAX_LISTS).map(list=>({id:list.id,name:cleanName(list.name),items:Array.from(new Set((Array.isArray(list.items)?list.items:[]).filter(key=>typeof key==='string'&&/^(?:mix|dev):.{1,400}$/.test(key)))).slice(0,MAX_ITEMS)}));
}
const prefs=readPrefs();
let lists=readLists();
function savePrefs(){writeJson(PREFS_KEY,prefs);}
function saveLists(){return writeJson(LISTS_KEY,lists);}
let dialog=null,audio=null,tracks=[],current=-1,selectedTrack=null,authoritative=false,loading=null,attempt=0,beforePlay=()=>{},focusBefore=null,inlineHost=null,message='Choose a song to start listening.';
let order=[],seeking=false,catalogue=[],device=[],deviceUrl={key:'',url:''},queueName='Island Mix',menuFor='',formMode='',pendingAdd='',pendingSong='';
root.SotaPlayback?.register('playlist',pause);
let list,filter,count,status,title,play,previous,next,retry,mood,subtitle,shuffleBtn,repeatBtn,autoplayInput,seek,elapsed,total,muteBtn,volume,shareBtn,library,tools,queueLabel,deviceInput;
function el(tag,text,cls){const node=root.document.createElement(tag);if(text)node.textContent=text;if(cls)node.className=cls;return node;}
function button(text,action){const node=el('button',text);node.type='button';node.addEventListener('click',action);return node;}
function iconButton(cls,label,icon,action){const node=button('',action);node.className=cls;node.setAttribute('aria-label',label);node.title=label;node.innerHTML=icon;return node;}
function live(){return !!audio&&!audio.paused&&!audio.ended;}
function homeHost(){return root.document?.querySelector?.('[data-music-playlist-host]')||null;}
function clock(seconds){if(!Number.isFinite(seconds)||seconds<0)return '0:00';const whole=Math.floor(seconds);return Math.floor(whole/60)+':'+String(whole%60).padStart(2,'0');}
function fill(range){const max=Number(range.max)||1;range.style.setProperty('--p',(Number(range.value)/max*100)+'%');}
function newId(){return Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);}
/* ---------- library: Island Mix, songs saved on this device, and the listener's own playlists ---------- */
function byKey(key){return key.startsWith('mix:')?catalogue.find(t=>t.key===key):device.find(t=>t.key===key);}
function listById(id){return lists.find(l=>l.id===id)||null;}
function viewList(){
if(prefs.view==='device')return device;
if(prefs.view.startsWith('pl:')){const own=listById(prefs.view.slice(3));return own?own.items.map(byKey).filter(Boolean):[];}
return catalogue;
}
function viewName(view=prefs.view){
if(view==='device')return 'My music';
if(view.startsWith('pl:'))return listById(view.slice(3))?.name||'Playlist';
return 'Island Mix';
}
function setView(view){
if(view.startsWith('pl:')&&!listById(view.slice(3)))view='mix';
prefs.view=view;savePrefs();menuFor='';formMode='';filter&&(filter.value='');renderLibrary();render();
}
async function loadDevice(){
const store=root.SotaLocalMusic?.createStore?.();if(!store)return;
try{
const records=await store.list();
device=records.map(r=>({key:'dev:'+r.id,id:r.id,title:r.title||r.fileName||'Saved song',blob:r.blob,src:'dev'}));
}catch(_){device=[];}
if(dialog){renderLibrary();render();}
}
function trackUrl(track){
if(track.url)return track.url;
if(deviceUrl.key!==track.key){
if(deviceUrl.url&&!(audio&&audio.getAttribute('src')===deviceUrl.url&&live()))root.URL.revokeObjectURL(deviceUrl.url);
deviceUrl={key:track.key,url:root.URL.createObjectURL(track.blob)};
}
return deviceUrl.url;
}
function createList(name,firstKey){
name=cleanName(name);if(!name)return null;
if(lists.length>=MAX_LISTS){message='You have reached 50 playlists. Delete one to make another.';sync();return null;}
const own={id:newId(),name,items:firstKey?[firstKey]:[]};lists.push(own);
if(!saveLists()){lists.pop();message='This browser could not save playlists. Check it is not in private mode.';sync();return null;}
return own;
}
function toggleInList(own,key){
const at=own.items.indexOf(key);
if(at>=0){own.items.splice(at,1);message='Removed from '+own.name+'.';}
else{if(own.items.length>=MAX_ITEMS){message=own.name+' is full (500 songs).';sync();return;}own.items.push(key);message='Added to '+own.name+'.';}
saveLists();
}
/* ---------- playback ---------- */
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
function useView(){
const items=viewList();
tracks=items.slice();queueName=viewName();
current=selectedTrack?tracks.findIndex(t=>t.key===selectedTrack.key):-1;
buildOrder();
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
const shuffleLabel=prefs.shuffle?'Shuffle on':'Shuffle off';shuffleBtn.title=shuffleLabel;shuffleBtn.setAttribute('aria-label',shuffleLabel);
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
if(selected&&root.MediaMetadata&&session.metadata?.title!==selected.title)session.metadata=new root.MediaMetadata({title:selected.title,artist:'Sota Kece',album:queueName});
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
subtitle.textContent=selected&&current>=0?'Track '+(current+1)+' of '+tracks.length+' · '+queueName:'Pick a song. Find your rhythm.';
play.innerHTML=playing?ICON.pause:ICON.play;
play.setAttribute('aria-label',playing?'Pause':'Play');play.title=playing?'Pause':'Play';
play.disabled=!tracks.length&&!viewList().length;previous.disabled=next.disabled=!tracks.length;
const playingKey=selected?.key;
list.querySelectorAll('[data-track-key]').forEach(b=>{
if(b.dataset.trackKey===playingKey)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current');
});
syncModes();syncTime();syncMediaSession(selected,playing);
}
function pause(){attempt++;if(audio)audio.pause();if(selectedTrack)message='Paused · '+selectedTrack.title;sync();}
async function playTrack(index){
const selected=tracks[index];if(!selected)return;
beforePlay();const request=++attempt;
const url=trackUrl(selected);
if(current!==index||audio.getAttribute('src')!==url||audio.error){audio.pause();current=index;audio.src=url;}
selectedTrack=selected;
message='Loading · '+selected.title;sync();
root.SotaHeroVisualiser?.prepare(audio);
try{await audio.play();if(request!==attempt)return;message='Playing · '+selected.title;sync();}
catch(_){if(request===attempt){message='Could not play this song. Tap Play to retry, or choose another song.';sync();}}
}
function playFromView(key){
useView();const index=tracks.findIndex(t=>t.key===key);
if(index<0)return;current=index;buildOrder();playTrack(index);
}
function startPlaying(){
if(live()){pause();return;}
if(current>=0&&tracks[current]){playTrack(current);return;}
useView();if(!tracks.length){message=prefs.view==='mix'?'The playlist is still loading.':'This list is empty. Add songs to it first.';sync();return;}
playTrack(prefs.shuffle?order[0]:0);
}
function move(delta){const target=nextIndex(delta,false);if(target>=0)playTrack(target);}
function back(){if(audio&&audio.currentTime>3&&current>=0){audio.currentTime=0;syncTime();if(!live())playTrack(current);return;}move(-1);}
function finished(){
const done=selectedTrack?.title||'';
if(prefs.repeat==='one'&&current>=0){audio.currentTime=0;playTrack(current);return;}
if(!prefs.autoplay){message='Finished · '+done+'. Auto-play is off — tap Next for another song.';sync();return;}
const target=nextIndex(1,true);
if(target<0){message='End of '+queueName+'. Turn on Repeat to keep the music going.';sync();return;}
playTrack(target);
}
/* ---------- sharing ---------- */
function shareSong(){
const selected=tracks[current]||selectedTrack;
let data;
if(selected&&selected.src==='mix')data={title:selected.title+' · Sota Kece',text:'Listen to '+selected.title+' on Sota Kece 🎶',url:SITE+'?song='+encodeURIComponent(selected.id)};
else if(selected)data={title:'Sota Kece',text:'Listening to '+selected.title+' on Sota Kece 🎶',url:SITE};
else data={title:'Sota Kece · Island Mix',text:'Island music on Sota Kece 🎶',url:SITE+'?music=1'};
if(root.SotaShare?.share)root.SotaShare.share(data);
else if(root.navigator?.share)root.navigator.share(data).catch(()=>{});
else{root.navigator?.clipboard?.writeText(data.url).then(()=>{message='Link copied.';sync();},()=>{});}
}
/* ---------- rendering ---------- */
function chip(label,view,countValue){
const node=button('',()=>setView(view));node.className='sk-lib-chip';
node.append(el('span',label),el('small',String(countValue)));
node.setAttribute('aria-pressed',String(prefs.view===view));
return node;
}
function renderLibrary(){
if(!library)return;
library.replaceChildren(
chip('Island Mix','mix',catalogue.length),
chip('My music','device',device.length),
...lists.map(own=>chip(own.name,'pl:'+own.id,own.items.filter(byKey).length)));
const add=button('',()=>{formMode=formMode==='new'?'':'new';pendingAdd='';renderLibrary();});add.className='sk-lib-chip sk-lib-new';add.innerHTML=ICON.add;add.append(el('span','New playlist'));add.setAttribute('aria-expanded',String(formMode==='new'));
library.append(add);
tools.replaceChildren();
if(formMode==='new'||formMode==='rename'){
const own=formMode==='rename'?listById(prefs.view.slice(3)):null;
const form=el('form','','sk-lib-form');const input=el('input');input.type='text';input.maxLength=60;input.required=true;input.placeholder='Playlist name, e.g. Kava night';input.value=own?.name||'';input.setAttribute('aria-label','Playlist name');
const save=el('button',own?'Save name':'Create');save.type='submit';save.className='sk-lib-action sk-lib-primary';
const cancel=button('Cancel',()=>{formMode='';pendingAdd='';renderLibrary();});cancel.className='sk-lib-action';
form.append(input,save,cancel);
form.addEventListener('submit',event=>{
event.preventDefault();const name=cleanName(input.value);if(!name){input.focus();return;}
if(own){own.name=name;saveLists();message='Playlist renamed to '+name+'.';formMode='';renderLibrary();render();return;}
const made=createList(name,pendingAdd);if(!made)return;
message=pendingAdd?'Made '+name+' and added the song.':'Made '+name+'. Tap + on any song to add it.';
formMode='';pendingAdd='';setView('pl:'+made.id);
});
tools.append(form);root.setTimeout(()=>input.focus(),0);
}
else if(prefs.view==='device'){
const pick=button('',()=>deviceInput.click());pick.className='sk-lib-action sk-lib-primary';pick.innerHTML=ICON.add;pick.append(el('span','Add songs from this device'));
tools.append(pick,el('small','Songs stay on this phone or computer. They are not uploaded.','sk-lib-note'));
}
else if(prefs.view.startsWith('pl:')){
const own=listById(prefs.view.slice(3));
if(own){
const rename=button('Rename',()=>{formMode='rename';renderLibrary();});rename.className='sk-lib-action';
const remove=button('Delete playlist',()=>{
if(!root.confirm('Delete the playlist "'+own.name+'"? The songs themselves are kept.'))return;
lists=lists.filter(l=>l.id!==own.id);saveLists();message='Deleted '+own.name+'.';setView('mix');
});remove.className='sk-lib-action sk-lib-danger';
tools.append(rename,remove);
}
}
tools.hidden=!tools.childNodes.length;
if(queueLabel)queueLabel.textContent=viewName().toUpperCase();
}
function addMenu(track,row){
const menu=el('div','','sk-pl-menu');menu.setAttribute('role','group');menu.setAttribute('aria-label','Add '+track.title+' to a playlist');
menu.append(el('span','Add to playlist','sk-pl-menu-title'));
lists.forEach(own=>{
const inside=own.items.includes(track.key);
const option=button('',()=>{toggleInList(own,track.key);menuFor='';renderLibrary();render();});
option.className='sk-pl-option';option.setAttribute('aria-pressed',String(inside));
option.append(el('span',inside?'✓':'+','sk-pl-mark'),el('span',own.name));
menu.append(option);
});
const fresh=button('',()=>{menuFor='';formMode='new';pendingAdd=track.key;renderLibrary();render();});fresh.className='sk-pl-option sk-pl-fresh';
fresh.append(el('span','+','sk-pl-mark'),el('span','New playlist…'));
menu.append(fresh);
row.append(menu);
}
function render(){
if(!list)return;
list.replaceChildren();const query=filter.value.trim().toLocaleLowerCase();let shown=0;
const items=viewList(),inPlaylist=prefs.view.startsWith('pl:'),own=inPlaylist?listById(prefs.view.slice(3)):null;
items.forEach((track,index)=>{
if(query&&!track.title.toLocaleLowerCase().includes(query))return;
shown++;const row=el('li','','sk-song-row');
const pick=button('',()=>playFromView(track.key));pick.className='sk-song-pick';pick.dataset.trackKey=track.key;pick.setAttribute('aria-label','Play '+track.title);
const number=el('span',String(index+1).padStart(2,'0'),'sk-playlist-number');number.setAttribute('aria-hidden','true');pick.append(number,el('span',track.title,'sk-playlist-song-name'));
const add=iconButton('sk-song-act','Add '+track.title+' to a playlist',ICON.add,()=>{menuFor=menuFor===track.key?'':track.key;render();});
add.setAttribute('aria-expanded',String(menuFor===track.key));
row.append(pick,add);
if(own){const drop=iconButton('sk-song-act sk-song-remove','Remove '+track.title+' from '+own.name,ICON.remove,()=>{toggleInList(own,track.key);renderLibrary();render();});row.append(drop);}
if(menuFor===track.key)addMenu(track,row);
list.append(row);
});
if(!shown){
let empty;
if(items.length)empty='No songs match your search.';
else if(prefs.view==='device')empty='No songs saved on this device yet. Tap “Add songs from this device”.';
else if(inPlaylist)empty='This playlist is empty. Go to Island Mix or My music and tap + on a song.';
else empty=loading?'Loading playlist…':'The playlist could not load.';
list.append(el('li',empty,'sk-song-empty'));
}
count.textContent=query?shown+' of '+items.length+' songs':items.length+' song'+(items.length===1?'':'s');sync();
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
catalogue=result.tracks.map(t=>({key:'mix:'+t.id,id:t.id,title:t.title,url:t.url,src:'mix'}));
if(!tracks.length||queueName==='Island Mix'){
const selectedKey=selectedTrack?.key;
if(!selectedTrack||selectedTrack.src==='mix'){tracks=catalogue.slice();queueName='Island Mix';current=selectedKey?tracks.findIndex(t=>t.key===selectedKey):-1;if(current>=0)selectedTrack=tracks[current];buildOrder();}
}
if(pendingSong){
const index=catalogue.findIndex(t=>t.id===pendingSong);pendingSong='';
if(index>=0&&!live()){prefs.view='mix';tracks=catalogue.slice();queueName='Island Mix';current=index;selectedTrack=tracks[index];buildOrder();message='Shared with you · '+selectedTrack.title+'. Tap Play to listen.';}
}
else message=result.stale?'Saved playlist · Connection unavailable. Music needs an internet connection.':selectedTrack?(live()?'Playing · ':'Paused · ')+selectedTrack.title:'Choose a song to start listening.';
retry.hidden=!result.stale;renderLibrary();render();
}
catch(_){message=catalogue.length?'The shared playlist could not refresh. Your current selection is kept.':'The playlist could not load. Check your connection and try again.';retry.hidden=false;renderLibrary();render();}
finally{loading=null;}
})();
return loading;
}
function styles(){
const doc=root.document;
if(doc.querySelector('link[data-sk-deck-styles]'))return;
const link=doc.createElement('link');link.rel='stylesheet';link.href='/music-controls.css?v=20261028-library';link.dataset.skDeckStyles='true';doc.head.append(link);
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
play=iconButton('sk-deck-play','Play',ICON.play,startPlaying);
next=iconButton('sk-deck-skip','Next song',ICON.next,()=>move(1));
repeatBtn=iconButton('sk-deck-mode sk-deck-repeat','Repeat off',ICON.repeat,()=>{prefs.repeat=prefs.repeat==='off'?'all':prefs.repeat==='all'?'one':'off';savePrefs();message=prefs.repeat==='one'?'Repeat on · this song plays again.':prefs.repeat==='all'?'Repeat on · the list starts again at the end.':'Repeat off.';sync();});
main.append(shuffleBtn,previous,play,next,repeatBtn);
const extra=el('div','','sk-deck-extra');
const toggle=el('label','','sk-deck-switch');autoplayInput=el('input');autoplayInput.type='checkbox';autoplayInput.setAttribute('role','switch');
autoplayInput.addEventListener('change',()=>{prefs.autoplay=autoplayInput.checked;savePrefs();message=prefs.autoplay?'Auto-play on · the next song starts by itself.':'Auto-play off · music stops after each song.';sync();});
toggle.append(autoplayInput,el('span','','sk-deck-knob'),el('span','Auto-play','sk-deck-switch-label'));
const sound=el('div','','sk-deck-volume');
shareBtn=iconButton('sk-deck-mute sk-deck-share','Share this song',ICON.share,shareSong);
muteBtn=iconButton('sk-deck-mute','Mute',ICON.volume,()=>{if(prefs.muted||prefs.volume===0){prefs.muted=false;if(prefs.volume===0)prefs.volume=.6;}else prefs.muted=true;savePrefs();syncModes();});
volume=el('input');volume.type='range';volume.min='0';volume.max='100';volume.step='1';volume.className='sk-deck-range';volume.setAttribute('aria-label','Volume');
volume.addEventListener('input',()=>{prefs.volume=Number(volume.value)/100;prefs.muted=prefs.volume===0;savePrefs();syncModes();});
sound.append(shareBtn,muteBtn,volume);
extra.append(toggle,sound);
deck.append(time,main,extra);
return deck;
}
function mediaKeys(){
const session=root.navigator?.mediaSession;if(!session)return;
const set=(action,handler)=>{try{session.setActionHandler(action,handler);}catch(_){}};
set('play',()=>{if(!live())startPlaying();});set('pause',pause);
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
library=el('div','','sk-lib');library.setAttribute('role','group');library.setAttribute('aria-label','Your music lists');
tools=el('div','','sk-lib-tools');tools.hidden=true;
deviceInput=el('input');deviceInput.type='file';deviceInput.multiple=true;deviceInput.accept=root.SotaLocalMusic?.accept||'audio/*';deviceInput.hidden=true;deviceInput.setAttribute('aria-label','Choose songs from this device');
deviceInput.addEventListener('change',async()=>{
const files=Array.from(deviceInput.files||[]);deviceInput.value='';if(!files.length)return;
if(!root.SotaLocalMusic?.importFiles){message='This browser cannot save songs on the device.';sync();return;}
message='Saving songs on this device…';sync();
try{const result=await root.SotaLocalMusic.importFiles(files);await loadDevice();message=(result.saved.length?result.saved.length+' song'+(result.saved.length===1?'':'s')+' added to My music.':'No songs were added.')+(result.rejected.length?' '+result.rejected.map(r=>r.fileName+': '+r.reason).slice(0,2).join(' '):'');}
catch(error){message=error.message||'Songs could not be saved. Check available device storage.';}
sync();
});
const search=el('div','','sk-playlist-search'),label=el('label','Find your next favourite');label.htmlFor='sk-playlist-filter';filter=el('input');filter.id='sk-playlist-filter';filter.type='search';filter.placeholder='Search song or artist';filter.addEventListener('input',render);search.append(label,filter);
count=el('small','Loading playlist…');count.setAttribute('aria-live','polite');list=el('ol','','sk-playlist-songs');list.setAttribute('aria-label','Songs');
const queue=el('div','','sk-playlist-queue');queueLabel=el('span',viewName().toUpperCase());queue.append(queueLabel,count);
const visuals=el('dimau-music-visualiser');visuals.setAttribute('for','sota-playlist-audio');
dialog.append(head,hero,deck,audio,visuals,status,retry,library,tools,deviceInput,search,queue,list);root.document.body.append(dialog);
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
root.addEventListener?.('sota-music-change',()=>{loadDevice();});
mediaKeys();syncModes();renderLibrary();loadDevice();
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
inlineHost=host;dialog.classList.add('sk-playlist-inline');dialog.querySelector('.sk-playlist-close').setAttribute('aria-label','Back to visualiser');
relocate(host);dialog.show();sync();
if(active&&active!==root.document.body&&active.isConnected)active.focus({preventScroll:true});
dialog.querySelector('dimau-music-visualiser')?.wake?.();
if(!catalogue.length)load();
return dialog;
}
function hideInline(){
if(!dialog||!inlineHost)return;
const active=root.document.activeElement;
focusBefore=null;
if(dialog.open)dialog.close();
inlineHost=null;dialog.classList.remove('sk-playlist-inline');dialog.querySelector('.sk-playlist-close').setAttribute('aria-label','Close music playlist');
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
/* A shared song link (sotakece.com/?song=<id>) or music link (?music=1) opens the player ready to play. */
function openFromLink(){
try{
const url=new root.URL(root.location.href),song=url.searchParams.get('song'),music=url.searchParams.get('music');
if(!song&&!music)return;
if(song&&/^[a-z0-9-]{1,80}$/.test(song))pendingSong=song;
url.searchParams.delete('song');url.searchParams.delete('music');
root.history?.replaceState?.(root.history.state,'',url.pathname+(url.search||'')+url.hash);
root.setTimeout(()=>{prefs.view='mix';open();if(catalogue.length&&pendingSong){load();}},700);
}catch(_){}
}
if(root.document){
root.document.addEventListener('play',event=>{if(event.target.tagName==='AUDIO'&&event.target!==audio)pause();},true);
if(root.document.readyState==='complete')openFromLink();else root.addEventListener('load',openFromLink,{once:true});
}
return {validateCatalog,readLists,mount,open,pause,showInline,hideInline,detachInline:hideInline,isInline:()=>!!inlineHost&&!!dialog?.open&&inlineHost.isConnected};
});
