'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const handler=require('../api/guest-call-config.js');
const res=()=>({headers:{},code:null,body:null,setHeader(k,v){this.headers[k]=v},status(c){this.code=c;return this},json(b){this.body=b;return this}});
test('Rejects bad room IDs and other methods',async()=>{
 for(const [q,m,c] of [[{room:'nope'},'GET',400],[{room:'61025000-0000-4000-8000-000000000091'},'POST',405]]){const r=res();await handler({method:m,query:q},r);assert.equal(r.code,c);}
});
test('No relay configured returns direct connection settings',async()=>{
 const r=res();await handler({method:'GET',query:{room:'61025000-0000-4000-8000-000000000091'}},r);
 assert.equal(r.code,200);assert.equal(r.body.relayConfigured,false);assert.match(r.headers['Cache-Control'],/no-store/);
});
