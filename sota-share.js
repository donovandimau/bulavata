/* Sota Kece sharing: any element with [data-sota-share] shares the app (or data-share-url / -title / -text).
   Phones get their own share sheet; everywhere else gets a small panel with the usual apps and Copy link. */
(function(root){
'use strict';
const SITE='https://sotakece.com/';
const DEFAULT={title:'Sota Kece — Your room. Your soundtrack.',text:'Come hang out with me on Sota Kece 🌺 Make your space your own, share music and catch up over Talanoa.',url:SITE};
const ICON='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>';
let sheet=null;
function clean(url){
try{const u=new URL(url||SITE,SITE);if(!/^https?:$/.test(u.protocol))return SITE;
if(/(?:^|\.)vercel\.app$|^localhost$|^127\./.test(u.hostname)){u.protocol='https:';u.host='sotakece.com';}
return u.href;}catch(_){return SITE;}
}
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;}
function styles(){
if(document.getElementById('sota-share-styles'))return;
const s=el('style');s.id='sota-share-styles';
s.textContent=`
.sota-share-sheet{border:0;padding:0;background:transparent;max-width:min(420px,calc(100vw - 24px));width:100%;margin:auto auto 16px}
.sota-share-sheet::backdrop{background:rgba(20,59,82,.42);backdrop-filter:blur(4px)}
.sota-share-box{background:rgba(255,255,255,.96);border:1px solid rgba(135,206,235,.9);border-radius:22px;padding:18px;box-shadow:0 18px 50px rgba(20,59,82,.28);font-family:Lexend,system-ui,sans-serif;color:#143b52}
.sota-share-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}
.sota-share-head h2{font:800 18px/1.2 Manrope,system-ui,sans-serif;margin:0}
.sota-share-close{width:38px;height:38px;border-radius:50%;border:1px solid rgba(135,206,235,.95);background:#fff;font-size:20px;line-height:1;cursor:pointer;color:#143b52}
.sota-share-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px}
.sota-share-grid a,.sota-share-grid button{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 6px;border-radius:16px;background:#f2fafd;border:1px solid #cbe7f3;color:#143b52;font:600 12.5px/1.2 Lexend,system-ui,sans-serif;text-decoration:none;cursor:pointer}
.sota-share-grid i{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;color:#fff;font:800 15px/1 Manrope,system-ui,sans-serif;font-style:normal}
.sota-share-link{display:flex;gap:8px}
.sota-share-link input{flex:1;min-width:0;min-height:44px;border-radius:12px;border:1px solid #cbe7f3;padding:0 12px;font:400 13px Lexend,system-ui,sans-serif;background:#fff;color:#143b52}
.sota-share-link button{min-height:44px;padding:0 16px;border:0;border-radius:999px;background:#4fa8d8;color:#fff;font:600 13.5px Lexend,system-ui,sans-serif;cursor:pointer;white-space:nowrap}
.sota-share-sheet :focus-visible{outline:3px solid #ff62ae;outline-offset:2px}
[data-sota-share].sk-share-chip{display:inline-flex;align-items:center;gap:6px;border:0;cursor:pointer;font:inherit}
`;
document.head.append(s);
}
function copy(text,input,btn){
const done=()=>{btn.textContent='Copied ✓';setTimeout(()=>{btn.textContent='Copy link';},1800);};
if(navigator.clipboard?.writeText)navigator.clipboard.writeText(text).then(done,()=>{input.select();try{document.execCommand('copy');done();}catch(_){}});
else{input.select();try{document.execCommand('copy');done();}catch(_){}}
}
function openSheet(data){
styles();
if(sheet)sheet.remove();
sheet=el('dialog','sota-share-sheet');sheet.setAttribute('aria-labelledby','sota-share-title');
const box=el('div','sota-share-box'),head=el('div','sota-share-head'),h=el('h2','','Share Sota Kece');h.id='sota-share-title';
const close=el('button','sota-share-close','×');close.type='button';close.setAttribute('aria-label','Close sharing');close.addEventListener('click',()=>sheet.close());
head.append(h,close);
const u=encodeURIComponent(data.url),t=encodeURIComponent(data.text),both=encodeURIComponent(data.text+' '+data.url);
const apps=[
['WhatsApp','#25D366','W','https://wa.me/?text='+both],
['Facebook','#1877F2','f','https://www.facebook.com/sharer/sharer.php?u='+u],
['Messenger','#0084FF','m','fb-messenger://share/?link='+u],
['X','#000000','X','https://twitter.com/intent/tweet?text='+t+'&url='+u],
['Telegram','#229ED9','T','https://t.me/share/url?url='+u+'&text='+t],
['Email','#5FB3D9','@','mailto:?subject='+encodeURIComponent(data.title)+'&body='+both]
];
const grid=el('div','sota-share-grid');
for(const [name,colour,mark,href] of apps){
if(name==='Messenger'&&!/Android|iPhone|iPad/i.test(navigator.userAgent))continue;
const a=el('a');a.href=href;a.target=href.startsWith('http')?'_blank':'_self';a.rel='noopener noreferrer';
const i=el('i','',mark);i.style.background=colour;a.append(i,el('span','',name));a.addEventListener('click',()=>setTimeout(()=>sheet?.close(),300));grid.append(a);
}
const row=el('div','sota-share-link'),input=el('input');input.readOnly=true;input.value=data.url;input.setAttribute('aria-label','Link to share');
const btn=el('button','','Copy link');btn.type='button';btn.addEventListener('click',()=>copy(data.url,input,btn));
row.append(input,btn);
box.append(head,grid,row);sheet.append(box);document.body.append(sheet);
sheet.addEventListener('close',()=>{sheet?.remove();sheet=null;});
sheet.addEventListener('click',e=>{if(e.target===sheet)sheet.close();});
sheet.showModal();btn.focus();
}
async function share(input={}){
const data={title:input.title||DEFAULT.title,text:input.text||DEFAULT.text,url:clean(input.url||DEFAULT.url)};
const phone=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.maxTouchPoints>1&&/Macintosh/.test(navigator.userAgent));
if(phone&&navigator.share){
try{await navigator.share(data);return 'shared';}catch(error){if(error&&error.name==='AbortError')return 'cancelled';}
}
openSheet(data);return 'sheet';
}
document.addEventListener('click',event=>{
const trigger=event.target.closest?.('[data-sota-share]');if(!trigger)return;
event.preventDefault();
share({url:trigger.dataset.shareUrl,title:trigger.dataset.shareTitle,text:trigger.dataset.shareText});
});
root.SotaShare={share,icon:ICON};
})(window);
