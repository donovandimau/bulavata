(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.SotaPlayback=api;})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  const sources=new Map();
  let activating=false,activeAudio=null;
  const identity=audio=>audio.getAttribute?.('data-sota-playback-source')||'profile';
  function register(source,pause){
    if(typeof source!=='string'||!source||typeof pause!=='function')throw new TypeError('A playback source and pause function are required.');
    sources.set(source,pause);
    return ()=>{if(sources.get(source)===pause)sources.delete(source);};
  }
  function activate(source,currentAudio){
    if(typeof source!=='string'||!source||activating)return;
    activating=true;
    try{
      if(activeAudio&&activeAudio!==currentAudio&&(currentAudio||identity(activeAudio)!==source))try{activeAudio.pause();}catch(_){}
      if(currentAudio)activeAudio=currentAudio;else if(activeAudio&&identity(activeAudio)!==source)activeAudio=null;
      for(const [other,pause] of sources){if(other!==source)try{pause();}catch(_){}}
      root.document?.querySelectorAll('audio').forEach(audio=>{
        if(currentAudio?audio!==currentAudio:identity(audio)!==source)try{audio.pause();}catch(_){}
      });
    }finally{activating=false;}
  }
  function pauseSource(source){
    if(typeof source!=='string'||!source)return;
    if(activeAudio&&identity(activeAudio)===source){try{activeAudio.pause();}catch(_){}activeAudio=null;}
    try{sources.get(source)?.();}catch(_){}
    root.document?.querySelectorAll('audio').forEach(audio=>{if(identity(audio)===source)try{audio.pause();}catch(_){}});
  }
  if(root.document)root.document.addEventListener('play',event=>{
    if(event.target?.tagName==='AUDIO')activate(identity(event.target),event.target);
  },true);
  return {register,activate,pauseSource};
});
