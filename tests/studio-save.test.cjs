const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../skin-studio.js'), 'utf8');
const saveSource = source.slice(source.indexOf('  let saving=false;'), source.indexOf("  window.addEventListener('sota-music-change'"));
const closeSource = source.match(/function close\(\) \{[^\n]+\}/)[0];

function setup({user={id:'owner'},me={id:'owner'},deferClose=false,storageError=false,settings={accent:'#086779',trackPath:'owner/original.mp3',coverPath:''}}={}) {
  let resolve, reject;
  const pending = new Promise((yes, no) => { resolve = yes; reject = no; });
  const values = {'#bv-trackUrl':'', '#d-name':'Sina', '#d-pro':'', '#d-bio':'Bula', '#d-emo':'🌺', '#d-css':''};
  const controls = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, {value, disabled:false}]));
  controls['#bv-save'] = {textContent:'Save my room', disabled:false};
  controls['#bv-cover-upload'] = {disabled:true};
  controls['#bv-studio-error'] = {textContent:''};
  const calls = {closed:0, rendered:0, kept:[], updated:0, stored:[], guestRooms:[], welcome:[], auth:0};
  const listeners=[];
  const origin={};
  const dialog = {
    querySelector: selector => controls[selector],
    querySelectorAll: () => Object.entries(controls).filter(([key]) => key !== '#bv-studio-error').map(([, value]) => value),
    setAttribute() {}, removeAttribute() {},
    addEventListener(type,listener,options){listeners.push({target:this,type,listener,once:!!options?.once});},
    close() { calls.closed++;if(!deferClose)fireClose(); }
  };
  const query = {update(patch) { calls.patch=patch; calls.updated++; return query; }, eq(key, id) { calls.owner=id; return query; }, select() {return query;}, single() {return pending;}};
  const context = vm.createContext({
    studio:dialog, draft:settings, mediaBusy:false,
    S:{user,me},app:{firstElementChild:origin},homeSkinChosen:false,guestPreviewToken:0,guestPreviewToken:0,
    skins:{safeUrl:()=>true, encode:()=> 'encoded'},
    sb:{from:()=>query}, discardUploads: kept => calls.kept.push(kept),
    toast() {}, render:async()=>{calls.rendered++;},renderAuth(){calls.auth++;context.guestPreviewToken++;context.app.firstElementChild={};},
    localStorage:{setItem(key,value){if(storageError)throw new Error('Storage unavailable');calls.stored.push({key,value});}},
    showGuestRoom(settings){calls.guestRooms.push({settings:JSON.parse(JSON.stringify(settings)),studio:context.studio});},
    showWelcome(settings){calls.welcome.push(settings);},
    window:{addEventListener(){}, SotaPlayback:{register(){}}},
    openDecorate:null, setTimeout, document:{querySelector:()=>null}
  });
  function fireClose(target=dialog){
    // The dialog's existing cleanup listener is registered by open() before the
    // save callback. Model that cleanup first, then dispatch the queued once listener.
    if(context.studio===target){context.studio=null;context.draft=null;}
    for(const entry of [...listeners])if(entry.target===target&&entry.type==='close'){
      if(entry.once)listeners.splice(listeners.indexOf(entry),1);
      entry.listener();
    }
  }
  vm.runInContext(closeSource + '\n' + saveSource, context);
  return {context, dialog, controls, calls, resolve, reject,fireClose,origin,listeners,
    success:()=>resolve({data:{id:'owner', room_css:'encoded', display_name:'Sina'}, error:null})};
}

test('studio prevents duplicate saves and close while an update is pending', async () => {
  const h=setup();
  const first=h.context.save();
  await h.context.save();
  h.context.close();
  assert.equal(h.calls.updated,1);
  assert.equal(h.calls.closed,0);
  assert.equal(h.controls['#d-name'].disabled,true);
  h.success(); await first;
  assert.equal(h.calls.closed,1);
  assert.equal(h.calls.rendered,1);
  assert.equal(h.calls.owner,'owner');
  assert.equal(h.controls['#bv-cover-upload'].disabled,true);
});

test('a late studio save never closes or changes a replacement dialog', async () => {
  const h=setup(); const saving=h.context.save();
  const next={close(){throw Error('Replacement dialog was closed');}};
  h.context.studio=next; h.context.draft={trackPath:'new-draft.mp3'};
  h.success(); await saving;
  assert.equal(h.context.studio,next);
  assert.equal(h.context.S.me.room_css,undefined);
  assert.equal(h.calls.rendered,0);
  assert.equal(h.calls.kept.length,0);
});

test('a save response cannot mutate a different signed-in owner', async () => {
  const h=setup(); const saving=h.context.save();
  h.context.S.user={id:'other'}; h.context.S.me={id:'other'};
  h.success(); await saving;
  assert.equal(h.context.S.me.room_css,undefined);
  assert.equal(h.calls.closed,0);
  assert.equal(h.calls.rendered,0);
});

