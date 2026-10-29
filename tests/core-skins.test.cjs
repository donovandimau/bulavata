const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const skins = require('../skins.js');
const root = path.join(__dirname,'..');
const manifest = JSON.parse(fs.readFileSync(path.join(root,'assets/skins/core/manifest.json'),'utf8'));
const core = skins.presets.filter(p=>p.artwork);
assert.equal(core.length,60);
assert.equal(skins.presets.length,94);
assert.equal(new Set(skins.presets.map(p=>p.id)).size,94);
assert.equal(manifest.catalogue.length,222);
assert.equal(manifest.catalogue.filter(p=>p.status==='integrated').length,60);
assert.equal(manifest.catalogue.filter(p=>p.status!=='integrated').length,162);
const backgrounds = new Set();
for(const p of core){
  assert.equal(manifest.skins.find(s=>s.id===p.id).catalogueId,p.catalogueId);
  for(const asset of [p.artwork,p.border]){
    assert.match(asset,/^\/assets\/skins\/core\/[a-z0-9-]+\.svg$/);
    const svg=fs.readFileSync(path.join(root,asset),'utf8');
    assert(svg.startsWith('<svg '));assert(svg.endsWith('</svg>'));
    assert(!/<script|<foreignObject|on\w+=|https?:|href=|url\(https?:/i.test(svg.replace('xmlns="http://www.w3.org/2000/svg"','')));
    if(asset===p.artwork)backgrounds.add(svg);
  }
  assert(skins.contrast(p.ink,p.panel)>=4.5,p.name+' text contrast');
  assert(skins.contrast(p.muted,p.panel)>=4.5,p.name+' secondary text contrast');
  const personal={id:p.id,note:'My own dedication',interests:'Family, guitar',trackTitle:'My own recording',trackUrl:'https://example.org/song.mp3',layout:'wide'};
  assert.deepEqual(skins.read(skins.encode(personal)).settings,skins.normalize(personal));
  assert.equal(skins.tokens(personal)['--bv-art'],`url("${p.coverArt}")`);
  assert.equal(skins.tokens(personal)['--bv-border'],'none');
  for(const song of p.songs){assert.equal(new URL(song.url).protocol,'https:');assert(song.title);assert(song.performer);}
}
assert.equal(backgrounds.size,60);
assert(core.find(p=>p.catalogueId==='province-nadroga-navosa').artDescription.includes('horse'));
assert(core.find(p=>p.catalogueId==='province-ra').artDescription.includes('rooster'));
assert(core.find(p=>p.catalogueId==='memory-childhood-memory').songs.some(s=>/Lai Tei Dalo/i.test(s.title)));
assert.equal(skins.normalize({id:'masi'}).id,'masi');
assert.equal(skins.normalize({id:'drua'}).id,'drua');
const studio=fs.readFileSync(path.join(root,'skin-studio.js'),'utf8');
const context=require('node:vm').createContext({skins});
require('node:vm').runInContext(studio.slice(studio.indexOf('  function remix('),studio.indexOf('  function skinScene(')),context);
const personal=skins.normalize({id:'lagoon',note:'My own words',interests:'My people',trackTitle:'My recording',trackPath:'11111111-1111-1111-1111-111111111111/music/22222222-2222-2222-2222-222222222222.mp3',coverPath:'11111111-1111-1111-1111-111111111111/covers/22222222-2222-2222-2222-222222222222.jpg',songRef:'music-knox:0',layout:'wide'});
const remixed=context.remix(personal,'school-usp');
for(const key of ['note','interests','trackTitle','trackPath','coverPath','songRef','layout'])assert.equal(remixed[key],personal[key]);
assert.equal(remixed.id,'school-usp');
assert.equal(remixed.accent,skins.presets.find(p=>p.id==='school-usp').accent);
assert.equal(context.remix(skins.normalize({id:'lagoon'}),'school-usp').note,skins.presets.find(p=>p.id==='school-usp').note);
assert(studio.includes('rel="noopener noreferrer"'));
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
assert(!sw.match(/const ASSETS=.*assets\/skins\/core/));
console.log('PASS: 60 unique safe SVG designs, 94 stable IDs, 222 tracked concepts, contrast, saved personal settings, required horse/rooster/dalo themes, song attribution and lazy public-only asset caching.');

