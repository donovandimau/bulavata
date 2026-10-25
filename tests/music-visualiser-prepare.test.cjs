'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../music-visualiser.js'),'utf8');
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function harness(options={}){
 const calls={contexts:[],resumes:0,sources:[],closed:0,disconnected:0,events:[]};
 class AudioContext{
  constructor(){this.state='suspended';this.destination={type:'speaker'};this.sampleRate=48000;calls.contexts.push(this);calls.events.push('context');}
  resume(){calls.resumes++;calls.events.push('resume');return options.resume?options.resume(this):Promise.resolve().then(()=>{this.state='running';});}
  createAnalyser(){calls.events.push('analyser');return {frequencyBinCount:1024,fftSize:2048,getByteFrequencyData(){},getByteTimeDomainData(){}};}
  createMediaElementSource(audio){const source={audio,connections:[],connect(target){this.connections.push(target);},disconnect(){calls.disconnected++;}};calls.events.push('source');calls.sources.push(source);return source;}
  close(){calls.closed++;this.state='closed';}
 }
 if(options.noResume)AudioContext.prototype.resume=undefined;
 const root=vm.createContext({module:{exports:{}},location:{origin:'https://fixture.invalid',href:'https://fixture.invalid/'},URL,DOMException,
  ...(options.unsupported?{}:{AudioContext})});
 vm.runInContext(source,root,{filename:'music-visualiser.js'});
 return {api:root.module.exports,calls,root};
}
function audio(src='https://fixture.invalid/music.mp3',crossOrigin=''){
 return {currentSrc:src,crossOrigin,getAttribute(name){return name==='src'?this.currentSrc:null;}};
}
function untouched(calls){assert.equal(calls.sources.length,0);assert.equal(calls.closed,0);assert.equal(calls.disconnected,0);}

test('prepare resumes the context before creating the source and uses one speaker route',async()=>{
 const wait=deferred(),h=harness({resume:async context=>{await wait.promise;context.state='running';}}),media=Object.freeze(audio());
 const pending=h.api.prepare(media);assert.equal(h.calls.contexts.length,1);assert.equal(h.calls.resumes,1);untouched(h.calls);
 wait.resolve();const graph=await pending;
 assert.equal(graph.context,h.calls.contexts[0]);assert.equal(h.calls.sources.length,1);
 assert.ok(h.calls.events.indexOf('resume')<h.calls.events.indexOf('source'));
 assert.deepEqual(graph.source.connections,[graph.context.destination,graph.analyser]);
 assert.equal(graph.source.connections.filter(target=>target===graph.context.destination).length,1);
 assert.equal(await h.api.prepare(media),graph);assert.equal(h.calls.sources.length,1);
 assert.equal(h.calls.closed,0);assert.equal(h.calls.disconnected,0);
});

test('concurrent prepares share the context, cached graph and single speaker connection',async()=>{
 const wait=deferred(),h=harness({resume:async context=>{await wait.promise;context.state='running';}}),media=audio();
 const first=h.api.prepare(media),second=h.api.prepare(media);
 assert.equal(h.calls.contexts.length,1);assert.equal(h.calls.sources.length,0);
 wait.resolve();const [a,b]=await Promise.all([first,second]);
 assert.equal(a,b);assert.equal(h.calls.sources.length,1);assert.equal(a.source.connections.length,2);
});

test('different media share the context while each gets exactly one cached graph',async()=>{
 const h=harness(),first=audio(),second=audio('blob:https://fixture.invalid/track');
 const [a,b]=await Promise.all([h.api.prepare(first),h.api.prepare(second)]);
 assert.notEqual(a,b);assert.equal(a.context,b.context);assert.equal(h.calls.sources.length,2);assert.equal(h.calls.contexts.length,1);
 assert.equal(a.source.connections.filter(target=>target===a.context.destination).length,1);
 assert.equal(b.source.connections.filter(target=>target===b.context.destination).length,1);
});

