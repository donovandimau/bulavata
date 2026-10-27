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
test('large captions stay within a phone graph and avoid nearby names and view controls',()=>{
  const width=320,height=445,w=170,h=34,placed=[];
  for(const point of [{x:8,y:25,radius:18},{x:15,y:30,radius:18},{x:300,y:425,radius:22},{x:300,y:10,radius:18}]){
    const result=graph3d.placeCaption(point,{width,height,w,h},placed,[point]);
    assert(result.x-w/2>=5&&result.x+w/2<=width-5);
    assert(result.y-h/2>=5&&result.y+h/2<=height-10);
    for(const other of placed)assert(Math.abs(result.x-other.x)>=(w+other.w)/2||Math.abs(result.y-other.y)>=(h+other.h)/2);
    placed.push({...result,w,h});
  }
});
test('phone category names remain separate as the graph turns',()=>{
  const labels=['Friends','Family','Teachers','Workmates','School mates','Dog','Cat','Other pets','Nature','Other connections'];
  const nodes=[{id:'you',label:'You',kind:'you'},...categories.map((id,i)=>({id,label:labels[i],kind:'category'}))],positions=graph3d.layout({nodes});
  for(let yaw=0;yaw<Math.PI*2;yaw+=.25){
    const width=326,height=445,projected=nodes.map(n=>({n,...graph3d.project(positions.get(n.id),{width,height,yaw,pitch:-.08,distance:8.8*height/width})})).sort((a,b)=>a.depth-b.depth),placed=[];
    const spheres=projected.map(p=>({...p,radius:(p.n.kind==='you'?.44:.32)*(p.n.id==='friends'?1.22:1)*height/(2*Math.tan(.7/2)*p.depth)}));
    for(const p of spheres){
      const w=Math.min(p.n.kind==='you'?84:180,Math.max(60,p.n.label.length*8+28)),h=34,r=graph3d.placeCaption(p,{width,height,w,h},placed,spheres);
      for(const other of placed)assert(Math.abs(r.x-other.x)>=(w+other.w)/2||Math.abs(r.y-other.y)>=(h+other.h)/2,`overlap at yaw ${yaw}: ${p.n.label}`);
      assert(r.y+h/2<=height-10);placed.push({...r,w,h});
    }
  }
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
  for(const selector of ['.lg3d-background','.lg3d-controls','.lg3d-state'])assert.equal(host.querySelector(selector).closest('.lg3d-stage'),null,'controls and instructions stay outside the canvas');
  const family=host.querySelector('.lg3d-label[data-lg3d-pick="family"]'),caption=family.querySelector('.lg3d-caption');
  assert.equal(family.getAttribute('aria-label'),'family, connection category');assert.equal(family.hidden,false);
  caption.click();assert.deepEqual(picks,['family']);assert.equal(family.getAttribute('aria-pressed'),'true');assert.equal(family.querySelector('.lg3d-caption'),caption);
  view.update({...scene,nodes:scene.nodes.map(n=>n.id==='family'?{...n,label:'<img src=x onerror=alert(1)>'}:n)});
  assert.equal(caption.textContent,'<img src=x onerror=alert(1)>');assert.equal(caption.querySelector('img'),null);assert.equal(family.getAttribute('aria-pressed'),'true');
  view.zoom(1.2);assert(Number.isFinite(parseFloat(family.style.top)));view.reset();view.dispose();assert.equal(host.children.length,0);
});

