/* Original outline symbols for explicit UI actions. Content cards and artwork keep their own presentation. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.SotaIconControls=api;})(typeof globalThis==='object'?globalThis:this,function(root){
  'use strict';
  const icons={
    home:'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',
    music:'M9 17V5l11-2v12M9 8l11-2M9 17c0 2-2 3-4 3s-3-1-3-2.5S4 15 6 15c1 0 2 .5 3 1M20 15c0 2-2 3-4 3s-3-1-3-2.5 2-2.5 4-2.5c1 0 2 .5 3 1',
    world:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z',
    connect:'M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16 10a3 3 0 0 0 0-6M3 21v-3a6 6 0 0 1 12 0v3M17 13a5 5 0 0 1 4 5v3',
    design:'M20 13a8 8 0 1 0-9 8h2a2 2 0 0 0 1-4 2 2 0 0 1 2-3h2a2 2 0 0 0 2-1ZM7 9h.01M10 6h.01M15 7h.01M6 13h.01',
    back:'M19 12H5m6-6-6 6 6 6',close:'M6 6l12 12M18 6 6 18',
    play:'M8 4v16l12-8L8 4Z',pause:'M8 4v16M16 4v16',previous:'M5 5v14M19 5l-10 7 10 7V5Z',next:'M19 5v14M5 5l10 7-10 7V5Z',
    upload:'M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5',save:'M5 3h12l4 4v14H3V3h2ZM7 3v6h10V3M7 21v-8h10v8',
    cancel:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM8 8l8 8M16 8l-8 8',
    share:'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM9 10l6-4M9 14l6 4',
    copy:'M8 8h13v13H8V8ZM16 4V2H2v14h2',invite:'M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 21v-3a6 6 0 0 1 12 0v3M19 8v8m-4-4h8',
    search:'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-2 5 6 6',
    refresh:'M20 8a9 9 0 1 0 0 8M20 3v5h-5',reset:'M4 8a9 9 0 1 1 0 8M4 3v5h5',
    fullscreen:'M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6',edit:'m15 4 5 5M3 21l5-1L21 7a2 2 0 0 0-5-5L3 15v6Z',
    signup:'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21v-2a7 7 0 0 1 12-5M19 13v8m-4-4h8',
    signin:'M14 3h7v18h-7M3 12h13m-5-5 5 5-5 5',delete:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
    view:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
    undo:'M8 4 3 9l5 5M3 9h10a7 7 0 0 1 0 14',
    visualiser:'M2 12h3l3-8 4 16 4-12 3 4h3',playlist:'M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01',
    colour:'M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',swatch:'M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
    mix:'M15 8a5 5 0 1 1-10 0 5 5 0 0 1 10 0ZM11 16a5 5 0 1 1-10 0 5 5 0 0 1 10 0ZM23 16a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z'
  };
  const rules=[
    {selector:'.sfp-navigation a[data-front-view]',action:node=>({home:'home',music:'music',world:'world',connect:'connect',skins:'design',profile:'edit',talanoa:'connect'}[node.dataset.frontView]||'view'),label:node=>node.dataset.frontView==='world'?'3D connections':''},
    {selector:'a.sfp-back,#kc-back',action:'back',label:'Back to home'},
    {selector:'a.sfp-page-close,a.sfp-panel-close,.sk-playlist-close,.spp-close,.ssd-close,.ssd-feedback-close,[data-tc-close],.bv-music-dialog-head button,#bv-account-close,.bv-close,#kc-close,.sota-modal-head>button',action:'close',label:'Close panel'},
    {selector:'.ssd-launcher,.ssd-dialog-design',action:'design',label:'Design your space'},
    {selector:'[data-music-view]',action:node=>node.dataset.musicView==='playlist'?'playlist':'visualiser',label:node=>node.dataset.musicView==='playlist'?'Music playlist':'Music visualiser'},
    {selector:'.ssd-mode-tabs [data-ssd-mode]',action:node=>node.dataset.ssdMode==='one'?'colour':'mix',label:node=>node.dataset.ssdMode==='one'?'One colour':'Mix and match colours'},
    {selector:'.ssd-one-colour,.ssd-palette',action:'swatch',label:'Choose colour mood'},
    {selector:'#sk-sign-up',action:'signup',label:'Sign up'},
    {selector:'#sk-sign-in,[data-tc-sign-in]',action:'signin',label:'Sign in'},
    {selector:'#a-go',action:'signin',label:'Sign in',dynamic:true},
    {selector:'#sk-share-app,[data-tc-share]',action:'share',label:'Share'},
    {selector:'#sk-copy-invite,[data-tc-copy]',action:'copy',label:'Copy link'},
    {selector:'#sk-invite-circle',action:'invite',label:'Invite to a circle'},
    {selector:'.bv-home-search button[type="submit"],#bv-home-search button',action:'search',label:'Find a mate'},
    {selector:'.sk-playlist-transport button,#bv-local-music-play,[data-local-music-toggle]',action:'play',label:'Play music',dynamic:true},
    {selector:'[data-local-music-open],#bv-home-play,.sk-music-stage-choose',action:node=>node.matches('[data-local-music-open]')?'upload':'music',label:node=>node.matches('[data-local-music-open]')?'Upload music':'Choose music'},
    {selector:'[data-photo-save],.ssd-save,#bv-save,[data-tc-save]',action:'save',label:'Save changes'},
    {selector:'.spp-dialog [data-photo-cancel]:not(.spp-close),.ssd-cancel,#bv-cancel',action:'cancel',label:'Cancel',dynamic:true},
    {selector:'.ssd-reset,[data-lg3d-reset]',action:'reset',label:'Reset view'},
    {selector:'.ssd-text-button',action:'delete',label:'Remove image'},
    {selector:'.ssd-undo',action:'undo',label:'Undo design change'},
    {selector:'[data-friend-refresh],[data-tc-refresh]',action:'refresh',label:'Refresh'},
    {selector:'[data-tc-view]',action:'view',label:'View graph'},
    {selector:'[data-slc-edit]',action:'edit',label:'Edit connection'},
    {selector:'[data-slc-remove]',action:'delete',label:'Remove connection'},
    {selector:'[data-slc-add],.tc-create button[type="submit"]',action:'invite',label:'Add connection'},
    {selector:'[data-slc-cancel]',action:'close',label:'Close connection form'},
    {selector:'.slc-save',action:'save',label:'Save connection'},
    {selector:'[data-stage-fullscreen]',action:'fullscreen',label:'Fullscreen visualiser'},
    {selector:'[data-stage-motion],[data-slc-motion]',action:'pause',label:'Pause visuals',dynamic:true}
  ];
  const selector=rules.map(rule=>rule.selector).join(',');
  const excluded='.sk-hero-play,.sk-artwork-play,.sk-hero-create,.spp-hero-edit';
  const content='[data-skin],[data-collection],.sk-playlist-songs,.bv-local-music-list,.lg3d-labels,.lg3d-list';
  let current=null;
  const words=value=>String(value||'').replace(/\s+/g,' ').replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu,'').trim();
  function infer(value,fallback){
    const text=words(value).toLowerCase();
    if(/^(?:pause|stop animation)/.test(text))return 'pause';if(/^(?:play|resume|start motion)/.test(text))return 'play';
    if(/^previous/.test(text))return 'previous';if(/^next/.test(text))return 'next';if(/^close/.test(text))return 'close';if(/^cancel/.test(text))return 'cancel';
    if(/^(?:sign up|create (?:your )?account)/.test(text))return 'signup';if(/^sign in/.test(text))return 'signin';return fallback;
  }
  function symbol(action){
    const span=root.document.createElement('span');span.className='sota-control-symbol';span.setAttribute('aria-hidden','true');
    const svg=root.document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width','24');svg.setAttribute('height','24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.7');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('focusable','false');svg.setAttribute('aria-hidden','true');
    const path=root.document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',icons[action]||icons.view);
    if(action==='swatch')path.setAttribute('fill','var(--one-accent,var(--swatch,currentColor))');else if(action==='colour')path.setAttribute('fill','currentColor');
    svg.append(path);span.append(svg);return span;
  }
  function restore(record){
    const {node,label,symbol:icon}=record;
    if(label?.parentNode===node)label.replaceWith(...label.childNodes);
    if(icon?.parentNode===node)icon.remove();
    if(!record.hadClass)node.classList.remove('sota-icon-control');
    if(record.oldIcon===null)node.removeAttribute('data-sota-icon');else node.setAttribute('data-sota-icon',record.oldIcon);
    for(const [name,old,last] of [['aria-label',record.baseAria,record.lastAria],['title',record.baseTitle,record.lastTitle]])if(node.getAttribute(name)===last){if(old===null)node.removeAttribute(name);else node.setAttribute(name,old);}
  }
  function stop(){const session=current;current=null;if(!session)return;session.observer?.disconnect();session.records.forEach(restore);session.records.clear();session.pending.clear();}
  function mount(target=root.document?.body){
    stop();if(!target)return ()=>{};
    const session={target,records:new Map(),pending:new Set(),scheduled:false,observer:null};current=session;
    const inside=node=>node===target||target.contains(node);
    function enhance(node){
      if(!inside(node)||!node.matches('button,a')||node.matches(excluded)||node.closest(content)||node.querySelector('input,select,textarea,button,a'))return;
      const rule=rules.find(item=>node.matches(item.selector));if(!rule)return;
      let record=session.records.get(node);
      if(!record){record={node,baseAria:node.getAttribute('aria-label'),baseTitle:node.getAttribute('title'),lastAria:null,lastTitle:null,oldIcon:node.getAttribute('data-sota-icon'),hadClass:node.classList.contains('sota-icon-control'),action:''};session.records.set(node,record);}
      else{if(node.getAttribute('aria-label')!==record.lastAria)record.baseAria=node.getAttribute('aria-label');if(node.getAttribute('title')!==record.lastTitle)record.baseTitle=node.getAttribute('title');}
      const text=words(node.textContent),fallback=typeof rule.label==='function'?rule.label(node):rule.label,base=words(record.baseAria),baseAction=typeof rule.action==='function'?rule.action(node):rule.action;
      const action=rule.dynamic?infer(text||base,baseAction):baseAction;
      let label=text||base||fallback||'Open';
      // Static actions keep the canonical accessible name supplied by their owner,
      // including shorter or equal-length route labels. Dynamic playback text wins
      // over a stale Play/Pause aria label until both describe the same state.
      if(base&&(!rule.dynamic||!text||infer(base,'')===action))label=base;
      if(node.matches('.sfp-navigation [data-front-view="world"]'))label='3D connections';
      if(!record.label||record.label.parentNode!==node||node.childNodes.length!==2||record.symbol?.parentNode!==node){
        record.symbol?.remove();if(record.label?.parentNode===node)record.label.replaceWith(...record.label.childNodes);
        const wrapper=root.document.createElement('span');wrapper.className='sota-control-label';while(node.firstChild)wrapper.append(node.firstChild);node.append(wrapper);record.label=wrapper;record.symbol=symbol(action);node.prepend(record.symbol);record.action=action;
      }else if(record.action!==action){const next=symbol(action);record.symbol.replaceWith(next);record.symbol=next;record.action=action;}
      node.classList.add('sota-icon-control');if(node.getAttribute('data-sota-icon')!==action)node.setAttribute('data-sota-icon',action);
      if(node.getAttribute('aria-label')!==label)node.setAttribute('aria-label',label);record.lastAria=label;
      if(node.getAttribute('title')!==label)node.setAttribute('title',label);record.lastTitle=label;
    }
    function flush(){
      session.scheduled=false;if(current!==session)return;
      const controls=[...session.pending];session.pending.clear();controls.forEach(enhance);
      for(const [node,record] of session.records)if(!inside(node)){restore(record);session.records.delete(node);}
    }
    function enqueue(node,subtree=false){
      if(!node)return;const element=node.nodeType===1?node:node.parentElement;if(!element)return;
      const nearest=element.closest?.(selector);if(nearest&&inside(nearest))session.pending.add(nearest);
      if(subtree&&element.querySelectorAll)element.querySelectorAll(selector).forEach(control=>session.pending.add(control));
    }
    enqueue(target,true);flush();
    if(root.MutationObserver){session.observer=new root.MutationObserver(changes=>{
      if(current!==session)return;
      let removedControls=false;
      for(const change of changes){enqueue(change.target);if(change.type==='childList'){
        change.addedNodes.forEach(node=>enqueue(node,true));
        if(!removedControls)removedControls=[...change.removedNodes].some(node=>node.nodeType===1&&(node.matches(selector)||node.querySelector(selector)));
      }}
      if((session.pending.size||removedControls)&&!session.scheduled){session.scheduled=true;root.queueMicrotask(flush);}
    });session.observer.observe(target,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','title']});}
    return ()=>{if(current===session)stop();};
  }
  function init(options={}){return mount(options?.nodeType?options:options.app||root.document?.body);}
  return {init,mount,stop};
});
