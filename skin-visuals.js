(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SotaSkinVisuals=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const base='/assets/skins/editorial/';
  const image=key=>base+key+'-20261025.webp';
  const categories={Schools:'school',Provinces:'vanua',Places:'vanua','Music & bands':'music',Culture:'heritage','Masi-inspired':'heritage',Celebrations:'memories','Love & Memories':'memories',Island:'vanua',Sport:'school',Dark:'music',Bright:'fresh',Classic:'fresh',Soft:'fresh','New picks':'fresh'};
  const special={'province-ra':'ra','province-nadroga-navosa':'nadroga','memory-childhood-memory':'dalo'};
  const collectionKeys={'school-pride':'school','vanua-islands':'vanua','music-crowd':'music','masi-culture':'heritage','life-memories':'memories','fresh-looks':'fresh'};
  function cover(preset){
    if(!preset)return image('fresh');
    if(special[preset.id])return image(special[preset.id]);
    if(preset.id==='memory-broken-hearted'||preset.id==='studio-ocean'||preset.id==='studio-coral')return preset.coverArt;
    if(preset.look==='masi')return image('heritage');
    if(preset.look==='music')return image('music');
    return image(categories[preset.category]||'fresh');
  }
  function collection(id){return image(collectionKeys[id]||'fresh');}
  function position(preset){return preset?.id==='province-ra'?'65% 35%':preset?.id==='province-nadroga-navosa'?'65% 42%':'60% center';}
  return {cover,collection,position,images:['school','vanua','music','heritage','memories','fresh','ra','nadroga','dalo'].map(image)};
});
