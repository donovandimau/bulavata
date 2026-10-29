'use strict';
// Rebuild the native theme data from the same catalogue used by Revised.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'..'),folder='revised/assets/skins/photographic-20261029';
const catalogue=JSON.parse(fs.readFileSync(path.join(root,folder,'catalogue.json'),'utf8'));
if(!Array.isArray(catalogue)||catalogue.length!==94)throw Error('The regional catalogue must contain exactly 94 themes.');
const nativeRequire=createRequire(path.join(root,'skins.js')),baseline={exports:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'skins.js'),'utf8'),{module:baseline,require:id=>id==='./pacific-themes.js'?null:nativeRequire(id)});
const ids=baseline.exports.presets.map(p=>p.id),entries=new Map(catalogue.map(p=>[p.id,p]));
if(entries.size!==94||ids.some(id=>!entries.has(id)))throw Error('Regional themes must preserve every native saved skin ID.');
const colours=['bg','panel','ink','muted','accent','cover'],styles={};
for(const id of ids){
 const p=entries.get(id),style={};
 if(!/^[a-z0-9-]+$/.test(id))throw Error('Unsupported theme ID: '+id);
 for(const key of colours){if(!/^#[a-f0-9]{6}$/i.test(p[key]))throw Error(id+' has an invalid '+key);style[key]=p[key].toLowerCase();}
 for(const key of ['name','note','regionalMotif','region','artNote']){if(typeof p[key]!=='string'||!p[key].trim()||p[key].length>800)throw Error(id+' has an invalid '+key);style[key]=p[key];}
 if(!['rounded','serif','mono','sans','display','handwritten'].includes(p.font)||!['waves','dots','stars','flowers','stripes','checker','grid','masi','plain'].includes(p.pattern))throw Error(id+' has unsupported typography or pattern');
 style.font=p.font;style.pattern=p.pattern;
 // Signature editions have descriptive theme names. Community identity labels
 // remain the display title for actual schools, places and credited groups.
 if(p.category==='Signature')style.regionalTitle=p.name;
 if(p.artworkType!=='photographic'||typeof p.coverArt!=='string'||!/^\.\/assets\/skins\/photographic-20261029\/[a-z0-9-]+\.webp$/.test(p.coverArt))throw Error(id+' has an unexpected photographic cover path');
 const filename=path.basename(p.coverArt),asset=path.join(root,folder,filename);
 if(!fs.existsSync(asset))throw Error(id+' photographic cover is missing');
 const bytes=fs.readFileSync(asset);if(bytes.length<12||bytes.subarray(0,4).toString()!=='RIFF'||bytes.subarray(8,12).toString()!=='WEBP')throw Error(id+' cover is not a WebP image');
 const thumbname=filename.replace(/\.webp$/,'-thumb.webp');
 if(p.coverThumb!=='./assets/skins/photographic-20261029/'+thumbname)throw Error(id+' has an unexpected thumbnail path');
 const thumb=fs.readFileSync(path.join(root,folder,thumbname));if(thumb.length<12||thumb.length>80000||thumb.subarray(0,4).toString()!=='RIFF'||thumb.subarray(8,12).toString()!=='WEBP')throw Error(id+' thumbnail is not a lightweight WebP image');
 const position=p.coverPosition??'50% 50%',match=typeof position==='string'&&/^(\d{1,3}(?:\.\d{1,2})?)% (\d{1,3}(?:\.\d{1,2})?)%$/.exec(position);
 if(!match||match.slice(1).some(value=>Number(value)>100))throw Error(id+' has an invalid cover position');
 style.coverArt='/'+folder+'/'+filename;style.coverThumb='/'+folder+'/'+thumbname;style.artworkType='photographic';style.coverPosition=position;styles[id]=style;
}
const representatives={'school-pride':'school-ratu-kadavulevu-school','vanua-islands':'province-ra','music-crowd':'music-makare','masi-culture':'core-masi','life-memories':'occasion-school-reunion','fresh-looks':'studio-ocean'};
for(const id of Object.values(representatives))if(!styles[id])throw Error('Missing collection representative '+id);
const output=`/* Generated from ${folder}/catalogue.json. Run node scripts/build-pacific-native.cjs. */\n(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SotaPacificThemes=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){\n'use strict';\nconst styles=${JSON.stringify(styles,null,2)};\nconst representatives=${JSON.stringify(representatives)};\nfor(const style of Object.values(styles))Object.freeze(style);Object.freeze(styles);\nconst collectionCovers=Object.freeze(Object.fromEntries(Object.entries(representatives).map(([key,id])=>[key,styles[id].coverArt])));\nconst collectionThumbnails=Object.freeze(Object.fromEntries(Object.entries(representatives).map(([key,id])=>[key,styles[id].coverThumb])));\nreturn Object.freeze({version:2,styles,collectionCovers,collectionThumbnails,images:Object.freeze([...new Set(Object.values(styles).map(p=>p.coverArt))]),thumbnails:Object.freeze([...new Set(Object.values(styles).map(p=>p.coverThumb))])});\n});\n`;
fs.writeFileSync(path.join(root,'pacific-themes.js'),output);
console.log('Built native regional theme data for '+ids.length+' saved skin IDs.');
