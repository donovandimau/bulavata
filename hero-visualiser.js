/* The original hero's music strip, drawn from the existing shared audio analyser. */
(function(root){
  'use strict';
  let current=null,lastAudio=null;
  const eligible=audio=>audio?.tagName==='AUDIO'&&['sota-playlist-audio','sota-local-audio'].includes(audio.id);
  const slots={
    desktop:{wave:[875,724,254,44],play:[1247,767,58,58]},
    mobile:{wave:[440,1766,336,69],play:[877,1806,84,84]}
  };
  function release(){
    const session=current;if(!session)return;current=null;
    session.abort?.abort();session.stop();session.unbind?.();
    session.cleanup.forEach(fn=>fn());session.cleanup=[];
  }
  function mount(target){
    release();
    const host=target?.querySelector('.sk-hero-visualiser'),image=target?.querySelector('.sk-original-design');
    const canvas=host?.querySelector('canvas'),engine=root.DimauMusicVisuals;
    if(!host||!image||!canvas||!engine)return;
    let ctx;try{ctx=canvas.getContext('2d');}catch(_){}
    const session={host,image,canvas,engine,ctx,cleanup:[],audio:null,graph:null,frame:0,last:0,visible:true,buffering:false,failed:false,pending:null,epoch:0,drawState:{}};
    current=session;
    const valid=()=>current===session&&host.isConnected;
    const listen=(node,event,fn,options)=>{node?.addEventListener(event,fn,options);session.cleanup.push(()=>node?.removeEventListener(event,fn,options));};
    session.stop=()=>{if(session.frame)root.cancelAnimationFrame(session.frame);session.frame=0;session.last=0;};
    const motion=root.matchMedia?.('(prefers-reduced-motion: reduce)');
    const state=value=>{
      if(host.dataset.state===value)return;
      host.dataset.state=value;
      const labels={idle:'Music visualiser · choose a song to begin',live:'Live music visualiser · reacting to the playing song',paused:'Music visualiser paused',waiting:'Music visualiser · waiting for music',unavailable:'Music visualiser unavailable · music playback is unchanged','reduced-motion':'Music visualiser motion paused for your preference'};
      host.setAttribute('aria-label',labels[value]||labels.idle);
    };
    const active=()=>valid()&&ctx&&session.graph&&session.audio&&!session.audio.paused&&!session.audio.ended&&!session.audio.error&&!session.buffering&&!session.failed&&!root.document.hidden&&session.visible&&!motion?.matches&&!root.document.querySelector('dialog[open]')&&host.getBoundingClientRect().width>0;
    function render(live){
      if(!valid()||!ctx)return;
      const rect=canvas.getBoundingClientRect(),ratio=Math.min(root.devicePixelRatio||1,2);
      const width=Math.max(1,Math.min(1920,Math.round(rect.width*ratio))),height=Math.max(1,Math.min(1080,Math.round(rect.height*ratio)));
      if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
      ctx.clearRect(0,0,width,height);
      engine.draw(ctx,width,height,{mode:'waveform',theme:'ocean',gain:1},session.drawState,live?engine.sample(session.audio):null,false);
    }
    function tick(time){
      session.frame=0;if(!active()){refresh();return;}
      const interval=1000/(root.navigator?.connection?.saveData?15:30);
      if(!session.last||time-session.last>=interval){session.drawState.dt=session.last?time-session.last:0;session.last=time;render(true);}
      session.frame=root.requestAnimationFrame(tick);
    }
    function refresh(){
      session.stop();if(!valid())return;
      if(active()){state('live');render(true);session.frame=root.requestAnimationFrame(tick);}
      else{state(!ctx||session.failed?'unavailable':motion?.matches?'reduced-motion':session.audio?.paused||session.audio?.ended?'paused':session.audio?'waiting':'idle');render(false);}
    }
    function bind(audio){
      if(session.audio===audio)return;
      session.abort?.abort();session.epoch++;session.pending=null;session.unbind?.();session.stop();
      session.audio=audio;lastAudio=audio;session.graph=engine.sample(audio);session.failed=false;session.buffering=false;
      const handlers={play:()=>{session.buffering=false;session.connect(audio);},playing:()=>{session.buffering=false;session.connect(audio);},pause:refresh,ended:refresh,emptied:refresh,error:()=>{session.failed=true;refresh();},waiting:()=>{session.buffering=true;refresh();},stalled:()=>{session.buffering=true;refresh();}};
      for(const [name,handler] of Object.entries(handlers))audio.addEventListener(name,handler);
      session.unbind=()=>{for(const [name,handler] of Object.entries(handlers))audio.removeEventListener(name,handler);};
    }
    session.connect=audio=>{
      if(!valid()||!eligible(audio)||!ctx||motion?.matches)return Promise.resolve(null);
      bind(audio);if(session.pending)return session.pending;
      const epoch=++session.epoch,controller=new root.AbortController();session.abort=controller;
      session.pending=Promise.resolve().then(()=>{
        if(!valid()||controller.signal.aborted)return null;
        return engine.prepare(audio,{signal:controller.signal});
      }).then(graph=>{
        if(!valid()||controller.signal.aborted||session.epoch!==epoch||session.audio!==audio)return null;
        session.pending=null;session.graph=graph;session.failed=!graph;refresh();return graph;
      }).catch(()=>{
        if(valid()&&!controller.signal.aborted&&session.epoch===epoch){session.pending=null;session.failed=true;refresh();}
        return null;
      });return session.pending;
    };
    function measure(){
      if(!valid())return;
      const parent=image.closest('.sk-hero-artwork'),parentRect=parent.getBoundingClientRect(),rect=image.getBoundingClientRect();
      if(!rect.width||!rect.height)return;
      host.hidden=false;const playButton=parent.querySelector('.sk-artwork-play');if(playButton)playButton.hidden=false;
      const mobile=root.matchMedia?.('(max-width:760px)').matches;
      const naturalWidth=image.naturalWidth||(mobile?1008:1360),naturalHeight=image.naturalHeight||(mobile?1896:832);
      const scale=Math.min(rect.width/naturalWidth,rect.height/naturalHeight),width=naturalWidth*scale,height=naturalHeight*scale;
      const left=rect.left-parentRect.left+(rect.width-width)/2,top=rect.top-parentRect.top+(rect.height-height)/2;
      const apply=(element,box)=>{if(!element)return;element.style.left=(left+box[0]*scale)+'px';element.style.top=(top+box[1]*scale)+'px';element.style.width=(box[2]*scale)+'px';element.style.height=(box[3]*scale)+'px';};
      const slot=slots[mobile?'mobile':'desktop'];apply(host,slot.wave);apply(parent.querySelector('.sk-artwork-play'),slot.play);refresh();
    }
    listen(root.document,'play',event=>{if(eligible(event.target))session.connect(event.target);},true);
    listen(root.document,'visibilitychange',refresh);
    listen(root.document,'close',refresh,true);listen(root.document,'toggle',refresh,true);
    listen(image,'load',measure);listen(root,'resize',measure);
    listen(motion,'change',()=>{if(motion.matches){session.abort?.abort();session.pending=null;session.epoch++;}refresh();});
    if(root.ResizeObserver){const observer=new root.ResizeObserver(measure);observer.observe(image);session.cleanup.push(()=>observer.disconnect());}
    if(root.IntersectionObserver){const observer=new root.IntersectionObserver(entries=>{session.visible=entries.some(entry=>entry.isIntersecting);refresh();});observer.observe(host);session.cleanup.push(()=>observer.disconnect());}
    if(root.MutationObserver){const observer=new root.MutationObserver(()=>{if(!host.isConnected&&current===session)release();});observer.observe(target,{childList:true,subtree:true});session.cleanup.push(()=>observer.disconnect());}
    const existing=[...root.document.querySelectorAll('#sota-playlist-audio,#sota-local-audio'),lastAudio].find(audio=>eligible(audio)&&!audio.paused&&!audio.ended&&!audio.error);
    if(existing)bind(existing);
    measure();refresh();
    return ()=>{if(current===session)release();};
  }
  function prepare(audio){return current?.connect(audio)||Promise.resolve(null);}
  root.SotaHeroVisualiser={mount,prepare,release};
})(typeof globalThis!=='undefined'?globalThis:this);
