'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),skins=require('../skins.js'),visuals=require('../skin-visuals.js'),regional=require('../pacific-themes.js');
const catalogue=JSON.parse(fs.readFileSync(path.join(root,'revised/assets/skins/pacific-20261029/catalogue.json'),'utf8'));
function originalPresets(){
 const original={exports:{}},nativeRequire=createRequire(path.join(root,'skins.js'));
 vm.runInNewContext(fs.readFileSync(path.join(root,'skins.js'),'utf8'),{module:original,require:id=>id==='./pacific-themes.js'?null:nativeRequire(id)});
 return JSON.parse(JSON.stringify(original.exports.presets));
}
test('the native regional layer preserves all 94 saved identities, categories and source credits',()=>{
 const original=originalPresets();assert.equal(skins.presets.length,94);assert.equal(new Set(skins.presets.map(p=>p.id)).size,94);
 assert.deepEqual(skins.presets.map(p=>p.id),original.map(p=>p.id));assert.deepEqual(new Set(skins.presets.map(p=>p.id)),new Set(catalogue.map(p=>p.id)));
 for(const p of skins.presets){const previous=original.find(x=>x.id===p.id),authored=catalogue.find(x=>x.id===p.id);
  for(const key of ['category','catalogueId','identityLabel','identitySources','identityNote','songs','artwork','border','artDescription'])assert.deepEqual(p[key],previous[key],p.id+' preserves '+key);
  for(const key of ['name','note','bg','panel','ink','muted','accent','cover','font','pattern','regionalMotif','region','artNote'])assert.equal(p[key],authored[key],p.id+' follows regional '+key);
  assert.equal(p.coverArt,'/revised/assets/skins/pacific-20261029/'+p.id+'.svg');
 }
});
test('all 94 native covers and six discovery cards use the shared regional artwork without old photographic overlays',()=>{
 const distinct=new Set();assert.equal(visuals.images.length,94);assert.equal(new Set(visuals.images).size,94);assert.equal(visuals.legacyImages.length,16);
 for(const p of skins.presets){const file=visuals.cover(p);assert.equal(file,p.coverArt);assert.equal(visuals.position(p),'center');assert(skins.tokens({id:p.id})['--bv-hero'].includes(file));
  const svg=fs.readFileSync(path.join(root,file),'utf8');assert.match(svg,/^<svg[\s>]/);assert(!/<script|<foreignObject|\son\w+\s*=|href\s*=|url\(\s*https?:|https?:/i.test(svg.replace('xmlns="http://www.w3.org/2000/svg"','')),p.id+' is a self-contained safe SVG');distinct.add(svg);
  assert(skins.contrast(p.ink,p.panel)>=4.5,p.id+' readable text');assert(skins.contrast(p.muted,p.panel)>=4.5,p.id+' readable secondary text');
 }
 assert.equal(distinct.size,94);
 for(const group of require('../skin-discovery.js').collections(skins.presets)){assert.equal(visuals.collection(group.id),regional.collectionCovers[group.id]);assert(visuals.images.includes(visuals.collection(group.id)));}
});
test('regional defaults do not replace saved personal colours, wording, media or safe legacy CSS',()=>{
 const legacy='.scrawl{border-radius:8px;color:#334455}';
 for(const p of skins.presets){const settings=skins.normalize({id:p.id,accent:'#234567',background:'#abcdef',panel:'#fafafa',cover:'#bbccdd',note:'My own words',interests:'My school, my people',font:'mono',pattern:'grid',layout:'wide',customName:'Our corner',showArtwork:false,textScale:123,headingScale:134,coverHeight:287,coverX:31,coverY:62,textAlign:'right',musicPosition:'bottom',trackTitle:'My recording',trackUrl:'https://example.org/music.mp3',songRef:'music-knox:0'});
  const restored=skins.read(skins.encode(settings,legacy));assert.deepEqual(restored.settings,settings,p.id+' saved preferences survive');assert.equal(restored.legacy,legacy);assert.equal(skins.tokens(settings)['--bv-hero'],'none');
 }
});
test('midtone accents use an AA foreground instead of the old insufficient navy threshold',()=>{
 for(const background of ['#8a8a8a','#767676','#bb7788','#5d9d8d','#ffeedd','#111122'])assert(skins.contrast(background,skins.foreground(background))>=4.5,background+' foreground remains readable');
 for(const p of skins.presets){const tokens=skins.tokens({id:p.id});for(const [background,foreground]of [['--bv-chat-out','--bv-chat-out-ink'],['--bv-cover','--bv-cover-ink'],['--bv-accent','--bv-on-accent']])assert(skins.contrast(tokens[background],tokens[foreground])>=4.5,p.id+' '+background);}
});
test('the regional presentation keeps every attributed song reference available after reload',()=>{
 let count=0;for(const p of skins.presets)for(let i=0;i<(p.songs||[]).length;i++){const ref=p.id+':'+i;assert.equal(skins.read(skins.encode({id:p.id,songRef:ref,note:'My dedication'})).settings.songRef,ref);assert.equal(skins.song(ref).url,p.songs[i].url);count++;}
 assert.equal(count,73);assert.equal(skins.song('music-knox:99'),null);
});
test('the browser UMD load order and optional fallback keep the same native catalogue without fetching data',()=>{
 function browser(files){const context=vm.createContext({URL});for(const file of files)vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);return context;}
 const themed=browser(['skin-identities.js','pacific-themes.js','skin-visuals.js','skins.js']);assert.equal(themed.BulaSkins.presets.length,94);
 for(const p of themed.BulaSkins.presets){assert.equal(themed.SotaSkinVisuals.cover(p),p.coverArt);assert(themed.BulaSkins.tokens({id:p.id})['--bv-hero'].includes(p.coverArt));}
 const fallback=browser(['skin-identities.js','skin-visuals.js','skins.js']);assert.equal(fallback.BulaSkins.presets.length,94);assert.match(fallback.SotaSkinVisuals.cover(fallback.BulaSkins.presets[0]),/\.webp$/);assert.equal(fallback.BulaSkins.normalize({id:'school-usp',note:'Keep my words'}).note,'Keep my words');
});
test('native entrypoints load identity, regional presentation and group palette helpers in dependency order',()=>{
 for(const file of ['index.html','communications.html']){
  const html=fs.readFileSync(path.join(root,file),'utf8');let previous=-1;
  for(const name of ['skin-identities','pacific-themes','skin-visuals','skins','circle-types']){const match=new RegExp('<script\\b[^>]*\\bsrc="/'+name+'\\.js(?:\\?[^"\\s]*)?"[^>]*>').exec(html);assert(match,file+' includes '+name);assert(match.index>previous,file+' loads '+name+' after its data dependencies');previous=match.index;}
 }
});
test('generic regional preview titles use the catalogue name while real community identities stay credited',()=>{
 const source=fs.readFileSync(path.join(root,'skin-studio.js'),'utf8'),esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const context=vm.createContext({skins,esc,studio:null,window:{},coverMediaMarkup:()=>''});
 vm.runInContext(source.slice(source.indexOf('  function themeLabel('),source.indexOf('  function skinScene(')),context);
 vm.runInContext(source.slice(source.indexOf('  function skinSongs('),source.indexOf('  function preview(')),context);
 for(const p of skins.presets){const entry=catalogue.find(x=>x.id===p.id),expected=entry.category==='Signature'?p.name:p.identityLabel||p.name;
  assert.equal(context.themeLabel(p),expected,p.id+' visible title');assert(context.coverContent({id:p.id}).includes('<h3 class="bv-identity-title">'+esc(expected)+'</h3>'));assert(context.skinSongs({id:p.id}).includes('<h3>'+esc(expected)+'</h3>'));
 }
 assert.equal(skins.presets.find(p=>p.id==='midnight').identityLabel,'Midnight Mixtape');assert.equal(context.themeLabel(skins.presets.find(p=>p.id==='midnight')),'Pacific After Dark');assert(context.coverContent({id:'midnight',customName:'My own words'}).includes('>My own words</h3>'));
});