test('the existing audioGraph API still creates its graph synchronously and prepare reuses it',async()=>{
 const h=harness(),media=audio(),existing=h.api.audioGraph(media);
 assert.equal(h.calls.sources.length,1);assert.equal(h.calls.resumes,0);assert.equal(existing.context.state,'suspended');
 assert.equal(await h.api.prepare(media),existing);assert.equal(existing.context.state,'running');assert.equal(h.calls.sources.length,1);
 assert.equal(h.calls.closed,0);assert.equal(h.calls.disconnected,0);
});

test('pre-aborted signals reject with their reason without even constructing a context',async()=>{
 const h=harness(),controller=new AbortController(),reason=Error('cancelled before attachment');controller.abort(reason);
 await assert.rejects(h.api.prepare(audio(),{signal:controller.signal}),error=>error===reason);
 assert.equal(h.calls.contexts.length,0);assert.equal(h.calls.resumes,0);untouched(h.calls);
});

test('abort while resume is pending cannot create a source or reroute native audio',async()=>{
 const wait=deferred(),h=harness({resume:async context=>{await wait.promise;context.state='running';}}),controller=new AbortController(),reason=Error('hero replaced');
 const pending=h.api.prepare(audio(),{signal:controller.signal});controller.abort(reason);wait.resolve();
 await assert.rejects(pending,error=>error===reason);untouched(h.calls);
});

test('one aborted concurrent caller cannot stop another valid caller or create an extra graph',async()=>{
 const wait=deferred(),h=harness({resume:async context=>{await wait.promise;context.state='running';}}),controller=new AbortController(),media=audio();
 const cancelled=h.api.prepare(media,{signal:controller.signal}),valid=h.api.prepare(media);controller.abort();wait.resolve();
 await assert.rejects(cancelled,error=>error.name==='AbortError');await valid;
 assert.equal(h.calls.sources.length,1);assert.equal(h.calls.closed,0);assert.equal(h.calls.disconnected,0);
});

test('resume rejection and a still-suspended resolved context leave native audio untouched',async()=>{
 const reason=Error('resume denied'),denied=harness({resume:()=>Promise.reject(reason)});
 await assert.rejects(denied.api.prepare(audio()),error=>error===reason);untouched(denied.calls);
 const suspended=harness({resume:()=>Promise.resolve()});
 await assert.rejects(suspended.api.prepare(audio()),/could not start/);untouched(suspended.calls);
});

test('unsupported WebAudio or resume never creates a MediaElementSource',async()=>{
 const noAudio=harness({unsupported:true});await assert.rejects(noAudio.api.prepare(audio()),/unavailable/);assert.equal(noAudio.calls.contexts.length,0);untouched(noAudio.calls);
 const noResume=harness({noResume:true});await assert.rejects(noResume.api.prepare(audio()),/unavailable/);untouched(noResume.calls);
});

test('ineligible CORS source is rejected before constructing a context; eligible remote stays unchanged',async()=>{
 const h=harness(),remote=Object.freeze(audio('https://remote.invalid/track.mp3'));
 await assert.rejects(h.api.prepare(remote),/does not support/);assert.equal(h.calls.contexts.length,0);untouched(h.calls);
 const eligible=Object.freeze(audio('https://remote.invalid/track.mp3','anonymous'));
 const graph=await h.api.prepare(eligible);assert.equal(graph.source.audio,eligible);assert.equal(eligible.crossOrigin,'anonymous');
});

test('source eligibility is rechecked after resume before any graph is created',async()=>{
 const wait=deferred(),h=harness({resume:async context=>{await wait.promise;context.state='running';}}),media=audio();
 const pending=h.api.prepare(media);media.currentSrc='https://remote.invalid/no-cors.mp3';wait.resolve();
 await assert.rejects(pending,/does not support/);untouched(h.calls);
});

test('a failed prepare on an existing graph never disconnects or closes its speaker route',async()=>{
 const reason=Error('resume denied'),h=harness({resume:()=>Promise.reject(reason)}),media=audio(),existing=h.api.audioGraph(media);
 await assert.rejects(h.api.prepare(media),error=>error===reason);
 assert.equal(h.calls.sources.length,1);assert.equal(existing.source.connections.length,2);
 assert.equal(h.calls.closed,0);assert.equal(h.calls.disconnected,0);
});
