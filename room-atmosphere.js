/* Ambient room art. CSS does the drawing; no canvas, audio or per-frame JS. */
(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SotaRoomAtmosphere=api;
})(typeof window==='object'?window:globalThis,function(root){
  'use strict';
  const effects=Object.freeze([
    {id:'none',name:'Off'}, {id:'bubbles',name:'Lagoon bubbles'},
    {id:'stars',name:'Island starfield'}, {id:'waves',name:'Neon soundwaves'},
    {id:'sparks',name:'Celebration sparks'}, {id:'masi',name:'Masi glow'}
  ]);
  function markup(settings={}){
    const effect=effects.find(e=>e.id===settings.atmosphere);
    if(!effect||effect.id==='none')return '';
    const count=effect.id==='waves'?7:effect.id==='masi'?12:20;
    const particles=Array.from({length:count},(_,i)=>`<i style="--x:${(i*37+9)%100}%;--y:${(i*23+12)%90}%;--size:${12+(i*13)%53}px;--delay:-${i*.7}s;--turn:${i*19}deg;--n:${i}"></i>`).join('');
    return `<div class="sk-atmosphere" data-atmosphere="${effect.id}" data-energy="${settings.motionEnergy==='calm'?'calm':'bold'}" data-running="false"><div class="sk-atmosphere-art" aria-hidden="true">${particles}</div><button type="button" class="sk-motion-toggle" aria-pressed="false" aria-label="Play ${effect.name}">Play motion</button></div>`;
  }
  const mounted=new Map();
  let observer=null,media=null,initialized=false;
  function refresh(node,state){
    const running=state.wanted&&state.visible&&!root.document.hidden&&!media?.matches;
    node.dataset.running=String(running);
    const name=effects.find(e=>e.id===node.dataset.atmosphere)?.name||'room motion';
    state.button.textContent=state.wanted?'Pause motion':'Play motion';
    state.button.setAttribute('aria-pressed',String(state.wanted));
    state.button.setAttribute('aria-label',`${state.wanted?'Pause':'Play'} ${name}`);
    state.button.disabled=!!media?.matches;
    if(media?.matches){state.button.textContent='Reduced motion';state.button.setAttribute('aria-label','Animation paused by your reduced motion preference');}
  }
  function release(scope){
    for(const [node,state] of mounted){
      if(!node.isConnected||scope===node||scope?.contains(node)){
        node.dataset.running='false';observer?.unobserve(node);
        state.button.removeEventListener('click',state.click);mounted.delete(node);
      }
    }
  }
  function mount(scope){
    if(!scope||!root.document)return;
    release();
    if(!initialized){
      initialized=true;media=root.matchMedia?.('(prefers-reduced-motion: reduce)');
      media?.addEventListener?.('change',()=>{for(const [node,state] of mounted){state.wanted=false;refresh(node,state);}});
      root.document.addEventListener('visibilitychange',()=>{release();for(const [node,state] of mounted)refresh(node,state);});
      if(root.IntersectionObserver)observer=new root.IntersectionObserver(entries=>{
        for(const entry of entries){const state=mounted.get(entry.target);if(state){state.visible=entry.isIntersecting;refresh(entry.target,state);}}
      },{threshold:0});
    }
    scope.querySelectorAll('.sk-atmosphere').forEach(node=>{
      if(mounted.has(node))return;
      const button=node.querySelector('.sk-motion-toggle');if(!button)return;
      const state={button,wanted:false,visible:true,click:null};
      state.click=()=>{state.wanted=!state.wanted;refresh(node,state);};
      mounted.set(node,state);button.addEventListener('click',state.click);observer?.observe(node);refresh(node,state);
    });
  }
  return {effects,markup,mount,release};
});