test('an old save cannot unlock a replacement dialog that is still saving', async () => {
  const h=setup(); const saving=h.context.save();
  h.context.studio={};
  vm.runInContext('saving=true',h.context);
  h.success(); await saving;
  assert.equal(vm.runInContext('saving',h.context),true);
});

test('failed studio saves preserve edits and restore original control states', async () => {
  const h=setup(); const saving=h.context.save();
  h.resolve({data:null,error:{message:'Signal interrupted'}}); await saving;
  assert.equal(h.controls['#bv-studio-error'].textContent,'Signal interrupted');
  assert.equal(h.context.draft.trackPath,'owner/original.mp3');
  assert.equal(h.controls['#d-name'].disabled,false);
  assert.equal(h.controls['#bv-cover-upload'].disabled,true);
  assert.equal(h.calls.closed,0);
});

const guestSettings={id:'school-natabua-high-school',accent:'#34789a',background:'#102f41',pattern:'masi',font:'rounded',layout:'wide',note:'Bula <friends> & family',interests:'Music, stories',trackUrl:'https://example.test/song.mp3',trackTitle:'My selected track',trackPath:'',coverPath:'',songRef:'',atmosphere:'none',motionEnergy:'calm'};
const guest=options=>setup({user:null,me:null,deferClose:true,settings:{...guestSettings},...options});

test('guest choice persists exact settings and opens the chosen room only after close cleanup',async()=>{
  const h=guest();await h.context.save();
  assert.equal(h.calls.stored.length,1);assert.equal(h.calls.stored[0].key,'bv-picked-skin');
  assert.deepEqual(JSON.parse(h.calls.stored[0].value),guestSettings);
  assert.equal(h.calls.closed,1);assert.equal(h.calls.guestRooms.length,0);
  assert.equal(h.context.studio,h.dialog);assert.equal(h.context.draft.id,guestSettings.id);
  assert.equal(h.listeners.filter(entry=>entry.type==='close'&&entry.once).length,1);
  h.fireClose();
  assert.equal(h.calls.guestRooms.length,1);assert.deepEqual(h.calls.guestRooms[0].settings,guestSettings);
  assert.equal(h.calls.guestRooms[0].studio,null);assert.equal(h.context.studio,null);
  assert.equal(h.calls.updated,0);assert.equal(h.calls.rendered,0);assert.equal(h.calls.auth,0);
  h.fireClose();assert.equal(h.calls.guestRooms.length,1,'once close callback cannot render twice');
});

test('guest storage failure keeps the current dialog and unsaved draft',async()=>{
  const h=guest({storageError:true}),draft=h.context.draft;await h.context.save();
  assert.equal(h.calls.stored.length,0);assert.equal(h.calls.closed,0);assert.equal(h.calls.guestRooms.length,0);
  assert.equal(h.context.studio,h.dialog);assert.equal(h.context.draft,draft);
  assert.match(h.controls['#bv-studio-error'].textContent,/could not keep your choice/);
  assert.equal(h.controls['#bv-save'].disabled,false);assert.equal(h.calls.updated,0);assert.equal(h.calls.auth,0);
});

test('a replacement auth render invalidates the queued guest room destination',async()=>{
  const h=guest();await h.context.save();h.context.renderAuth();h.fireClose();
  assert.notEqual(h.context.app.firstElementChild,h.origin);assert.equal(h.calls.guestRooms.length,0);assert.equal(h.calls.rendered,0);assert.equal(h.calls.auth,1);
});

test('signing in while the guest close event is queued suppresses the guest room',async()=>{
  const h=guest();await h.context.save();h.context.S.user={id:'new-owner'};h.context.S.me={id:'new-owner'};h.fireClose();
  assert.equal(h.calls.guestRooms.length,0);assert.equal(h.calls.updated,0);assert.equal(h.context.S.me.room_css,undefined);
});

test('a newer guest save supersedes the old queued preview without closing its replacement',async()=>{
  const h=guest();await h.context.save();const replacement={...h.dialog},nextSettings={...guestSettings,note:'Newer selected room'};
  h.context.studio=replacement;h.context.draft=nextSettings;await h.context.save();h.fireClose();
  assert.equal(h.context.studio,replacement);assert.equal(h.calls.guestRooms.length,0);assert.equal(h.calls.closed,2);
  h.fireClose(replacement);assert.equal(h.calls.guestRooms.length,1);assert.deepEqual(h.calls.guestRooms[0].settings,nextSettings);assert.equal(h.calls.guestRooms[0].studio,null);
});

test('a signed-in account without a profile is not treated as a guest',async()=>{
  const h=setup({me:null,deferClose:true});await h.context.save();
  assert.equal(h.controls['#bv-studio-error'].textContent,'Finish setting up your room before saving a skin.');
  assert.equal(h.calls.stored.length,0);assert.equal(h.calls.closed,0);assert.equal(h.calls.guestRooms.length,0);
  assert.equal(h.calls.updated,0);assert.equal(h.calls.rendered,0);assert.equal(h.calls.auth,0);assert.equal(h.context.studio,h.dialog);
});
