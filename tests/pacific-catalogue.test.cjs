'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{pathToFileURL}=require('node:url');
const root=path.join(__dirname,'..','revised'),folder=path.join(root,'assets','skins','pacific-20261029'),catalogue=JSON.parse(fs.readFileSync(path.join(folder,'catalogue.json'),'utf8'));
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const ordered=value=>Array.isArray(value)?value.map(ordered):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,ordered(value[key])])):value;
const lum=hex=>hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0),contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);

test('all94existing IDs remain in place and the native catalogue matches the Revised export',async()=>{
 const {SKINS}=await import(pathToFileURL(path.join(root,'skin-library.mjs')).href);assert.deepEqual(catalogue,SKINS);assert.equal(SKINS.length,94);assert.equal(new Set(SKINS.map(s=>s.id)).size,94);assert.equal(hash(SKINS.map(s=>s.id).join('\n')),'d9d2bd730fa346f889d12eff969e5e571bc26749f5eb3492c05cbf265c40d9bb');
});

test('institution, province, culture and music identity and song credits remain byte-equivalent',()=>{
 const credits=catalogue.filter(s=>s.category!=='Signature').map(s=>({id:s.id,...Object.fromEntries(['identityLabel','identitySources','identityNote','songs'].map(key=>[key,s[key]??null]))}));
 assert.equal(hash(JSON.stringify(ordered(credits))),'706825da3789f2bae09a5710887fbb3125bd4a31b519bb8a83d8de255208d410');
 assert.ok(catalogue.find(s=>s.id==='candy').aliases.includes('Rosewood'));assert.ok(catalogue.find(s=>s.id==='lagoon').aliases.includes('Pacific Depths'));assert.ok(catalogue.find(s=>s.id==='comic').aliases.includes('The Editorial'));
});

test('every theme has its own regional vector cover and a distinct readable colour palette',()=>{
 const artworks=new Set(),palettes=new Set();for(const s of catalogue){assert.equal(s.coverArt,'./assets/skins/pacific-20261029/'+s.id+'.svg');assert.equal(s.artwork,s.coverArt);const svg=fs.readFileSync(path.join(root,s.coverArt),'utf8');assert.match(svg,/<svg[^>]*viewBox="0 0 1200 800"/);assert.match(svg,/<title id="title">/);assert.match(svg,/<desc id="desc">/);assert.doesNotMatch(svg,/<(?:script|foreignObject|image)\b|\bon\w+=|(?:href|src)\s*=|url\(\s*https?:/i);artworks.add(hash(svg.replace(/<title[\s\S]*?<\/title>|<desc[\s\S]*?<\/desc>/g,'')));palettes.add(JSON.stringify(['bg','panel','ink','muted','accent'].map(k=>s[k])));for(const key of ['bg','panel','ink','muted','accent','cover'])assert.match(s[key],/^#[\da-f]{6}$/i);for(const [a,b]of [['ink','panel'],['muted','panel'],['ink','bg']])assert.ok(contrast(s[a],s[b])>=4.5,s.id+' '+a+'/'+b);assert.equal(s.font,'sans');assert.equal(s.pattern,'plain');assert.match(s.region,/Fiji.*Pacific.*tropical/);assert.match(s.artNote,/Original code-native/);}
 assert.equal(artworks.size,94);assert.equal(palettes.size,94);assert.equal(fs.readdirSync(folder).filter(name=>name.endsWith('.svg')).length,94);
});

test('the full collection uses ten Pacific and tropical visual families rather than material studies',()=>{
 const families=new Set(catalogue.map(s=>s.regionalMotif));for(const family of ['ocean','reef','coconut','palm','hibiscus','tropical-rain','mountain-island','island-music','community','woven-inspired'])assert.ok(families.has(family),family);assert.equal(families.size,10);
 for(const s of catalogue){assert.doesNotMatch(s.note+' '+s.materialName,/linen|bronze|terracotta|editorial|volcanic stone|mood study/i);if(s.category==='Signature')assert.match(s.name,/Fiji|Pacific|Island|Tropical|Coconut|Hibiscus|Reef|Coral|Drua|Talanoa|Mango|Rainforest|Woven/);}
});

test('regional assets do not overwrite any of the eight original photographic studies',()=>{
 for(const name of ['ocean','basalt','linen','botanical','bronze','terracotta','mist','vinyl']){const original=path.join(root,'assets','skins',name+'.webp');assert.ok(fs.statSync(original).size>1000);assert.ok(!catalogue.some(s=>s.coverArt.endsWith('/'+name+'.webp')));}
});
