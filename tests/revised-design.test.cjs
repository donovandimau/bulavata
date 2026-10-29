'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{pathToFileURL}=require('node:url');
let JSDOM;try{({JSDOM}=require(process.env.JSDOM_MODULE||'jsdom'));}catch{}
const root=path.join(__dirname,'..','revised'),opts={skip:!JSDOM};
async function fixture(route='home',{native=true}={}){
 const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://preview.example/revised/#'+route,runScripts:'outside-only'}),w=dom.window;
 for(const name of ['core.mjs','audio.mjs','social.mjs','media.mjs','artwork.mjs','combined.mjs'])Object.assign(w,await import(pathToFileURL(path.join(root,name)).href));
 const backend=await import(pathToFileURL(path.join(root,'backend.mjs')).href);w.Service=backend.Service;w.memberProfile=backend.profile;w.client=()=>{throw Error('Unexpected live auth');};
 w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=function(){};w.URL.createObjectURL=()=> 'blob:sample';w.URL.revokeObjectURL=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 w.HTMLMediaElement.prototype.play=function(){Object.defineProperty(this,'paused',{value:false,configurable:true});this.dispatchEvent(new w.Event('play'));return Promise.resolve();};w.HTMLMediaElement.prototype.pause=function(){Object.defineProperty(this,'paused',{value:true,configurable:true});this.dispatchEvent(new w.Event('pause'));};
 if(native)w.eval(fs.readFileSync(path.join(root,'live','space-design.js'),'utf8'));
 const {createDesigner}=await import(pathToFileURL(path.join(root,'design.mjs')).href);w.SotaRevisedDesign=createDesigner(w);
 const source=fs.readFileSync(path.join(root,'app.mjs'),'utf8').replace(/^import .*;\r?\n/gm,'');vm.runInContext(source+'\nglobalThis.harness={state,render,clearMember,action,player,dialog};',dom.getInternalVMContext());
 const settle=async()=>{for(let i=0;i<6;i++)await new Promise(setImmediate);},q=selector=>w.document.querySelector(selector);
 const change=(name,value)=>{const el=q('#ssd-editor [data-ssd-'+name+']');assert.ok(el,name);el.value=value;el.dispatchEvent(new w.Event(name==='page'?'change':'input',{bubbles:true}));};
 return {dom,w,h:w.harness,q,change,settle,async open(){q('.design-page-control').click();await settle();assert.equal(q('#ssd-editor').open,true);},async save(){q('#ssd-editor .ssd-save').click();await settle();},close(){w.SotaRevisedDesign.clear();dom.window.close();}};
}

test('Revised routes use the same exact native designer and preserve logical page names',async()=>{
 const {designPage}=await import(pathToFileURL(path.join(root,'design.mjs')).href);
 for(const [route,page]of Object.entries({welcome:'home',home:'home',space:'profile',studio:'skins',people:'people',discover:'people',settings:'settings',talanoa:'talanoa',music:'music',world:'world'}))assert.equal(designPage(route),page);
 for(const file of ['space-design.js','space-design.css'])assert.equal(fs.readFileSync(path.join(root,'live',file),'utf8'),fs.readFileSync(path.join(root,'..',file),'utf8'),file+' must be the canonical shared designer');
 const index=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.match(index,/live\/space-design\.js/);assert.match(index,/design\.css/);
});

test('actual Revised render opens the page designer, saves and cancels without replacing audio or content',opts,async()=>{
 const f=await fixture('people');try{const audio=f.q('#audio'),people=f.q('.people-grid');await f.open();assert.equal(f.q('[data-ssd-page]').value,'people');assert.match(f.q('.ssd-local').textContent,/Saved on this device/);f.change('font','editorial');f.change('textSize','large');f.change('buttonStyle','outline');assert.equal(f.q('#app').dataset.spaceFont,'editorial');assert.equal(f.q('#app').dataset.spaceTextSize,'large');assert.equal(f.q('.people-grid'),people);assert.equal(f.q('#audio'),audio);await f.save();assert.equal(f.q('#ssd-editor').open,false);
 const key=f.w.SotaSpaceDesign.storageKey('sota-revised-sample'),record=JSON.parse(f.w.localStorage.getItem(key));assert.equal(record.pages.people.font,'editorial');assert.equal(record.pages.people.buttonStyle,'outline');assert.equal(f.w.localStorage.getItem(f.w.SotaSpaceDesign.storageKey(null)),null);
 f.h.render();await f.open();assert.equal(f.q('[data-ssd-font]').value,'editorial');f.change('font','system');f.change('buttonStyle','soft');f.q('.ssd-cancel').click();await f.settle();assert.equal(f.q('#app').dataset.spaceFont,'editorial');assert.equal(f.q('#app').dataset.spaceButtonStyle,'outline');assert.equal(f.q('#audio'),audio);
 }finally{f.close();}
});

