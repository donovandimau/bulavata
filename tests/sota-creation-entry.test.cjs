'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
let JSDOM;try{({JSDOM}=require(process.env.JSDOM_MODULE||'jsdom'));}catch(_){}
const browserTest=(name,fn)=>test(name,{skip:!JSDOM?'Set JSDOM_MODULE to run design entry integration':false},fn);
const code=fs.readFileSync(path.join(__dirname,'..','sota-experience.js'),'utf8');
function harness(t){
 const dom=new JSDOM('<!doctype html><div id="app"><header class="bv-connect-header"><div class="bv-entry-account-actions"><button id="sk-sign-up">Sign up</button><button id="sk-sign-in">Sign in</button></div></header><section id="sota-music-home"><input id="song-filter" value="keep this song"></section><section id="bv-circle"></section><section id="bv-your-room"></section><section id="sota-connections"></section><dialog id="bv-entry"></dialog></div>',{url:'https://sotakece.com/',runScripts:'outside-only'});
 const w=dom.window,app=w.document.querySelector('#app'),calls={design:[],studio:0,music:0,go:[],auth:0};w.scrollTo=()=>{};
 w.SotaSpaceDesign={open:page=>calls.design.push(page)};w.BulaSkinStudio={open:()=>calls.studio++};w.SotaMusicHome={choose:()=>calls.music++};
 app.querySelector('#sk-sign-up').onclick=()=>calls.auth++;w.eval(code);w.SotaExperience.init({go:page=>calls.go.push(page)});t.after(()=>w.close());
 return {w,app,calls,api:w.SotaExperience,get:selector=>app.querySelector(selector),guest:()=>w.SotaExperience.mountGuest(app,{roomMarkup:'<p>Example room</p>'})};
}
browserTest('every guest destination opens its own page design without changing account or music owners',t=>{
 const h=harness(t),music=h.get('#sota-music-home'),signup=h.get('#sk-sign-up');h.guest();
 for(const page of ['home','people','talanoa','music','profile','skins','world']){
  h.w.history.replaceState(null,'','#'+page);h.w.dispatchEvent(new h.w.HashChangeEvent('hashchange'));
  const button=h.get('.sx-design-entry');assert.equal(button.getAttribute('aria-haspopup'),'dialog');button.querySelector('span').click();assert.equal(h.calls.design.at(-1),page);
 }
 assert.equal(h.calls.design.length,7);assert.equal(h.get('#sota-music-home'),music);assert.equal(h.get('#song-filter').value,'keep this song');assert.equal(h.get('#sk-sign-up'),signup);assert.equal(h.calls.auth,0);assert.equal(h.calls.music,1);
});
browserTest('the creative corner dispatches the existing designer, studio and music route',t=>{
 const h=harness(t);h.guest();h.get('[data-sx-route="profile"]').click();const tools=h.get('.sx-create-tools');
 assert.equal(tools.querySelectorAll('.sx-create-tool').length,3);tools.querySelector('[data-sx-design]').click();tools.querySelector('[data-sx-customise]').click();tools.querySelector('a[href="#music"]').click();
 assert.deepEqual(h.calls.design,['profile']);assert.equal(h.calls.studio,1);assert.equal(h.app.dataset.sxPage,'music');assert.equal(h.calls.music,1);assert.equal(h.calls.auth,0);
});
browserTest('member design entries target their underlying view, including My space',t=>{
 const h=harness(t);
 for(const page of ['pulse','friends','crews','music','room','moments','circles','connections','wallet']){
  h.app.innerHTML='<header class="top"><button class="luvchip" id="wallet">Wallet</button></header><main id="view"><input value="keep draft"></main><nav class="bottom"></nav>';
  h.app.dataset.frontPage='home';h.api.mountMember(h.app,{user:{id:'member'},tab:page});h.get('.sx-design-entry').click();
  const expected=page==='room'?'profile':page;assert.equal(h.calls.design.at(-1),expected);assert.equal(h.app.dataset.frontPage,expected);assert.equal(h.get('#view input').value,'keep draft');
  assert.equal(h.app.querySelectorAll('.sx-create-tools').length,page==='room'?1:0);
 }
});
browserTest('member creative tools use the native room studio and existing music navigation',t=>{
 const h=harness(t);h.app.innerHTML='<header class="top"></header><main id="view"></main>';h.api.mountMember(h.app,{user:{id:'member'},tab:'room'});
 h.get('.sx-create-tools [data-sx-customise]').click();h.get('.sx-create-tools [data-sx-member="music"]').click();assert.equal(h.calls.studio,1);assert.deepEqual(h.calls.go,['music']);
});
browserTest('stopping the shell removes design and creative-tool click handlers',t=>{
 const h=harness(t);h.guest();h.api.stop();h.get('.sx-design-entry').click();h.get('.sx-create-tools [data-sx-customise]').click();assert.deepEqual(h.calls.design,[]);assert.equal(h.calls.studio,0);
});
