const {test}=require('node:test');
const assert=require('node:assert/strict');
const skins=require('../skins.js');
const discovery=require('../skin-discovery.js');

test('community collections resolve only available identities without changing saved IDs',()=>{
  const ids=skins.presets.map(p=>p.id);
  const groups=discovery.collections(skins.presets);
  assert.equal(groups.length,6);
  assert.deepEqual(groups.map(g=>g.count),[8,22,6,13,18,4]);
  for(const group of groups){
    assert(group.featured.length>0&&group.featured.length<=2);
    assert(group.featured.every(p=>group.categories.includes(p.category)));
    assert.equal(discovery.matching(skins.presets,group.id).length,group.count);
  }
  const featured=discovery.matching(skins.presets);
  assert.equal(featured.length,12);
  assert.equal(new Set(featured.map(p=>p.id)).size,12);
  assert.deepEqual(skins.presets.map(p=>p.id),ids);
  assert.equal(discovery.matching(skins.presets,'All').length,94);
  assert.deepEqual(discovery.matching(skins.presets,'not-a-collection'),[]);
});

test('search reaches song/artist references across collections and handles accents',()=>{
  assert(discovery.matching(skins.presets,'school-pride','Paradise Rootz').some(p=>p.id==='music-paradise-rootz'));
  assert(discovery.matching(skins.presets,'All','Mai Lodoni Mai').some(p=>p.id==='school-ratu-kadavulevu-school'));
  assert.deepEqual(discovery.matching([{name:'Séré   ni Viti',songs:[]}],'All','sere ni viti').length,1);
  assert.deepEqual(discovery.matching(skins.presets,'All','<script>'),[]);
  assert.equal(discovery.matching(skins.presets,'Schools','  ').length,8);
});

test('room hierarchy follows the identity while saved profile settings still round-trip',()=>{
  for(const [id,layout] of [['school-usp','school'],['music-knox','music'],['core-masi','heritage'],['province-ra','place'],['occasion-school-reunion','celebration'],['studio-ocean','social']]){
    const p=skins.presets.find(p=>p.id===id);
    assert.equal(discovery.layout(p),layout);
    const settings=skins.normalize({id,note:'My own words',layout:'wide',songRef:'music-knox:0'});
    assert.deepEqual(skins.read(skins.encode(settings)).settings,settings);
  }
  assert.equal(discovery.layout(null),'social');
});
