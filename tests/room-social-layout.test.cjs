'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','room-social-layout.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'..','room-social.css'),'utf8');
const slots={desktop:{natural:[1360,832],frame:[1360,768],wall:[638,518,344,186],mates:[993,470,300,252],waveY:724},mobile:{natural:[1008,1896],frame:[1008,1792],wall:[120,1275,779,218],mates:[120,1501,779,235],waveY:1766}};
function fixture(){
  const frames=new Map(),resizeObservers=[],mutationObservers=[];
  let nextFrame=1;
  const events=()=>({listeners:new Map(),addEventListener(name,fn){if(!this.listeners.has(name))this.listeners.set(name,new Set());this.listeners.get(name).add(fn);},removeEventListener(name,fn){this.listeners.get(name)?.delete(fn);},emit(name){for(const fn of this.listeners.get(name)||[])fn();}});
  const style=()=>({setProperty(name,value){this[name]=String(value);}});
  const panels={wall:{style:style()},mates:{style:style()}};
  const host={style:style(),dataset:{},isConnected:true,querySelector(selector){return selector.includes('"wall"')?panels.wall:panels.mates;}};
  const image=Object.assign(events(),{currentSrc:'https://example.test/assets/front-reference-brand.jpg',src:'https://example.test/assets/front-reference-brand.jpg',naturalWidth:1360,naturalHeight:832,isConnected:true,closest(){return artwork;},getBoundingClientRect(){return f.rect;}});
  const artwork={contains(node){return node===host&&host.isConnected;},getBoundingClientRect(){return f.rect;}};
  const parent={querySelector(selector){return selector.includes('sota-social-host')?host:image;}};
  const root=Object.assign(events(),{
    document:{getElementById(){return parent;}},
    requestAnimationFrame(fn){const id=nextFrame++;frames.set(id,fn);return id;},
    cancelAnimationFrame(id){frames.delete(id);},
    ResizeObserver:class{constructor(callback){this.callback=callback;this.disconnected=false;resizeObservers.push(this);}observe(){}disconnect(){this.disconnected=true;}},
    MutationObserver:class{constructor(callback){this.callback=callback;this.disconnected=false;mutationObservers.push(this);}observe(){}disconnect(){this.disconnected=true;}}
  });
  const f={root,parent,host,image,panels,frames,resizeObservers,mutationObservers,rect:{left:17,top:29,width:1360,height:768},setFrame(width,mode){const shape=slots[mode];this.rect={left:17,top:29,width,height:width*shape.frame[1]/shape.frame[0]};},setImage(mode){const shape=slots[mode];image.naturalWidth=shape.natural[0];image.naturalHeight=shape.natural[1];image.currentSrc='https://example.test/assets/'+(mode==='mobile'?'mobile-':'')+'front-reference-brand.jpg';},flush(){const tasks=[...frames.values()];frames.clear();tasks.forEach(fn=>fn(0));},listenerCount(node){return [...node.listeners.values()].reduce((total,set)=>total+set.size,0);}};
  vm.runInNewContext(source,root,{timeout:1000});
  f.api=root.SotaRoomSocialLayout;return f;
}
function close(actual,expected){assert(Math.abs(parseFloat(actual)-expected)<.002,actual+' ~= '+expected);}
function checkGeometry(f,mode){
  const slot=slots[mode],scale=Math.min(f.rect.width/slot.natural[0],f.rect.height/slot.natural[1]);
  const left=(f.rect.width-slot.natural[0]*scale)/2,top=(f.rect.height-slot.natural[1]*scale)/2;
  assert.equal(f.host.dataset.socialLayout,mode);
  close(f.host.style['--sota-source-scale'],scale);
  for(const name of ['wall','mates']){const [x,y,w,h]=slot[name],style=f.panels[name].style;close(style.left,left+x*scale);close(style.top,top+y*scale);close(style.width,w*scale);close(style.height,h*scale);assert(parseFloat(style.left)>=0);assert(parseFloat(style.top)>=0);assert(parseFloat(style.left)+parseFloat(style.width)<=f.rect.width+.002);assert(parseFloat(style.top)+parseFloat(style.height)<top+slot.waveY*scale);}
}
test('default mount fits desktop source inside the existing letterboxed frame',()=>{const f=fixture();f.api.mount();checkGeometry(f,'desktop');f.api.stop();});
test('geometry remains bounded at 1440/1000/761 desktop and 760/390/320 phone widths',()=>{const f=fixture();f.api.mount(f.parent);for(const [mode,widths] of [['desktop',[1440,1000,761]],['mobile',[760,390,320]]])for(const width of widths){f.setFrame(width,mode);f.setImage(mode);f.image.emit('load');f.flush();checkGeometry(f,mode);for(const panel of Object.values(f.panels))assert(parseFloat(panel.style.height)>=44);}f.api.stop();});
test('source switching uses drawn natural dimensions instead of premature currentSrc',()=>{const f=fixture();f.api.mount(f.parent);f.setFrame(320,'mobile');f.image.currentSrc='https://example.test/assets/mobile-front-reference-brand.jpg';f.root.emit('resize');f.flush();checkGeometry(f,'desktop');f.setImage('mobile');f.image.emit('load');f.flush();checkGeometry(f,'mobile');f.api.stop();});
test('initial opaque CSS masks remain available before natural dimensions load',()=>{const f=fixture();f.image.naturalWidth=f.image.naturalHeight=0;f.api.mount(f.parent);assert.equal(f.panels.wall.style.left,undefined);for(const text of ['left:47.14932127%','top:62.25961538%','left:71.24434389%','top:56.49038462%','left:13.99437412%','top:67.24683544%','top:79.16666667%','display:none!important','@media(forced-colors:active)'])assert(css.includes(text));const block=css.match(/\.sota-social-host\.sota-social-hero button\.sota-social-panel\{([^}]+)\}/)[1];assert(block.includes('background:linear-gradient(125deg,#e7d0bb,#c1d6d0)'));assert(!/#[a-f\d]{8}\b|rgba\(/i.test(block));f.api.stop();});
test('resize callbacks coalesce and stop removes listeners, frames and observers',()=>{const f=fixture();f.api.mount(f.parent);f.root.emit('resize');f.resizeObservers[0].callback();assert.equal(f.frames.size,1);f.api.stop();assert.equal(f.frames.size,0);assert.equal(f.listenerCount(f.root),0);assert.equal(f.listenerCount(f.image),0);assert(f.resizeObservers.every(observer=>observer.disconnected));assert(f.mutationObservers.every(observer=>observer.disconnected));});
test('a stale disposer cannot stop a newer mount, and detachment cleans it up',()=>{const f=fixture();const oldDispose=f.api.mount(f.parent);f.api.mount(f.parent);oldDispose();assert.equal(f.listenerCount(f.root),1);assert.equal(f.resizeObservers[1].disconnected,false);f.host.isConnected=false;f.mutationObservers[1].callback();assert.equal(f.listenerCount(f.root),0);assert.equal(f.resizeObservers[1].disconnected,true);assert.equal(f.mutationObservers[1].disconnected,true);});
