'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const life=require('../life-connections.js');
function store(){const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),map};}
const record={id:'family-1',name:'Mere',category:'family',kind:'Cousin'};
test('a life map starts with every requested branch and no invented people',()=>{
  const graph=life.graphModel([],[]);
  assert.equal(graph.members.length,0);assert.equal(graph.hubs.length,10);assert.equal(graph.edges.length,10);
  for(const name of ['Friends','Family','Teachers','Workmates','School mates','Dog','Cat'])assert(graph.hubs.some(c=>c.name===name));
  assert(graph.hubs.every(c=>c.count===0));assert(graph.edges.every(e=>e.source==='you'));
});
test('guest and signed-in device maps never read or replace one another',()=>{
  const storage=store();life.saveRecords(storage,'',[record]);life.saveRecords(storage,'owner-a',[{...record,id:'cat-1',name:'Pusi',category:'cat'}]);
  assert.equal(life.readRecords(storage,'').records[0].name,'Mere');
  assert.equal(life.readRecords(storage,'owner-a').records[0].name,'Pusi');
  assert.deepEqual(life.readRecords(storage,'owner-b').records,[]);
  assert.notEqual(life.keyFor('guest'),life.keyFor(''));
  assert.notEqual(life.keyFor('a:b'),life.keyFor('a%3Ab'));
});
test('saved records survive a round trip without unrelated private properties',()=>{
  const storage=store();assert(life.saveRecords(storage,'owner',[{...record,email:'private@example.test',notes:'not requested',accepted:true}]));
  assert.deepEqual(life.readRecords(storage,'owner').records,[record]);
  assert(![...storage.map.values()].join('').includes('private@example.test'));
  assert(!life.readRecords(storage,'owner').records[0].accepted);
});
test('storage failures are reported and never described as a successful save',()=>{
  const storage={getItem(){throw Error('blocked');},setItem(){throw Error('full');}};
  assert.deepEqual(life.readRecords(storage,'owner'),{records:[],available:false});
  assert.equal(life.saveRecords(storage,'owner',[record]),false);
  assert.equal(life.saveRecords(null,'owner',[record]),false);
  assert.deepEqual(life.readRecords(null,'owner'),{records:[],available:false});
});
test('malformed or old persisted payload cannot create connections',()=>{
  const storage=store(),key=life.keyFor('owner');
  for(const raw of ['{broken','null','{}','{"version":2,"records":[]}','{"version":1,"records":"wrong"}']){
    storage.setItem(key,raw);assert.deepEqual(life.readRecords(storage,'owner').records,[]);
  }
  storage.setItem(key,JSON.stringify({version:1,records:[null,{name:'No ID',category:'family'},{...record,category:'made-up'},record,record]}));
  assert.deepEqual(life.readRecords(storage,'owner').records,[record]);
});
test('accepted friend identities are deduplicated and always stay in Friends',()=>{
  const graph=life.graphModel([record],[{id:'ana',display_name:'Ana',category:'family',role:'teacher'},{id:'ana',display_name:'Duplicate'},{id:'jo',label:'Jone',handle:'jone',email:'hidden@example.test'}]);
  assert.equal(graph.members.length,3);assert.equal(graph.hubs.find(c=>c.id==='friends').count,2);assert.equal(graph.hubs.find(c=>c.id==='family').count,1);
  assert(graph.members.filter(m=>m.accepted).every(m=>m.category==='friends'&&m.kind==='Accepted Sota Kece friend'));
  assert(!JSON.stringify(graph).includes('hidden@example.test'));
  assert.equal(graph.members.find(m=>m.name==='Jone').handle,'jone');
});
test('free-text roles support every living connection while input remains bounded',()=>{
  const input=[{id:'tree',name:'Grandma’s mango tree',category:'nature',kind:'Mango tree'}, {id:'horse',name:'Spirit',category:'other',kind:'Horse'}, {...record,id:'long',name:'x'.repeat(1000),kind:'k'.repeat(1000)},...Array.from({length:200},(_,i)=>({...record,id:'f'+i}))];
  const records=life.sanitize(input);assert.equal(records.length,120);assert.equal(records[0].kind,'Mango tree');assert.equal(records[1].kind,'Horse');
  assert.equal(records[2].name.length,60);assert.equal(records[2].kind.length,40);
});
test('3D scene contains only connection categories and supplied real members',()=>{
  const graph=life.sceneModel([record],[{id:'ana',display_name:'Ana'}]);
  assert.equal(graph.nodes.length,13);assert.equal(graph.edges.length,12);
  assert(graph.nodes.every(n=>['you','category','person'].includes(n.kind)));
  assert.equal(graph.nodes.filter(n=>n.kind==='person').length,2);
  assert(graph.edges.some(e=>e.source==='family'&&e.target==='member:family-1'));
  assert(graph.edges.some(e=>e.source==='friends'&&e.target==='member:accepted:ana'));
  assert(!graph.edges.some(e=>e.source==='family'&&e.target==='member:accepted:ana'));
  assert.deepEqual(life.sceneModel([],[]).nodes.filter(n=>n.kind==='person'),[]);
});
let JSDOM;try{({JSDOM}=require('jsdom'));}catch(_){}
test('3D workspace keeps real renderer data, category navigation and local editing in sync',{skip:!JSDOM},()=>{
  const fs=require('node:fs'),path=require('node:path');
  const dom=new JSDOM('<main id="app"><div id="life"></div></main>',{url:'https://sotakece.example/',runScripts:'outside-only'}),w=dom.window;
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  let options,disposed=0,rotation,selected,scene;
  w.SotaLifeGraph3D={mount(target,input){options=input;assert(target.matches('[data-slc-graph3d]'));return {update(value){scene=value;},select(id){selected=id;},setMotion(value){rotation=value;},dispose(){disposed++;}};}};
  w.eval(fs.readFileSync(path.join(__dirname,'../life-connections.js'),'utf8'));
  const host=w.document.querySelector('#life'),component=w.SotaLifeConnections.mount(host,{owner:'owner',friends:[{id:'ana',display_name:'Ana'}]});
  assert.equal(host.querySelectorAll('.slc-node,.slc-node-icon,.slc-intro,svg').length,0,'the old illustrated map must not remain under the 3D view');
  assert(scene.nodes.some(n=>n.label==='Ana'&&n.kind==='person'));assert.equal(scene.nodes.filter(n=>n.kind==='person').length,1);
  options.onSelect('family');assert.equal(host.querySelector('[data-slc-filter]').value,'family');assert.equal(selected,'family');
  host.querySelector('[data-slc-add]').click();
  host.querySelector('[name="connectionName"]').value='Mere';host.querySelector('[name="connectionKind"]').value='Cousin';
  host.querySelector('[data-slc-form]').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  assert(scene.nodes.some(n=>n.label==='Mere'&&n.kind==='person'));assert.equal(host.querySelector('[data-slc-branch-name]').textContent,'Family');
  assert(w.localStorage.getItem(w.SotaLifeConnections.keyFor('owner')).includes('Mere'));assert(!w.localStorage.getItem(w.SotaLifeConnections.keyFor('owner')).includes('Ana'));
  const filter=host.querySelector('[data-slc-filter]');filter.value='cat';filter.dispatchEvent(new w.Event('change',{bubbles:true}));
  const search=host.querySelector('[data-slc-search]');search.value='cousin';search.dispatchEvent(new w.Event('input',{bubbles:true}));
  assert(host.querySelector('[data-slc-members]').textContent.includes('Mere'),'search still covers categories outside the current view');
  host.querySelector('[data-slc-motion]').click();assert.equal(rotation,false);
  const edit=host.querySelector('[data-slc-edit]');edit.click();host.querySelector('[data-slc-remove]').click();assert(!scene.nodes.some(n=>n.label==='Mere'));
  component.updateFriends([]);assert(!scene.nodes.some(n=>n.label==='Ana'));
  component.dispose();assert.equal(disposed,1);assert.equal(host.innerHTML,'');dom.window.close();
});
test('a missing 3D renderer leaves an honest accessible connection editor',{skip:!JSDOM},()=>{
  const fs=require('node:fs'),path=require('node:path'),dom=new JSDOM('<div id="life"></div>',{url:'https://sotakece.example/',runScripts:'outside-only'}),w=dom.window;
  w.eval(fs.readFileSync(path.join(__dirname,'../life-connections.js'),'utf8'));
  const host=w.document.querySelector('#life'),component=w.SotaLifeConnections.mount(host);
  assert.match(host.querySelector('[data-slc-graph3d]').textContent,/3D view could not load/);assert.equal(host.querySelectorAll('[data-slc-filter] option').length,10);
  host.querySelector('[data-slc-add]').click();assert.equal(host.querySelector('[data-slc-form]').hidden,false);component.dispose();dom.window.close();
});
