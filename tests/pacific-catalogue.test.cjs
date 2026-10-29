"use strict";
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{pathToFileURL}=require('node:url');
const repo=path.join(__dirname,'..'),root=path.join(repo,'revised'),folder=path.join(root,'assets','skins','photographic-20261029'),catalogue=JSON.parse(fs.readFileSync(path.join(folder,'catalogue.json'),'utf8')),manifest=JSON.parse(fs.readFileSync(path.join(folder,'manifest.json'),'utf8')),history=JSON.parse(fs.readFileSync(path.join(root,'assets','skins','pacific-20261029','catalogue.json'),'utf8'));
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const ordered=value=>Array.isArray(value)?value.map(ordered):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,ordered(value[key])])):value;
const lum=hex=>hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0),contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);

test('all94existing IDs and the native catalogue match the photographic Revised export',async()=>{
 const {SKINS}=await import(pathToFileURL(path.join(root,'skin-library.mjs')).href);assert.deepEqual(catalogue,SKINS);assert.equal(SKINS.length,94);assert.equal(new Set(SKINS.map(s=>s.id)).size,94);assert.equal(hash(SKINS.map(s=>s.id).join('\n')),'d9d2bd730fa346f889d12eff969e5e571bc26749f5eb3492c05cbf265c40d9bb');
});

test('the photograph correction preserves every non-artwork theme field and every identity/song credit',()=>{
 const allowed=new Set(['coverArt','artwork','materialName','artNote','artworkType','coverPosition','coverThumb']),withoutArt=skin=>Object.fromEntries(Object.entries(skin).filter(([key])=>!allowed.has(key)));
 assert.deepEqual(catalogue.map(withoutArt),history.map(withoutArt));
 const credits=catalogue.filter(s=>s.category!=='Signature').map(s=>({id:s.id,...Object.fromEntries(['identityLabel','identitySources','identityNote','songs'].map(key=>[key,s[key]??null]))}));assert.equal(hash(JSON.stringify(ordered(credits))),'706825da3789f2bae09a5710887fbb3125bd4a31b519bb8a83d8de255208d410');assert.ok(catalogue.find(s=>s.id==='candy').aliases.includes('Rosewood'));
});

