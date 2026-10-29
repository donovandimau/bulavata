import {SKINS} from './skin-library.mjs';
export {SKINS};
export const skinById=id=>SKINS.find(s=>s.id===id)||null;
export const spaceKey=owner=>'sota.combined.space.v1:'+encodeURIComponent(owner||'sample');
export function readSpace(storage,owner){try{const v=JSON.parse(storage.getItem(spaceKey(owner))||'null');return {skin:skinById(v?.skin)?.id||'',mates:Array.isArray(v?.mates)?[...new Set(v.mates.filter(x=>typeof x==='string'&&x.length<100))].slice(0,16):null};}catch{return {skin:'',mates:null};}}
export function saveSpace(storage,owner,value){const next={skin:skinById(value.skin)?.id||'',mates:Array.isArray(value.mates)?[...new Set(value.mates)].filter(x=>typeof x==='string'&&x.length<100).slice(0,16):null};storage.setItem(spaceKey(owner),JSON.stringify(next));return next;}
export function topMates(friends,ids=null){return Array.isArray(ids)?ids.map(id=>friends.find(p=>p.id===id)).filter(Boolean):friends.slice(0,16);}
export function toggleMate(ids,id,allowed){if(!allowed.includes(id))throw Error('Choose someone from your connected people.');if(ids.includes(id))return ids.filter(x=>x!==id);if(ids.length>=16)throw Error('Your Top Mates has room for 16. Remove one before adding another.');return [...ids,id];}
export function skinStyle(s){if(!s)return '';const color=x=>/^#[\da-f]{6}$/i.test(x)?x:'#173e38';return `--room-bg:${color(s.bg)};--room-panel:${color(s.panel)};--room-ink:${color(s.ink)};--room-muted:${color(s.muted)};--room-accent:${color(s.accent)};--room-type:${s.font==='serif'?'var(--serif)':'var(--sans)'}`;}

// The proven live analyser shares the revised app's sole audio element.
// Disposing this view removes drawing work, never the speaker route or playback.
export function mountVisuals(host,audio){
 const win=host.ownerDocument.defaultView,doc=host.ownerDocument,engine=win.DimauMusicVisuals;
 const canvas=host.querySelector('canvas'),status=host.querySelector('[data-visual-status]'),button=host.querySelector('[data-visual-pause]');
 if(!engine||!win.CanvasRenderingContext2D){status.textContent='Music playback remains available.';return ()=>{};}
 let ctx;try{ctx=canvas.getContext('2d');}catch{}if(!ctx)return ()=>{};
 const motion=win.matchMedia?.('(prefers-reduced-motion: reduce)'),settings={mode:'spectrum',theme:'ocean',gain:1},drawState={preview:true,previewTime:0};
 let paused=!!motion?.matches,frame=0,disposed=false,inView=true,failed=false,run=0,controller;
 const listeners=[],on=(el,type,fn)=>{el.addEventListener(type,fn);listeners.push(()=>el.removeEventListener(type,fn));};
 function draw(time=0){frame=0;if(disposed||doc.hidden||!inView)return;const box=canvas.getBoundingClientRect(),ratio=Math.min(win.devicePixelRatio||1,2),width=Math.max(1,box.width),height=Math.max(1,box.height);if(canvas.width!==Math.round(width*ratio)||canvas.height!==Math.round(height*ratio)){canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);}ctx.setTransform(ratio,0,0,ratio,0,0);const data=!audio.paused&&!audio.ended&&audio.readyState>=3?engine.sample(audio):null;drawState.previewTime=paused?0:time;engine.draw(ctx,width,height,settings,drawState,data);const label=paused?'Visual motion paused':data?'Live audio · moving to your music':failed?'Ambient preview · audio analysis unavailable':audio.paused?'Ambient preview · press play':'Ambient preview · connecting to your audio';if(status.textContent!==label)status.textContent=label;host.dataset.visualState=data?'live':'preview';button.disabled=!!motion?.matches;button.textContent=paused?'Resume visuals':'Pause visuals';button.setAttribute('aria-pressed',String(paused));if(!paused)frame=win.requestAnimationFrame(draw);}
 function wake(){if(frame)win.cancelAnimationFrame(frame);frame=0;draw();}
 async function analyse(){if(audio.paused||disposed)return;controller?.abort();controller=new win.AbortController();const current=++run;try{await engine.prepare(audio,{signal:controller.signal});if(!disposed&&current===run){failed=false;wake();}}catch{if(!disposed&&current===run){failed=true;wake();}}}
 on(audio,'play',analyse);for(const type of ['playing','pause','ended','waiting','error'])on(audio,type,wake);
 on(host.querySelector('[data-visual-mode]'),'change',e=>{settings.mode=e.target.value;wake();});
 on(button,'click',()=>{paused=!paused;wake();if(!paused)analyse();});
 on(doc,'visibilitychange',wake);if(motion?.addEventListener)on(motion,'change',()=>{paused=motion.matches;wake();});
 const resize=win.ResizeObserver?new win.ResizeObserver(wake):null;resize?.observe(canvas);
 const observer=win.IntersectionObserver?new win.IntersectionObserver(entries=>{inView=entries[0]?.isIntersecting!==false;wake();}):null;observer?.observe(host);
 draw();if(!audio.paused)analyse();
 return ()=>{disposed=true;run++;controller?.abort();if(frame)win.cancelAnimationFrame(frame);resize?.disconnect();observer?.disconnect();listeners.forEach(fn=>fn());};
}
