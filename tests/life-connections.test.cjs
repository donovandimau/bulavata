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
test('portrait hub geometry remains stable and keeps large target centres apart',()=>{
  const first=life.positions();assert.deepEqual(first,life.positions());assert.deepEqual(first.you,{x:50,y:50});
  const width=280,height=400;
  for(const c of life.CATEGORIES){const p=first[c.id];assert(p.x>=18&&p.x<=82&&p.y>=10&&p.y<=90);}
  const ps=life.CATEGORIES.map(c=>first[c.id]);
  for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++)assert(Math.hypot((ps[i].x-ps[j].x)*width/100,(ps[i].y-ps[j].y)*height/100)>=44);
});