test('drag projection follows the pointer at any camera angle without changing depth',()=>{
  for(const [yaw,pitch] of [[0,0],[.6,-.3],[-.8,.7]])for(const width of [320,900]){
    const camera={width,height:520,yaw,pitch,distance:14},point=[1,2,-1],before=graph3d.project(point,camera),after=graph3d.project(graph3d.moveInView(point,80,-35,camera),camera);
    assert(Math.abs(after.x-before.x-80)<1e-8);assert(Math.abs(after.y-before.y+35)<1e-8);assert(Math.abs(after.depth-before.depth)<1e-8);
  }
});
test('node pointer drag survives updates, ignores other pointers, and reset restores layout',{skip:!JSDOM},t=>{
  const dom=new JSDOM('<main></main>',{pretendToBeVisual:true}),w=dom.window,host=w.document.querySelector('main'),{gl}=glStub(),picks=[];
  t.after(()=>w.close());w.matchMedia=()=>({matches:true});w.HTMLCanvasElement.prototype.getContext=()=>gl;
  w.HTMLElement.prototype.getBoundingClientRect=()=>({width:600,height:520,left:0,top:0});
  const view=graph3d.mount(host,{...scene,motion:false,onSelect:id=>picks.push(id)}),stage=host.querySelector('.lg3d-stage'),label=host.querySelector('[data-lg3d-labels] [data-lg3d-pick="you"]');
  const send=(target,type,x,y,id=1)=>{const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{clientX:x,clientY:y,button:0,pointerId:id,pointerType:'touch'});target.dispatchEvent(e);};
  const original=parseFloat(label.style.left);send(label,'pointerdown',300,260);send(stage,'pointermove',380,260,2);assert.equal(parseFloat(label.style.left),original);
  send(stage,'pointermove',380,260);assert(Math.abs(parseFloat(label.style.left)-original-80)<.001);send(stage,'pointerup',380,260);label.click();assert.deepEqual(picks,[]);
  view.update({...scene,nodes:scene.nodes.map(n=>({...n,label:n.label+'!'}))});assert(Math.abs(parseFloat(label.style.left)-original-80)<.001);
  view.reset();assert.equal(parseFloat(label.style.left),original);
  send(label,'pointerdown',300,260);send(stage,'pointercancel',300,260);assert.equal(stage.classList.contains('lg3d-dragging'),false);view.dispose();
});

test('node layout restores across visits, isolates owners and Reset removes the saved layout',{skip:!JSDOM},t=>{
  const dom=new JSDOM('<main></main>',{pretendToBeVisual:true,url:'https://sotakece.example'}),w=dom.window,host=w.document.querySelector('main'),{gl}=glStub();
  t.after(()=>w.close());w.matchMedia=()=>({matches:true});w.HTMLCanvasElement.prototype.getContext=()=>gl;w.HTMLElement.prototype.getBoundingClientRect=()=>({width:600,height:520,left:0,top:0});
  const key='layout:account:a',storage=w.localStorage;
  const mount=(storageKey=key)=>graph3d.mount(host,{...scene,motion:false,storage,storageKey});
  const label=()=>host.querySelector('.lg3d-label[data-lg3d-pick="you"]');
  const send=(target,type,x,y)=>{const e=new w.Event(type,{bubbles:true,cancelable:true});Object.assign(e,{button:0,pointerId:1,clientX:x,clientY:y});target.dispatchEvent(e);};
  let view=mount(),initial=label().style.left;
  send(label(),'pointerdown',300,260);send(host.querySelector('.lg3d-stage'),'pointermove',390,300);send(host.querySelector('.lg3d-stage'),'pointerup',390,300);
  const moved=[label().style.left,label().style.top];assert.notEqual(moved[0],initial);assert(storage.getItem(key));
  view.dispose();view=mount();assert.deepEqual([label().style.left,label().style.top],moved);view.dispose();
  for(const other of ['layout:guest','layout:account:b']){view=mount(other);assert.equal(label().style.left,initial);view.dispose();}
  view=mount();view.reset();assert.equal(storage.getItem(key),null);view.dispose();view=mount();assert.equal(label().style.left,initial);view.dispose();
});
test('invalid and unavailable layout storage never breaks the graph',{skip:!JSDOM},t=>{
  const dom=new JSDOM('<main></main>',{pretendToBeVisual:true}),w=dom.window,host=w.document.querySelector('main'),{gl}=glStub();
  t.after(()=>w.close());w.matchMedia=()=>({matches:true});w.HTMLCanvasElement.prototype.getContext=()=>gl;w.HTMLElement.prototype.getBoundingClientRect=()=>({width:600,height:520,left:0,top:0});
  for(const raw of ['{broken',JSON.stringify({version:8,positions:[['you',[1,1,1]]]}),JSON.stringify({version:1,positions:[['missing',[1,2,3]],['you',[null,2,3]],['you',[999,0,0]]],camera:{yaw:0,pitch:0,distance:1}})]){
    const view=graph3d.mount(host,{...scene,motion:false,storageKey:'test',storage:{getItem:()=>raw}});assert.equal(host.querySelector('.lg3d-label[data-lg3d-pick="you"]').style.left,'300px');view.dispose();
  }
  const view=graph3d.mount(host,{...scene,motion:false,storageKey:'test',storage:{getItem(){throw Error('denied');},removeItem(){throw Error('denied');}}});
  assert.match(host.querySelector('[role="status"]').textContent,/temporary/);view.reset();assert.match(host.querySelector('[role="status"]').textContent,/temporary/);view.dispose();
});
