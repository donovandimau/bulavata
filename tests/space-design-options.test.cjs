'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const model=require('../space-design.js'),source=fs.readFileSync(path.join(__dirname,'../space-design.js'),'utf8');
let JSDOM;try{({JSDOM}=require('jsdom'));}catch{}
const domTest=(name,fn)=>test(name,{skip:!JSDOM&&'Optional jsdom is not installed'},fn);
const flush=async()=>{for(let i=0;i<6;i++)await new Promise(setImmediate);};
function fixture(){
 const dom=new JSDOM('<!doctype html><body><main id="app" data-front-page="people"><audio id="sound"></audio><section class="card">Keep my content</section></main></body>',{url:'https://sotakece.com/#people',runScripts:'outside-only'}),w=dom.window,d=w.document,app=d.getElementById('app'),records=new Map(),images=new Map();let owner='A';
 Object.defineProperty(w,'localStorage',{value:{getItem:key=>records.get(key)||null,setItem:(key,value)=>records.set(key,value)},configurable:true});
 w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');queueMicrotask(()=>this.dispatchEvent(new w.Event('close')));};
 w.URL.createObjectURL=()=> 'blob:test-wallpaper';w.URL.revokeObjectURL=()=>{};w.createImageBitmap=async()=>({width:800,height:600,close(){}});
 const db={objectStoreNames:{contains:()=>true},transaction(){const tx={};tx.objectStore=()=>{const operation=(kind,value,key)=>{const request={};queueMicrotask(()=>{if(kind==='put')images.set(key,value);if(kind==='delete')images.delete(key);request.result=kind==='get'?images.get(key):undefined;request.onsuccess?.();queueMicrotask(()=>tx.oncomplete?.());});return request;};return {get:key=>operation('get',null,key),put:(value,key)=>operation('put',value,key),delete:key=>operation('delete',null,key)};};return tx;}};
 w.indexedDB={open(){const request={};queueMicrotask(()=>{request.result=db;request.onsuccess?.();});return request;}};
 w.eval(source);const api=w.SotaSpaceDesign;api.init({getOwner:()=>owner});api.mount(app);
 const q=selector=>d.querySelector(selector),change=(name,value)=>{const el=q('[data-ssd-'+name+']');assert.ok(el,'Missing '+name+' control');el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}));};
 return {w,d,app,api,q,change,records,images,owner:value=>owner=value,async upload(){const file=new Blob([new Uint8Array([137,80,78,71,13,10,26,10,1,2])],{type:'image/png'}),input=q('[data-ssd-image]');Object.defineProperty(input,'files',{value:[file],configurable:true});input.dispatchEvent(new w.Event('change'));await flush();},close(){api.stop();dom.window.close();}};
}

test('old v1 designs retain their selections and receive safe new-option defaults',()=>{
 const old={version:1,pages:{connect:{palette:'night',density:'compact',frame:'wide',corners:'square',imageId:'img-existing'},music:{palette:'garden'}}},next=model.normalizeRecord(old);
 assert.equal(next.version,1);assert.equal(next.pages.connect.palette,'night');assert.equal(next.pages.connect.imageId,'img-existing');assert.equal(next.pages.connect.density,'compact');assert.equal(next.pages.connect.frame,'wide');assert.equal(next.pages.connect.font,'rounded');assert.equal(next.pages.connect.textSize,'standard');assert.equal(next.pages.connect.buttonStyle,'solid');assert.equal(next.pages.connect.wallpaperFit,'cover');assert.equal(next.pages.connect.wallpaperPosition,'center');
 assert.equal(model.effective(next,'people'),next.pages.connect);next.pages.people=model.normalize({palette:'sunset'});assert.equal(model.effective(next,'people'),next.pages.people);assert.equal(model.currentPage({dataset:{frontPage:'people'}}),'people');
});

test('typography, button and image settings reject CSS injection and inherited option names',()=>{
 const bad=model.normalize({font:'constructor',textSize:'toString',buttonStyle:'outline;display:none',wallpaperFit:'url(https://evil.test)',wallpaperPosition:'top;position:fixed'});
 assert.equal(bad.font,'rounded');assert.equal(bad.textSize,'standard');assert.equal(bad.buttonStyle,'solid');assert.equal(bad.wallpaperFit,'cover');assert.equal(bad.wallpaperPosition,'center');
 for(const font of ['rounded','system','editorial'])for(const textSize of ['standard','large','larger'])for(const buttonStyle of ['solid','outline','soft']){const value=model.normalize({font,textSize,buttonStyle,wallpaperFit:'tile',wallpaperPosition:'bottom'});assert.equal(value.font,font);assert.equal(value.textSize,textSize);assert.equal(value.buttonStyle,buttonStyle);assert.equal(value.wallpaperFit,'tile');assert.equal(value.wallpaperPosition,'bottom');}
});

