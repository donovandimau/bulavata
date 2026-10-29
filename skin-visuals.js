(function(root,factory){
  const regional=typeof module==='object'&&module.exports?require('./pacific-themes.js'):root.SotaPacificThemes;
  const api=factory(regional);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SotaSkinVisuals=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(regional){
  'use strict';
  const base='/assets/skins/editorial/';
  const image=key=>base+key+'-20261025.webp';
  const categories={Schools:'school',Provinces:'vanua',Places:'vanua','Music & bands':'music',Culture:'heritage','Masi-inspired':'heritage',Celebrations:'memories','Love & Memories':'memories',Island:'vanua',Sport:'school',Dark:'music',Bright:'fresh',Classic:'fresh',Soft:'fresh','New picks':'fresh'};
  const special={'province-ra':'ra','province-nadroga-navosa':'nadroga','memory-childhood-memory':'dalo','school-natabua-high-school':'natabua','school-marist-brothers-high-school':'marist','school-suva-grammar-school':'grammar','school-queen-victoria-school':'qvs','school-adi-cakobau-school':'acs','school-fnu':'fnu','school-usp':'usp'};
  const collectionKeys={'school-pride':'school','vanua-islands':'vanua','music-crowd':'music','masi-culture':'heritage','life-memories':'memories','fresh-looks':'fresh'};
  function cover(preset){
    if(!preset)return image('fresh');
    // The selected photographic cover is final; no vector or old collection
    // image replaces the shared catalogue's actual chosen subject.
    if(regional?.styles[preset.id]&&preset.coverArt===regional.styles[preset.id].coverArt)return preset.coverArt;
    if(special[preset.id])return image(special[preset.id]);
    if(preset.id==='memory-broken-hearted'||preset.id==='studio-ocean'||preset.id==='studio-coral')return preset.coverArt;
    if(preset.look==='masi')return image('heritage');
    if(preset.look==='music')return image('music');
    return image(categories[preset.category]||'fresh');
  }
  function thumbnail(preset){return regional?.styles[preset?.id]?.coverThumb||cover(preset);}
  function collection(id){return regional?.collectionThumbnails[id]||regional?.collectionCovers[id]||image(collectionKeys[id]||'fresh');}
  function position(preset){return regional?.styles[preset?.id]?.coverPosition|| (regional?.styles[preset?.id]?'center':preset?.id==='province-ra'?'65% 35%':preset?.id==='province-nadroga-navosa'?'65% 42%':'60% center');}
  const legacyImages=['school','vanua','music','heritage','memories','fresh','ra','nadroga','dalo','natabua','marist','grammar','qvs','acs','fnu','usp'].map(image);
  return {cover,thumbnail,collection,position,images:regional?regional.images:legacyImages,thumbnails:regional?regional.thumbnails:legacyImages,legacyImages};
});
