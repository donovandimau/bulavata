/* Geometry only: original artwork panels, independent of auth, audio and data. */
(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SotaRoomSocialLayout=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  const slots={
    desktop:{width:1360,height:832,wall:[638,518,344,186],mates:[993,470,300,252]},
    mobile:{width:1008,height:1896,wall:[120,1275,779,218],mates:[120,1501,779,235]}
  };
  let current=null;
  function stop(){
    const session=current;if(!session)return;current=null;
    if(session.frame)root.cancelAnimationFrame?.(session.frame);
    session.cleanup.forEach(fn=>fn());session.cleanup=[];
  }
  function mount(parent=root.document?.getElementById('app')){
    stop();
    const host=parent?.querySelector('.sota-social-host.sota-social-hero');
    const image=parent?.querySelector('.sk-original-design');
    const artwork=image?.closest('.sk-hero-artwork');
    if(!host||!image||!artwork||!artwork.contains(host))return ()=>{};
    const session={host,image,artwork,frame:0,cleanup:[]};current=session;
    const valid=()=>current===session&&host.isConnected!==false&&image.isConnected!==false&&artwork.contains(host);
    const listen=(node,event,fn)=>{
      node?.addEventListener?.(event,fn);
      session.cleanup.push(()=>node?.removeEventListener?.(event,fn));
    };
    function measure(){
      if(!valid())return;
      const source=image.currentSrc||image.src||'';
      const sourceMode=/(?:^|\/)mobile-front-reference-brand\.jpg(?:[?#]|$)/.test(source)?'mobile':/(?:^|\/)front-reference-brand\.jpg(?:[?#]|$)/.test(source)?'desktop':null;
      if(source&&!sourceMode)return;
      // Natural dimensions describe the image actually drawn. A media query or
      // currentSrc may switch before its replacement has finished loading.
      // Keep fitting the drawn image, then remeasure on the next load event.
      const mode=Object.keys(slots).find(key=>image.naturalWidth===slots[key].width&&image.naturalHeight===slots[key].height);
      if(!mode)return; // Initial opaque CSS masks remain while the image loads.
      const slot=slots[mode],rect=image.getBoundingClientRect(),bounds=artwork.getBoundingClientRect();
      if(!(rect.width>0&&rect.height>0))return;
      const scale=Math.min(rect.width/slot.width,rect.height/slot.height);
      const left=rect.left-bounds.left+(rect.width-slot.width*scale)/2;
      const top=rect.top-bounds.top+(rect.height-slot.height*scale)/2;
      host.style.setProperty('--sota-source-scale',String(scale));
      host.dataset.socialLayout=mode;
      for(const name of ['wall','mates']){
        const panel=host.querySelector('[data-social-panel="'+name+'"]');
        if(!panel)continue;
        const [x,y,width,height]=slot[name];
        panel.style.left=(left+x*scale).toFixed(3)+'px';
        panel.style.top=(top+y*scale).toFixed(3)+'px';
        panel.style.width=(width*scale).toFixed(3)+'px';
        panel.style.height=(height*scale).toFixed(3)+'px';
      }
    }
    function schedule(){
      if(!valid()||session.frame)return;
      if(!root.requestAnimationFrame){measure();return;}
      session.frame=root.requestAnimationFrame(()=>{session.frame=0;measure();});
    }
    listen(image,'load',schedule);listen(root,'resize',schedule);
    if(root.ResizeObserver){
      const observer=new root.ResizeObserver(schedule);observer.observe(image);observer.observe(artwork);
      session.cleanup.push(()=>observer.disconnect());
    }
    if(root.MutationObserver){
      const observer=new root.MutationObserver(()=>{if(current===session&&!valid())stop();});
      observer.observe(parent,{childList:true,subtree:true});session.cleanup.push(()=>observer.disconnect());
    }
    measure();
    return ()=>{if(current===session)stop();};
  }
  return {mount,stop};
});
