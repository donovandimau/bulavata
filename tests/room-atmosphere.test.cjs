const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const skins=require('../skins.js');
const atmosphere=require('../room-atmosphere.js');

test('all five effects survive saving, with personal artwork, soundtrack and legacy CSS intact',()=>{
  for(const effect of atmosphere.effects.slice(1)){
    for(const motionEnergy of ['calm','bold']){
      const settings=skins.normalize({id:'studio-ocean',atmosphere:effect.id,motionEnergy,
        note:'My own words',trackUrl:'https://example.org/song.mp3',trackTitle:'My recording',font:'serif'});
      const saved=skins.read(skins.encode(settings,'.scrawl {color:red}'));
      assert.deepEqual(saved.settings,settings);assert(saved.legacy.includes('.scrawl'));
      const markup=atmosphere.markup(saved.settings);
      assert(markup.includes(`data-atmosphere="${effect.id}"`));
      assert(markup.includes('data-running="false"'));assert(markup.includes('Play motion'));
      assert((markup.match(/<i /g)||[]).length<=20);
    }
  }
  assert.equal(skins.normalize({}).atmosphere,'none');
  assert.equal(atmosphere.markup({atmosphere:'<img src=x onerror=alert(1)>'}), '');
  assert.equal(skins.normalize({atmosphere:'invalid',motionEnergy:'invalid'}).atmosphere,'none');
  assert(!atmosphere.markup({atmosphere:'bubbles',motionEnergy:'" onload="bad'}).includes('onload'));
});

test('motion requires a click, pauses offscreen/hidden/reduced, and releases replaced previews',()=>{
  const events={},media={matches:false,addEventListener:(type,fn)=>events.reduced=fn};
  let observerCallback,unobserved=0;
  const doc={hidden:false,addEventListener:(type,fn)=>events[type]=fn};
  const w={document:doc,matchMedia:()=>media,IntersectionObserver:class{
    constructor(fn){observerCallback=fn;}observe(){}unobserve(){unobserved++;}
  }};
  vm.runInNewContext(fs.readFileSync(require.resolve('../room-atmosphere.js'),'utf8'),{window:w});
  const attributes={},listeners={};
  const button={setAttribute:(k,v)=>attributes[k]=v,addEventListener:(k,v)=>listeners[k]=v,removeEventListener:k=>delete listeners[k]};
  const node={isConnected:true,dataset:{atmosphere:'bubbles'},querySelector:()=>button};
  const scope={querySelectorAll:()=>[node],contains:n=>n===node};
  w.SotaRoomAtmosphere.mount(scope);w.SotaRoomAtmosphere.mount(scope);
  assert.equal(node.dataset.running,'false');
  listeners.click();assert.equal(node.dataset.running,'true');assert.equal(attributes['aria-pressed'],'true');
  observerCallback([{target:node,isIntersecting:false}]);assert.equal(node.dataset.running,'false');
  observerCallback([{target:node,isIntersecting:true}]);assert.equal(node.dataset.running,'true');
  doc.hidden=true;events.visibilitychange();assert.equal(node.dataset.running,'false');
  doc.hidden=false;events.visibilitychange();assert.equal(node.dataset.running,'true');
  listeners.click();assert.equal(node.dataset.running,'false');
  listeners.click();media.matches=true;events.reduced();assert.equal(node.dataset.running,'false');assert(button.disabled);
  media.matches=false;events.reduced();assert.equal(node.dataset.running,'false');assert(!button.disabled);
  listeners.click();w.SotaRoomAtmosphere.release(scope);
  assert.equal(node.dataset.running,'false');assert.equal(listeners.click,undefined);assert.equal(unobserved,1);
  w.SotaRoomAtmosphere.mount(scope);assert.equal(node.dataset.running,'false');
  node.isConnected=false;w.SotaRoomAtmosphere.mount({querySelectorAll:()=>[]});assert.equal(unobserved,2);
});