test('custom button and page colours choose the more legible actual foreground',()=>{
 const lum=hex=>hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0),ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
 for(let r=0;r<=255;r+=17)for(let g=0;g<=255;g+=17)for(let b=0;b<=255;b+=17){const bg='#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join(''),chosen=model.contrast(bg);assert.ok(ratio(bg,chosen)>=4.5,bg+' must reach AA text contrast');if(chosen==='#000000')assert.ok(Math.max(ratio(bg,'#142438'),ratio(bg,'#ffffff'))<4.5);else assert.ok(ratio(bg,chosen)>=ratio(bg,chosen==='#ffffff'?'#142438':'#ffffff'));}
 assert.equal(model.contrast('#ffffff'),'#142438');assert.equal(model.contrast('#000000'),'#ffffff');assert.equal(model.contrast('#7d7d7d'),'#000000');
});

domTest('new controls preview, save and reload on People without replacing content or audio',async()=>{
 const f=fixture();try{const sound=f.q('#sound'),content=f.q('.card');f.api.open('people');for(const [field,value]of Object.entries({font:'editorial',textSize:'larger',buttonStyle:'outline',wallpaperFit:'contain',wallpaperPosition:'top'}))f.change(field,value);
 assert.equal(f.app.dataset.spaceFont,'editorial');assert.equal(f.app.dataset.spaceTextSize,'larger');assert.equal(f.app.dataset.spaceButtonStyle,'outline');assert.equal(f.d.documentElement.dataset.spaceDialogFont,'editorial');assert.equal(f.app.style.getPropertyValue('--ssd-text-scale'),'1.24');assert.match(f.app.style.getPropertyValue('--ssd-font'),/Georgia/);assert.equal(f.app.style.getPropertyValue('--ssd-wallpaper-size'),'contain');assert.equal(f.app.style.getPropertyValue('--ssd-wallpaper-position'),'center top');assert.equal(f.q('[data-ssd-preview] b').style.background,'transparent');
 f.q('.ssd-save').click();await flush();const saved=JSON.parse(f.records.get(model.storageKey('A')));assert.equal(saved.pages.people.font,'editorial');assert.equal(saved.pages.people.textSize,'larger');assert.equal(saved.pages.people.buttonStyle,'outline');f.api.mount(f.app);assert.equal(f.app.dataset.spaceFont,'editorial');assert.equal(f.q('#sound'),sound);assert.equal(f.q('.card'),content);
 f.api.open('people');assert.equal(f.q('[data-ssd-font]').value,'editorial');assert.equal(f.q('[data-ssd-textSize]').value,'larger');f.change('font','system');f.change('buttonStyle','soft');f.q('.ssd-cancel').click();await flush();assert.equal(f.app.dataset.spaceFont,'editorial');assert.equal(f.app.dataset.spaceButtonStyle,'outline');
 }finally{f.close();}
});

domTest('wallpaper placement previews locally and survives save; another account receives no design',async()=>{
 const f=fixture();try{f.api.open('people');await f.upload();f.change('wallpaperFit','tile');f.change('wallpaperPosition','bottom');const preview=f.q('[data-ssd-wallpaper-preview]');await flush();assert.equal(preview.hidden,false);assert.match(preview.style.backgroundImage,/blob:test-wallpaper/);assert.equal(preview.style.backgroundRepeat,'repeat');assert.equal(preview.style.backgroundPosition,'center bottom');assert.equal(f.app.style.getPropertyValue('--ssd-wallpaper-repeat'),'repeat');f.q('.ssd-save').click();await flush();assert.equal(f.images.size,1);const saved=f.records.get(model.storageKey('A'));assert.match(saved,/"wallpaperFit":"tile"/);assert.match(f.app.style.getPropertyValue('--ssd-wallpaper'),/blob:test-wallpaper/);
 f.owner('B');f.api.mount(f.app);for(const name of ['font','text-scale','wallpaper','wallpaper-size','wallpaper-position','wallpaper-repeat'])assert.equal(f.app.style.getPropertyValue('--ssd-'+name),'');assert.equal(f.app.hasAttribute('data-space-button-style'),false);assert.equal(f.d.documentElement.hasAttribute('data-space-dialog-font'),false);assert.equal(f.records.has(model.storageKey('B')),false);assert.equal(f.records.get(model.storageKey('A')),saved);
 }finally{f.close();}
});

domTest('cancel, reset and stop clear every new appearance token',async()=>{
 const f=fixture();try{f.api.open('people');f.change('font','system');f.change('textSize','large');f.change('buttonStyle','soft');f.change('wallpaperFit','tile');f.q('.ssd-cancel').click();await flush();assert.equal(f.app.hasAttribute('data-space-font'),false);assert.equal(f.app.style.getPropertyValue('--ssd-wallpaper-repeat'),'');f.api.open('people');f.change('font','editorial');f.q('.ssd-save').click();await flush();f.api.open('people');f.q('.ssd-reset').click();f.q('.ssd-save').click();await flush();assert.equal(f.app.hasAttribute('data-space-text-size'),false);f.api.stop();for(const target of [f.app,f.d.documentElement])for(const name of ['font','text-scale','wallpaper','wallpaper-size','wallpaper-position','wallpaper-repeat'])assert.equal(target.style.getPropertyValue('--ssd-'+name),'');
 }finally{f.close();}
});
