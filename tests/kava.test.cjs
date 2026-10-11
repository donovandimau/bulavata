const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const sourceDir=fs.existsSync(path.join(__dirname,'kava.js'))?__dirname:path.join(__dirname,'..');
const core=require(path.join(sourceDir,'kava.js'));
for(const capacity of [4,5,6]){
  assert.equal(core.draft({title:' Wisdom ',topic:' Stories ',crew:2,capacity}).p_title,'Wisdom');
  const circle={capacity};
  const people=Array.from({length:capacity},(_,i)=>({member:'m'+i,seat:i+1}));
  assert.equal(core.seats(circle,people).length,capacity);
  assert.equal(core.nextSeat(circle,people),null);
  assert.equal(core.nextSeat(circle,people.slice(0,-1)),capacity);
}
for(const capacity of [3,7,5.5,'bad'])assert.throws(()=>core.draft({title:'Title',crew:1,capacity}));
for(const title of ['', 'x'.repeat(81)])assert.throws(()=>core.draft({title,crew:1,capacity:6}));
assert.throws(()=>core.draft({title:'Title',crew:1,capacity:6,topic:'x'.repeat(501)}));
for(const currency of core.currencies)for(const minor of core.amounts){
  const tip=core.tipSelection(minor,currency);
  assert(tip.label.includes(currency));assert.equal(tip.available,false);
  assert.equal(tip.fee,null);assert.equal(tip.recipientAmount,null);
}
assert.throws(()=>core.tipSelection(2,'FJD'));
assert.throws(()=>core.tipSelection(200,'USD'));
assert.throws(()=>core.money(NaN,'FJD'));
const calls=[];
const client={rpc:async(name,args)=>{calls.push({name,args});return {data:'circle-id',error:null};},from:table=>({insert:async row=>{calls.push({table,row});return {error:null,data:null};}})};
(async()=>{
  const api=core.api(client);
  assert.equal(await api.create({title:'Kava',crew:1,capacity:4}),'circle-id');
  assert.equal(calls[0].name,'bv_circle_create');
  await api.comment('circle-id','actor',' Bula ');assert.equal(calls[1].row.body,'Bula');
  assert.equal(calls[1].row.author,'actor');assert.equal(calls[1].row.circle_id,'circle-id');
  await assert.rejects(api.comment('circle-id','actor',' '));
  await assert.rejects(api.comment('circle-id','actor','x'.repeat(901)));
  await assert.rejects(core.api({rpc:async()=>({data:null,error:{message:'Connection interrupted'}})}).crews(),/Connection interrupted/);
  new vm.Script(fs.readFileSync(path.join(sourceDir,'kava-ui.js'),'utf8'));
  console.log('PASS: room limits, seat allocation, explicit currency/minor units, unavailable payment handling, atomic create API, comment validation, failure propagation and UI syntax.');
})().catch(err=>{console.error(err);process.exitCode=1;});
