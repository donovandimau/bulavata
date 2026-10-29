const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const skins=require('../skins.js');

test('every available skin has artwork and school/group identities remain distinct',()=>{
  assert.equal(skins.presets.length,94);
  const vectorArt=new Set();
  for(const p of skins.presets){
    assert(p.coverArt,p.id+' has no cover');
    assert(p.identityLabel,p.id+' has no identity');
    assert.match(p.coverArt,/^\/revised\/assets\/skins\/photographic-20261029\/[a-z0-9-]+\.webp$/);assert.equal(p.artworkType,'photographic');
    assert(fs.existsSync(path.join(__dirname,'..',p.coverArt)),p.coverArt);
    assert(skins.contrast(p.ink,p.panel)>=4.5,p.name+' body contrast');
    assert(skins.contrast(p.muted,p.panel)>=4.5,p.name+' secondary contrast');
  }
  // The previous identity artwork remains attributed source history. The
  // regional covers now supply the visible presentation for all saved IDs.
  for(const style of Object.values(require('../skin-identities.js').styles))if(style.coverArt?.startsWith('/assets/skins/identity/')){
    const svg=fs.readFileSync(path.join(__dirname,'..',style.coverArt),'utf8');
    assert(!/<script|<foreignObject|on\w+=|href=|url\(https?:/i.test(svg));vectorArt.add(svg);
  }
  assert.equal(vectorArt.size,89);
  assert.equal(skins.presets.filter(p=>p.category==='Schools').length,8);
  assert.equal(skins.presets.filter(p=>p.category==='Music & bands').length,6);
});

test('all attributed songs round-trip and unknown song selections fail closed',()=>{
  let count=0;
  for(const p of skins.presets)for(let i=0;i<(p.songs||[]).length;i++){
    const ref=p.id+':'+i,song=skins.song(ref);
    assert(song);assert.equal(new URL(song.url).protocol,'https:');
    const saved=skins.normalize({id:p.id,songRef:ref,note:'My own words',interests:'My school, my people'});
    const restored=skins.read(skins.encode(saved,'.scrawl{border-radius:8px}'));
    assert.equal(restored.settings.songRef,ref);
    assert.equal(restored.settings.note,'My own words');
    assert.equal(restored.legacy,'.scrawl{border-radius:8px}');
    count++;
  }
  assert.equal(count,73);
  for(const ref of ['javascript:0','school-rks:0','music-knox:99','music-knox:0</style>','https://evil.test:0']){
    assert.equal(skins.song(ref),null);assert.equal(skins.normalize({songRef:ref}).songRef,'');
  }
  assert.equal(skins.read(skins.encode({id:'lagoon'})).settings.songRef,'');
});
