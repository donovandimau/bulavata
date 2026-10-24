const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../skin-studio.js'), 'utf8');
const saveSource = source.slice(source.indexOf('  let saving=false;'), source.indexOf("  window.addEventListener('sota-music-change'"));
const closeSource = source.match(/function close\(\) \{[^\n]+\}/)[0];

function setup() {
  let resolve, reject;
  const pending = new Promise((yes, no) => { resolve = yes; reject = no; });
  const values = {'#bv-trackUrl':'', '#d-name':'Sina', '#d-pro':'', '#d-bio':'Bula', '#d-emo':'🌺', '#d-css':''};
  const controls = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, {value, disabled:false}]));
  controls['#bv-save'] = {textContent:'Save my room', disabled:false};
  controls['#bv-cover-upload'] = {disabled:true};
  controls['#bv-studio-error'] = {textContent:''};
  const calls = {closed:0, rendered:0, kept:[], updated:0};
  const dialog = {
    querySelector: selector => controls[selector],
    querySelectorAll: () => Object.entries(controls).filter(([key]) => key !== '#bv-studio-error').map(([, value]) => value),
    setAttribute() {}, removeAttribute() {},
    close() { calls.closed++; context.studio = null; context.draft = null; }
  };
  const query = {update(patch) { calls.patch=patch; calls.updated++; return query; }, eq(key, id) { calls.owner=id; return query; }, select() {return query;}, single() {return pending;}};
  const context = vm.createContext({
    studio:dialog, draft:{accent:'#086779', trackPath:'owner/original.mp3', coverPath:''}, mediaBusy:false,
    S:{user:{id:'owner'}, me:{id:'owner'}},
    skins:{safeUrl:()=>true, encode:()=> 'encoded'},
    sb:{from:()=>query}, discardUploads: kept => calls.kept.push(kept),
    toast() {}, render:async()=>{calls.rendered++;},
    window:{addEventListener(){}, SotaPlayback:{register(){}}},
    openDecorate:null, setTimeout, document:{querySelector:()=>null}
  });
  vm.runInContext(closeSource + '\n' + saveSource, context);
  return {context, dialog, controls, calls, resolve, reject,
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