test('all-pages fallback and independent Settings work across real Revised routes and ongoing playback',opts,async()=>{
 const f=await fixture();try{await f.h.action('play','lagoon');const audio=f.q('#audio');await f.open();f.change('page','all');f.change('font','system');f.change('buttonStyle','soft');await f.save();for(const page of ['welcome','home','music','talanoa','discover','settings','world','space','studio']){f.h.state.page=page;f.h.state.arg='';f.h.render();assert.equal(f.q('#app').dataset.spaceFont,'system',page);assert.ok(f.q('.design-page-control'),page);assert.equal(f.q('#audio'),audio);assert.equal(audio.paused,false);}
 f.h.state.page='settings';f.h.render();await f.open();assert.equal(f.q('[data-ssd-page]').value,'settings');f.change('font','editorial');await f.save();f.h.state.page='music';f.h.render();assert.equal(f.q('#app').dataset.spaceFont,'system');f.h.state.page='settings';f.h.render();assert.equal(f.q('#app').dataset.spaceFont,'editorial');
 }finally{f.close();}
});

test('page styling leaves all94 Studio designs, selected artwork and authored room tokens intact',opts,async()=>{
 const f=await fixture('studio');try{await f.h.action('studio-pick','midnight');const grid=f.q('.studio-grid'),preview=f.q('.studio-preview'),style=preview.getAttribute('style'),cover=f.q('.studio-cover').getAttribute('src');await f.open();f.change('font','system');f.change('textSize','larger');f.change('buttonStyle','soft');assert.equal(f.q('.studio-grid'),grid);assert.equal(f.q('.studio-preview'),preview);assert.equal(preview.getAttribute('style'),style);assert.equal(f.q('.studio-cover').getAttribute('src'),cover);assert.equal(f.w.document.querySelectorAll('.skin-card').length,94);await f.save();await f.h.action('studio-apply');await f.settle();f.h.state.page='space';f.h.render();assert.equal(f.w.readSpace(f.w.localStorage,'sample').skin,'midnight');const roomStyle=f.q('.profile-hero.room-themed').getAttribute('style');await f.open();f.change('background','#ffeedd');await f.save();assert.equal(f.q('.profile-hero.room-themed').getAttribute('style'),roomStyle);assert.equal(f.q('.room-cover').getAttribute('src'),f.w.skinById('midnight').coverArt);
 }finally{f.close();}
});

test('member account changes discard unsaved design drafts and keep sample/member records separate',opts,async()=>{
 const f=await fixture('people');try{await f.open();f.change('font','editorial');await f.save();const sampleKey=f.w.SotaSpaceDesign.storageKey('sota-revised-sample'),sample=f.w.localStorage.getItem(sampleKey);
 const member=id=>{f.h.state.service=new f.w.Service({});f.h.state.service.owner({id});f.h.state.mode='member';f.h.state.member={me:{id,name:id,handle:id,theme:'lagoon'},people:[],pending:[],posts:[],circles:[],messages:{}};f.h.render();};
 member('member-A');assert.equal(f.q('#app').hasAttribute('data-space-designed'),false);await f.open();f.change('font','system');await f.save();const aKey=f.w.SotaSpaceDesign.storageKey('member-A'),savedA=f.w.localStorage.getItem(aKey);await f.open();f.change('font','rounded');member('member-B');assert.equal(f.q('#ssd-editor').open,false);assert.equal(f.q('#app').hasAttribute('data-space-designed'),false);assert.equal(f.w.localStorage.getItem(f.w.SotaSpaceDesign.storageKey('member-B')),null);assert.equal(f.w.localStorage.getItem(aKey),savedA);assert.equal(f.w.localStorage.getItem(sampleKey),sample);
 f.h.clearMember();assert.equal(f.q('#app').hasAttribute('data-space-font'),false);f.h.render();assert.equal(f.q('#app').dataset.spaceFont,'editorial');assert.equal(f.q('#app').dataset.designScope,'sample');
 }finally{f.close();}
});

test('dialog design controls survive repeated composer renders and keep unsent content intact',opts,async()=>{
 const f=await fixture();try{await f.h.action('compose');const text=f.q('#post-text');text.value='Keep this unsent moment';text.dispatchEvent(new f.w.Event('input',{bubbles:true}));f.q('#dialog .ssd-dialog-design').click();await f.settle();assert.equal(f.h.dialog.open,true);assert.equal(f.q('#post-text'),text);f.change('font','editorial');f.q('#ssd-editor .ssd-cancel').click();await f.settle();assert.equal(text.value,'Keep this unsent moment');await f.h.action('close-dialog');await f.h.action('compose');assert.equal(f.w.document.querySelectorAll('#dialog .ssd-dialog-design').length,1);assert.equal(f.q('#post-text').value,'Keep this unsent moment');
 }finally{f.close();}
});

test('missing optional designer leaves the existing Revised app, auth and navigation functional',opts,async()=>{
 const f=await fixture('welcome',{native:false});try{assert.ok(f.q('.landing-hero'));await f.h.action('design-page');assert.equal(f.q('#ssd-editor'),null);f.h.state.page='home';f.h.render();assert.ok(f.q('.composer'));await f.h.action('compose');assert.ok(f.q('#post-text'));assert.equal(f.q('#dialog .ssd-dialog-design'),null);
 }finally{f.close();}
});
