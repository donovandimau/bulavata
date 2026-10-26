/* Decorative badge state only; playback remains owned by the existing players. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(root);
  else if(root.SotaMusicBadge?.install)root.SotaMusicBadge.install();
  else{root.SotaMusicBadge=factory(root);root.SotaMusicBadge.install();}
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  const events=['play','playing','waiting','stalled','pause','ended','error','emptied'];
  const eligible=audio=>audio?.tagName==='AUDIO'&&['sota-playlist-audio','sota-local-audio'].includes(audio.id);
  const healthy=audio=>eligible(audio)&&!audio.paused&&!audio.ended&&!audio.error;
  let document=null,current=null,installed=false,phases=new WeakMap(),cleanup=[],unbind=()=>{};
  const show=playing=>document?.documentElement?.classList.toggle('sota-music-playing',!!playing);
  const sync=()=>show(!document.hidden&&healthy(current)&&phases.get(current)==='playing');
  function bind(audio){
    if(current===audio)return;
    if(current)phases.set(current,'superseded');
    unbind();current=audio;
    // Local music can keep playing after its dialog is removed. Direct
    // listeners still observe that audio when document capture cannot.
    for(const event of events)audio.addEventListener(event,media);
    unbind=()=>{for(const event of events)audio.removeEventListener(event,media);};
  }
  function media(event){
    const audio=event.target;if(!installed||!eligible(audio))return;
    if(event.type==='playing'&&healthy(audio)){
      bind(audio);phases.set(audio,'playing');sync();
    }else if(event.type==='stalled'&&audio===current&&healthy(audio)&&audio.readyState>=3&&phases.get(audio)==='playing'){
      // Downloading may stall while buffered audio continues playing.
      sync();
    }else{
      phases.set(audio,event.type==='play'?'pending':'blocked');
      if(audio===current)sync();
    }
  }
  function restore(){
    if(document.hidden){show(false);return;}
    const candidates=[current,...document.querySelectorAll('#sota-playlist-audio,#sota-local-audio')];
    const audio=candidates.find(item=>healthy(item)&&item.readyState>=3&&(!phases.has(item)||phases.get(item)==='playing'));
    if(audio){bind(audio);phases.set(audio,'playing');sync();}else show(false);
  }
  function release(){
    (document||root.document)?.documentElement?.classList.remove('sota-music-playing');
    installed=false;unbind();unbind=()=>{};
    cleanup.forEach(fn=>fn());cleanup=[];current=null;document=null;phases=new WeakMap();
  }
  function install(){
    if(installed)return release;
    document=root.document;
    if(!document?.documentElement||!document.addEventListener){document=null;return release;}
    installed=true;
    for(const event of events){
      document.addEventListener(event,media,true);
      cleanup.push(()=>document.removeEventListener(event,media,true));
    }
    document.addEventListener('visibilitychange',restore);
    cleanup.push(()=>document.removeEventListener('visibilitychange',restore));
    restore();return release;
  }
  return {install,release};
});
