/* Two hero music surfaces share one analyser sample and animation loop. */
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
    const canvas=host?.querySelector('canvas'),stage=target?.querySelector('.sk-music-stage'),engine=root.DimauMusicVisuals;
    if(!host||!image||!canvas||!engine)return;
    const surface=(node,large=false)=>{const picture=large?node.querySelector('.sk-music-stage-picture'):node,c=picture?.querySelector('canvas');let ctx;try{ctx=c?.getContext('2d');}catch(_){}return {host:picture,canvas:c,ctx,large,visible:true,drawState:{}};};
    const surfaces=[surface(host),...(stage?[surface(stage,true)]:[])];
    const session={host,image,canvas,engine,surfaces,cleanup:[],audio:null,graph:null,frame:0,last:0,buffering:false,failed:false,pending:null,epoch:0,mode:'spectrum',motionPaused:false,previewTime:0};
    current=session;
    const valid=()=>current===session&&host.isConnected;
    // Home is a still gallery; the Music page retains its live controls.
    const still=()=>target.dataset.frontPage==='home';
    const listen=(node,event,fn,options)=>{node?.addEventListener(event,fn,options);session.cleanup.push(()=>node?.removeEventListener(event,fn,options));};
    session.stop=()=>{if(session.frame)root.cancelAnimationFrame(session.frame);session.frame=0;session.last=0;};
    const motion=root.matchMedia?.('(prefers-reduced-motion: reduce)');
    const state=value=>{
      host.dataset.state=value;
      const labels={still:'Still rainbow music visual · open Music to explore your soundtrack',idle:'Ambient visual preview · choose a song to react to your music',live:'Live music visualiser · reacting to the playing song',paused:'Ambient visual preview · music is paused',waiting:'Ambient visual preview · waiting for audio',unavailable:surfaces.some(part=>part.ctx)?'Ambient visual preview · audio analysis unavailable; music playback is unchanged':'Music visualiser unavailable · music playback is unchanged','reduced-motion':'Visual preview motion paused for your device preference','motion-paused':'Visual motion paused'};
      host.setAttribute('aria-label',labels[value]||labels.idle);
      if(stage){
        stage.dataset.state=value;stage.querySelector('.sk-music-stage-picture')?.setAttribute('aria-label',labels[value]||labels.idle);
        const status=stage.querySelector('[data-stage-status]');
        if(status)status.textContent=({still:'Still rainbow music visual',idle:'AMBIENT PREVIEW · Choose a song for live audio visuals',live:'LIVE AUDIO · Moving to your music',paused:'AMBIENT PREVIEW · Music is paused',waiting:'AMBIENT PREVIEW · Waiting for audio',unavailable:surfaces.some(part=>part.ctx)?'AMBIENT PREVIEW · Audio analysis unavailable':'Visuals unavailable · music can keep playing','reduced-motion':'Motion paused · following your device preference','motion-paused':'Visuals paused'})[value]||'';
        const toggle=stage.querySelector('[data-stage-motion]');
        if(toggle){toggle.disabled=!!motion?.matches;toggle.setAttribute('aria-pressed',String(session.motionPaused));toggle.textContent=session.motionPaused?'Resume visuals':'Pause visuals';}
      }
    };
    const visible=part=>part.ctx&&part.host?.isConnected&&part.visible&&(!part.host.getClientRects||part.host.getClientRects().length>0)&&part.host.getBoundingClientRect().width>0;
    const active=()=>valid()&&!still()&&surfaces.some(visible)&&!root.document.hidden&&!session.motionPaused&&!motion?.matches&&!root.document.querySelector('dialog[open]:not(.sk-playlist-inline)');
    const liveAudio=()=>session.graph?.context?.state==='running'&&session.audio&&session.audio.readyState>=3&&!session.audio.paused&&!session.audio.ended&&!session.audio.error&&!session.buffering&&!session.failed;
    function displayState(live){
      return !surfaces.some(part=>part.ctx)?'unavailable':still()?'still':motion?.matches?'reduced-motion':session.motionPaused?'motion-paused':live?'live':session.failed?'unavailable':session.audio?.paused||session.audio?.ended?'paused':session.audio?'waiting':'idle';
    }
    function render(live){
      if(!valid())return;
      const frozen=still(),data=live&&!frozen?engine.sample(session.audio):null,previewTime=frozen?1200:session.previewTime,mode=frozen?'spectrum':session.mode,ratio=Math.min(root.devicePixelRatio||1,2);
      for(const part of surfaces){
        if(!part.ctx||!part.canvas||!visible(part))continue;
        const {ctx,canvas,large}=part,rect=canvas.getBoundingClientRect();
        const width=Math.max(1,Math.min(1920,Math.round(rect.width*ratio))),height=Math.max(1,Math.min(1080,Math.round(rect.height*ratio)));
        if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
        ctx.clearRect(0,0,width,height);if(frozen)part.drawState={};part.drawState.preview=!data;part.drawState.previewTime=previewTime;
        ctx.save();
        // Preserve each hue: additive pink glow used to wash the whole spectrum pale.
        ctx.globalCompositeOperation='source-over';
        engine.draw(ctx,width,height,{mode:large?mode:'waveform',theme:large||frozen?'rainbow':'ocean',gain:large?1.5:1,vivid:large||frozen},part.drawState,data,false);
        if(large&&mode==='spectrum')engine.draw(ctx,width,height,{mode:'waveform',theme:'rainbow',gain:1.3},{preview:!data,previewTime},data,false);
        ctx.restore();
      }
    }
    function tick(time){
      session.frame=0;if(!active()){refresh();return;}
      const interval=1000/(root.navigator?.connection?.saveData?15:30);
      if(!session.last||time-session.last>=interval){
        const dt=session.last?Math.min(100,time-session.last):interval;session.previewTime+=dt;
        for(const part of surfaces)part.drawState.dt=dt;session.last=time;
        const live=!!liveAudio();state(displayState(live));render(live);
      }
      session.frame=root.requestAnimationFrame(tick);
    }
    function refresh(){
      session.stop();if(!valid())return;
      const moving=active(),live=!!(moving&&liveAudio());state(displayState(live));render(live);
      if(moving)session.frame=root.requestAnimationFrame(tick);
    }
    function bind(audio){
      if(session.audio===audio)return;
      session.abort?.abort();session.epoch++;session.pending=null;session.unbind?.();session.stop();
      session.audio=audio;lastAudio=audio;session.graph=audio.readyState>=3?engine.sample(audio):null;session.failed=false;session.buffering=false;
      const handlers={play:()=>{session.buffering=false;session.connect(audio);},playing:()=>{session.buffering=false;session.connect(audio);},pause:refresh,ended:refresh,emptied:refresh,error:()=>{session.failed=true;refresh();},waiting:()=>{session.buffering=true;refresh();},stalled:()=>{session.buffering=true;refresh();}};
      for(const [name,handler] of Object.entries(handlers))audio.addEventListener(name,handler);
      session.unbind=()=>{for(const [name,handler] of Object.entries(handlers))audio.removeEventListener(name,handler);};
    }
    session.connect=audio=>{
      if(!valid()||!eligible(audio)||!surfaces.some(part=>part.ctx)||motion?.matches)return Promise.resolve(null);
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
      if(!rect.width||!rect.height){refresh();return;}
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
    listen(root.document,'sota-music-home-change',refresh);
    listen(root.document,'sota-front-page-change',refresh);
    listen(root.document,'close',refresh,true);listen(root.document,'toggle',refresh,true);
    listen(image,'load',measure);listen(root,'resize',measure);
    listen(motion,'change',()=>{if(motion.matches){session.abort?.abort();session.pending=null;session.epoch++;}refresh();});
    listen(stage?.querySelector('[data-stage-mode]'),'change',event=>{const mode=event.target.value;if(['spectrum','waveform','halo'].includes(mode)){session.mode=mode;for(const part of surfaces)part.drawState={};refresh();}});
    listen(stage?.querySelector('[data-stage-motion]'),'click',()=>{session.motionPaused=!session.motionPaused;refresh();});
    if(root.ResizeObserver){const observer=new root.ResizeObserver(measure);observer.observe(image);if(stage)observer.observe(stage);session.cleanup.push(()=>observer.disconnect());}
    if(root.IntersectionObserver){const observer=new root.IntersectionObserver(entries=>{for(const entry of entries){const part=surfaces.find(part=>part.host===entry.target);if(part)part.visible=entry.isIntersecting;}refresh();});surfaces.forEach(part=>observer.observe(part.host));session.cleanup.push(()=>observer.disconnect());}
    if(root.MutationObserver){const observer=new root.MutationObserver(()=>{if(!host.isConnected&&current===session)release();});observer.observe(target,{childList:true,subtree:true});session.cleanup.push(()=>observer.disconnect());}
    const existing=[...root.document.querySelectorAll('#sota-playlist-audio,#sota-local-audio'),lastAudio].find(audio=>eligible(audio)&&!audio.paused&&!audio.ended&&!audio.error);
    if(existing)bind(existing);
    measure();refresh();
    return ()=>{if(current===session)release();};
  }
  function prepare(audio){return current?.connect(audio)||Promise.resolve(null);}
  root.SotaHeroVisualiser={mount,prepare,release};
})(typeof globalThis!=='undefined'?globalThis:this);