test('all active theme covers are safe local photographic WebPs from a deliberately shared pool',()=>{
 const refs=new Set(),palettes=new Set();for(const s of catalogue){assert.match(s.coverArt,/^\.\/assets\/skins\/photographic-20261029\/[a-z0-9-]+\.webp$/);assert.equal(s.artwork,s.coverArt);assert.match(s.coverThumb,/^\.\/assets\/skins\/photographic-20261029\/[a-z0-9-]+-thumb\.webp$/);assert.equal(s.artworkType,'photographic');assert.match(s.coverPosition,/^\d{1,3}% \d{1,3}%$/);assert.ok(s.coverPosition.split(' ').every(v=>parseInt(v,10)<=100));const data=fs.readFileSync(path.join(root,s.coverArt));assert.equal(data.subarray(0,4).toString(),'RIFF');assert.equal(data.subarray(8,12).toString(),'WEBP');refs.add(s.coverArt);palettes.add(JSON.stringify(['bg','panel','ink','muted','accent'].map(k=>s[k])));for(const key of ['bg','panel','ink','muted','accent','cover'])assert.match(s[key],/^#[\da-f]{6}$/i);for(const [a,b]of [['ink','panel'],['muted','panel'],['ink','bg']])assert.ok(contrast(s[a],s[b])>=4.5,s.id+' '+a+'/'+b);assert.doesNotMatch(s.artNote,/code-native|vector illustration/i);}
 assert.ok(refs.size>=16&&refs.size<=20);assert.equal(palettes.size,94);assert.equal(refs.size,manifest.distinctPhotoCount);assert.equal(refs.size,fs.readdirSync(folder).filter(name=>name.endsWith('.webp')&&!name.endsWith('-thumb.webp')).length);
});

test('the first themes use inspected coastal, people, rain, coconut, sunset and guitar photographs',()=>{
 const expect={lagoon:'vanua-coast',midnight:'island-sessions',notebook:'rainforest',palm:'coconut-coast',sunset:'tropical-sunset',pixel:'island-guitar',hibiscus:'island-flowers',candy:'island-flowers',reef:'coral-reef','school-fnu':'family-stories','school-usp':'community-talanoa'};for(const [id,photo]of Object.entries(expect))assert.ok(catalogue.find(s=>s.id===id).coverArt.endsWith('/'+photo+'.webp'),id);
});

test('the public photo manifest records source hashes, full-frame optimization and four exact generation prompts',()=>{
 assert.equal(manifest.themeCount,94);assert.equal(manifest.mappings.length,94);assert.equal(manifest.assets.length,manifest.distinctPhotoCount);assert.equal(manifest.assets.filter(a=>a.source.kind==='generated-this-revision').length,4);assert.doesNotMatch(JSON.stringify(manifest),/[A-Z]:\\|Users[\\/]Donovan|generated_images/);
 for(const asset of manifest.assets){const file=path.join(folder,asset.file),data=fs.readFileSync(file);assert.equal(hash(data),asset.after.sha256);assert.equal(data.length,asset.after.bytes);assert.equal(asset.after.format,'webp');assert.ok(asset.after.bytes<=500000,'Full cover budget: '+asset.id);for(const section of [asset.before,asset.after]){assert.match(section.sha256,/^[a-f\d]{64}$/);assert.ok(section.width>0&&section.height>0);assert.ok(section.bytes>1000);}assert.ok(Math.abs(asset.before.width/asset.before.height-asset.after.width/asset.after.height)<.004,'Full frame aspect ratio retained: '+asset.id);assert.match(asset.optimization,/no crop|no cropping/i);
  if(asset.source.kind==='generated-this-revision'){assert.equal(asset.source.tool,'built-in image_gen');assert.ok(asset.source.prompt.length>150);assert.match(asset.source.originalGeneratedFile,/^exec-[a-f\d-]+\.png$/);assert.equal(asset.source.originalPreserved,true);}
  else{assert.ok(asset.source.repositoryPath&&!asset.source.repositoryPath.includes('..'));const before=fs.readFileSync(path.join(repo,asset.source.repositoryPath));assert.equal(hash(before),asset.before.sha256);if(asset.source.repositoryPath.endsWith('.webp'))assert.equal(hash(data),hash(before),'Reused WebP remains byte-identical');}
 }
 for(const s of catalogue){const mapping=manifest.mappings.find(m=>m.id===s.id);assert.equal(mapping.file,path.basename(s.coverArt));assert.equal(mapping.thumbnail,path.basename(s.coverThumb));assert.ok(manifest.assets.some(a=>a.file===mapping.file));}
});

test('rejected vector themes and the original eight photographic studies remain available as history',()=>{
 assert.equal(history.length,94);for(const s of history){assert.match(s.coverArt,/pacific-20261029\/.+\.svg$/);assert.ok(fs.existsSync(path.join(root,s.coverArt)));assert.ok(!catalogue.some(c=>c.coverArt===s.coverArt));}
 for(const name of ['ocean','basalt','linen','botanical','bronze','terracotta','mist','vinyl'])assert.ok(fs.statSync(path.join(root,'assets','skins',name+'.webp')).size>1000);
});


test('the gallery uses20small shared thumbnails while full-size covers stay available',()=>{
 const refs=new Set(catalogue.map(s=>s.coverThumb));assert.equal(refs.size,20);assert.equal(fs.readdirSync(folder).filter(name=>name.endsWith('-thumb.webp')).length,20);
 for(const asset of manifest.assets){const thumb=asset.thumbnail,data=fs.readFileSync(path.join(folder,thumb.file));assert.ok(refs.has(thumb.path));assert.equal(hash(data),thumb.sha256);assert.equal(data.length,thumb.bytes);assert.ok(thumb.bytes<=80000,asset.id+' thumbnail budget');assert.equal(data.subarray(0,4).toString(),'RIFF');assert.equal(data.subarray(8,12).toString(),'WEBP');assert.ok(thumb.width<=480&&thumb.height<=320);assert.ok(Math.abs(asset.after.width/asset.after.height-thumb.width/thumb.height)<.004,'Thumbnail preserves complete frame: '+asset.id);assert.match(thumb.optimization,/no cropping, padding or semantic edits/);assert.notEqual(thumb.sha256,asset.after.sha256);}
 assert.ok(manifest.assets.reduce((sum,a)=>sum+a.thumbnail.bytes,0)<1000000);
});
