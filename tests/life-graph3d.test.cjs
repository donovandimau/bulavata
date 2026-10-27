'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const graph3d=require('../life-graph3d.js');
const categories=['friends','family','teachers','workmates','schoolmates','dog','cat','pets','nature','other'];
const scene={nodes:[{id:'you',label:'You',color:'#ffffff',kind:'you'},...categories.map(id=>({id,label:id,color:'#37a9f1',kind:'category'})),{id:'member:one',label:'A real entry',color:'#37a9f1',kind:'person'}],edges:[...categories.map(id=>({source:'you',target:id})),{source:'family',target:'member:one'}]};
test('3D layout uses all three axes and clusters only supplied real members',()=>{
  const positions=graph3d.layout(scene);assert.equal(positions.size,12);assert.deepEqual(positions.get('you'),[0,0,0]);
  const zs=categories.map(id=>positions.get(id)[2]);assert(zs.some(z=>z<-.5));assert(zs.some(z=>z>.5));
  const parent=positions.get('family'),member=positions.get('member:one');assert(Math.hypot(...member.map((v,i)=>v-parent[i]))<.8);
  for(const p of positions.values())assert(p.every(Number.isFinite));
  assert.equal(graph3d.layout({nodes:scene.nodes.slice(0,-1),edges:scene.edges}).size,11);
});
test('adding or reordering personal records preserves existing 3D coordinates',()=>{
  const first=graph3d.layout(scene),next=graph3d.layout({...scene,nodes:[...scene.nodes.filter(n=>n.kind!=='person'),{id:'member:two',kind:'person',label:'Other'},scene.nodes.at(-1)],edges:[...scene.edges,{source:'dog',target:'member:two'}]});
  for(const [id,p] of first)assert.deepEqual(next.get(id),p);
});
test('perspective projection and native GPU matrix agree through orbit changes',()=>{
  for(const [yaw,pitch] of [[0,0],[.6,-.3],[-.8,.7]])for(const point of [[1,2,1],[-2,.5,-1],[0,0,0]]){
    const camera={width:320,height:445,yaw,pitch,distance:14},p=graph3d.project(point,camera),m=graph3d.matrix(camera).mvp,v=[...point,1],clip=[0,0,0,0];
    for(let row=0;row<4;row++)for(let col=0;col<4;col++)clip[row]+=m[col*4+row]*v[col];
    assert(Math.abs(p.x-(clip[0]/clip[3]+1)*camera.width/2)<.0001);assert(Math.abs(p.y-(1-clip[1]/clip[3])*camera.height/2)<.0001);
  }
  const near=graph3d.project([1,0,2],{width:400,height:400,yaw:0,pitch:0,distance:9}),far=graph3d.project([1,0,-2],{width:400,height:400,yaw:0,pitch:0,distance:9});
  assert(near.depth<far.depth);assert(near.x>far.x);
});
test('portrait camera fit preserves category sphere visibility while orbiting',()=>{
  const positions=graph3d.layout(scene),width=280,height=445;
  for(let yaw=0;yaw<Math.PI*2;yaw+=.3)for(const id of categories){const p=graph3d.project(positions.get(id),{width,height,yaw,pitch:.2,distance:8.8*Math.max(1,height/width)});assert(p.visible);assert(p.x>0&&p.x<width);assert(p.y>0&&p.y<height);}
});
test('native mesh geometry has sphere surfaces and only supplied graph lines',()=>{
  const geometry=graph3d.buildGeometry(graph3d.normalize(scene),graph3d.layout(scene),'family');
  assert(geometry.spheres instanceof Float32Array);assert.equal(geometry.spheres.length/9,scene.nodes.length*10*16*6);assert.equal(geometry.lines.length/7,scene.edges.length*2);assert.equal(geometry.glows.length/7,scene.nodes.length);
  for(let i=0;i<geometry.spheres.length;i+=9){const n=geometry.spheres.slice(i+3,i+6);assert(Math.abs(Math.hypot(...n)-1)<.00001);}
});
test('untrusted shape cannot introduce duplicate IDs, dangling edges or CSS colours',()=>{
  const result=graph3d.normalize({nodes:[...scene.nodes,scene.nodes[0],{id:'bad',color:'url(https://example.test)',label:'bad'}],edges:[...scene.edges,scene.edges[0],{source:'you',target:'unknown'},{source:'you',target:'you'}]});
  assert.equal(result.nodes.length,13);assert.equal(result.edges.length,11);assert.equal(result.nodes.at(-1).color,'#55b9ff');
});
function glStub(failAt=0){
  const calls={created:{buffer:0,shader:0,program:0},deleted:{buffer:0,shader:0,program:0},draws:[],clearColours:[]};let compiled=0;
  const gl={VERTEX_SHADER:1,FRAGMENT_SHADER:2,COMPILE_STATUS:3,LINK_STATUS:4,ALIASED_POINT_SIZE_RANGE:5,FLOAT:6,ARRAY_BUFFER:7,STATIC_DRAW:8,COLOR_BUFFER_BIT:1,DEPTH_BUFFER_BIT:2,BLEND:10,SRC_ALPHA:11,ONE_MINUS_SRC_ALPHA:12,DEPTH_TEST:13,LINES:14,POINTS:15,TRIANGLES:16,ONE:17,
    createBuffer(){calls.created.buffer++;return {};},deleteBuffer(){calls.deleted.buffer++;},createShader(){calls.created.shader++;return {};},deleteShader(){calls.deleted.shader++;},createProgram(){calls.created.program++;return {};},deleteProgram(){calls.deleted.program++;},getShaderParameter(){compiled++;return compiled!==failAt;},getProgramParameter:()=>true,getParameter:()=>[1,256],getAttribLocation:(p,n)=>n==='aPosition'?0:n==='aNormal'||n==='aColor'?1:2,getUniformLocation:()=>({}),drawArrays(type,start,count){calls.draws.push({type,count});},clearColor(...rgba){calls.clearColours.push(rgba);}};
  for(const name of ['shaderSource','compileShader','attachShader','linkProgram','enableVertexAttribArray','vertexAttribPointer','useProgram','bindBuffer','uniformMatrix4fv','bufferData','viewport','clear','enable','blendFunc','depthMask','disable','uniform1f','uniformMatrix3fv'])gl[name]=()=>{};
  return {gl,calls};
}
test('GPU renderer draws native lines, glows and triangle meshes then releases resources',()=>{
  const {gl,calls}=glStub(),renderer=graph3d.createRenderer(gl);renderer.setData(graph3d.buildGeometry(graph3d.normalize(scene),graph3d.layout(scene),'family'));
  renderer.draw({width:320,height:445,yaw:.3,pitch:-.1,distance:14},480,668);
  assert.deepEqual(calls.draws.map(d=>d.type),[gl.LINES,gl.POINTS,gl.TRIANGLES]);assert(calls.draws.every(d=>d.count>0));assert.deepEqual(calls.clearColours,[[0,0,0,0]]);renderer.dispose();assert.deepEqual(calls.deleted,calls.created);
});
test('partial shader failure releases earlier programs, shaders and buffers',()=>{
  const {gl,calls}=glStub(3);assert.throws(()=>graph3d.createRenderer(gl),/shader/);assert.deepEqual(calls.deleted,calls.created);
});
let JSDOM;try{({JSDOM}=require(process.env.JSDOM_MODULE||'jsdom'));}catch(_){}
test('sphere captions preserve accessible selection, safe names and updates',{skip:!JSDOM},t=>{
  const dom=new JSDOM('<!doctype html><main id="graph"></main>',{pretendToBeVisual:true}),w=dom.window,host=w.document.querySelector('main'),{gl}=glStub(),picks=[];
  t.after(()=>w.close());w.matchMedia=()=>({matches:true});w.HTMLCanvasElement.prototype.getContext=()=>gl;
  w.HTMLElement.prototype.getBoundingClientRect=()=>({width:600,height:520});
  const view=graph3d.mount(host,{...scene,onSelect:id=>picks.push(id),motion:false});
  const family=host.querySelector('.lg3d-label[data-lg3d-pick="family"]'),caption=family.querySelector('.lg3d-caption');
  assert.equal(family.getAttribute('aria-label'),'family, connection category');assert.equal(family.hidden,false);
  caption.click();assert.deepEqual(picks,['family']);assert.equal(family.getAttribute('aria-pressed'),'true');assert.equal(family.querySelector('.lg3d-caption'),caption);
  view.update({...scene,nodes:scene.nodes.map(n=>n.id==='family'?{...n,label:'<img src=x onerror=alert(1)>'}:n)});
  assert.equal(caption.textContent,'<img src=x onerror=alert(1)>');assert.equal(caption.querySelector('img'),null);assert.equal(family.getAttribute('aria-pressed'),'true');
  view.zoom(1.2);assert(Number.isFinite(parseFloat(family.style.top)));view.reset();view.dispose();assert.equal(host.children.length,0);
});
