'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const c=require('../connections.js');
const me={id:'me',handle:'owner',display_name:'Owner'};
const friends=[{id:'a',handle:'ana',display_name:'Ana'},{id:'b',handle:'jone',display_name:'Jone'}];
const crews=[{id:1,name:'Village'},{id:2,name:'Stories'}];
let passed=0;
async function check(name,fn){await fn();passed++;console.log('PASS',name);}
function client({fr=friends,gr=crews,members=[],rpcError=false,memberError=false}={}){
  const calls=[];
  return {calls,rpc:async name=>{calls.push({rpc:name});return {data:name==='bv_my_friends'?fr:gr,error:rpcError?{}:null};},
    from(table){const call={table,filters:{}};calls.push(call);return {select(columns){call.columns=columns;return this;},in(key,values){call.filters[key]=values;return this;},async range(start,end){call.range=[start,end];return {data:members.slice(start,end+1),error:memberError?{}:null};}};}};
}
(async()=>{
  await check('only accepted-friend and own-Koro IDs can create membership edges',()=>{
    const g=c.model(me,friends,crews,[{member:'a',crew_id:1},{member:'stranger',crew_id:1},{member:'a',crew_id:999},{member:'me',crew_id:1}]);
    assert.equal(g.nodes.length,5);assert.equal(g.edges.length,5);assert(!JSON.stringify(g).includes('stranger'));assert(!JSON.stringify(g).includes('999'));
    assert(!g.edges.some(e=>e.source==='person:a'&&e.target==='person:b'));
    assert.deepEqual(c.path(g,'group:1'),['person:me','group:1']);assert.deepEqual(c.path(g,'unknown'),[]);
  });
  await check('duplicate records never multiply nodes or membership edges',()=>{
    const g=c.model(me,[...friends,...friends],[...crews,...crews],[{member:'a',crew_id:1},{member:'a',crew_id:1}]);
    assert.equal(g.nodes.length,5);assert.equal(g.edges.length,5);
  });
  await check('query is constrained on both sides and carries no private profile fields',async()=>{
    const api=client({members:[{member:'a',crew_id:1}]});const r=await c.load(api,{user:me,me});
    assert.equal(r.graph.edges.length,5);assert.equal(api.calls.length,3);
    const q=api.calls[2];assert.equal(q.table,'bv_crew_members');assert.equal(q.columns,'crew_id,member');
    assert.deepEqual(q.filters,{crew_id:[1,2],member:['a','b']});assert.deepEqual(q.range,[0,999]);
    assert(!Object.keys(r.graph.nodes[0]).some(x=>['email','age_band','join_code'].includes(x)));
  });
  await check('signed-out read fails before querying',async()=>{
    const api=client();await assert.rejects(c.load(api,{user:null,me:null}),/Sign in/);assert.equal(api.calls.length,0);
  });
  await check('RPC errors fail closed rather than showing a false empty community',async()=>{
    await assert.rejects(c.load(client({rpcError:true}),{user:me,me}),/could not be loaded/);
  });
  await check('membership permission failure gives an explicit partial view',async()=>{
    const r=await c.load(client({memberError:true}),{user:me,me});assert.equal(r.graph.edges.length,4);assert.match(r.notices[0],/unavailable/);
  });
  await check('empty network needs no membership query',async()=>{
    const api=client({fr:[],gr:[]});const r=await c.load(api,{user:me,me});assert.equal(r.graph.nodes.length,1);assert.equal(r.graph.edges.length,0);assert.equal(api.calls.length,2);
  });
  await check('truncation is explicit and queries only the bounded graph',async()=>{
    const api=client({fr:Array.from({length:130},(_,i)=>({id:String(i)})),gr:Array.from({length:45},(_,i)=>({id:i}))});
    const r=await c.load(api,{user:me,me});assert.equal(r.graph.nodes.length,161);assert.match(r.notices[0],/120/);assert.equal(api.calls[2].filters.member.length,120);assert.equal(api.calls[2].filters.crew_id.length,40);
    const positions=c.layout(r.graph);assert.equal(positions.size,161);for(const p of positions.values())assert(Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=900&&p.y>=0&&p.y<=620);
  });
  await check('membership pagination includes records beyond the API default page',async()=>{
    const api=client({members:[...Array.from({length:1000},()=>({member:'a',crew_id:1})),{member:'b',crew_id:2}]});
    const r=await c.load(api,{user:me,me});assert.equal(r.graph.edges.length,6);assert.deepEqual(api.calls[3].range,[1000,1999]);
  });
  await check('example is a connected fictional graph and carries no contact records',()=>{
    const r=c.example();assert.equal(r.graph.nodes.length,10);assert.equal(r.graph.edges.length,18);assert.equal(r.updated,null);
    for(const n of r.graph.nodes)assert(c.path(r.graph,n.id).length);
  });
  await check('app integration preserves existing routes and adds no remote graph dependency',()=>{
    const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');assert.match(html,/SotaConnections\.init/);assert.match(fs.readFileSync(path.join(__dirname,'../skin-studio.js'),'utf8'),/SotaConnections\.preview\(\).*Connections/);assert.match(html,/go\('connections'\)/);assert.match(html,/if\(S.tab==="connections"\)/);
    const js=fs.readFileSync(path.join(__dirname,'../connections.js'),'utf8');assert(!/localStorage|sessionStorage|service_role/.test(js));
    const sw=fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8');assert.match(sw,/const CACHE='sota-kece-shell-\d{8}-v\d+-[a-z-]+';/);assert.match(sw,/'\/connections.js'/);
  });
  await check('public example opens before any session or member lookup',async()=>{
    const vm=require('node:vm');const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
    const source=html.slice(html.indexOf('async function boot(){'),html.indexOf('/* Signed in, but no room yet.'));
    let examples=0,queries=0;const context=vm.createContext({location:{hash:'#connections=example'},window:{SotaConnections:{preview(){examples++;}}},sb:{auth:{getSession(){queries++;throw Error('Example must not look up a session');}}}});
    vm.runInContext(source+';this.openExample=boot;',context);await context.openExample();assert.equal(examples,1);assert.equal(queries,0);
  });
  console.log(`${passed} Connections checks passed`);
})().catch(err=>{console.error(err);process.exitCode=1;});
