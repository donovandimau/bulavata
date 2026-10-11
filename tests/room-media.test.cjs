const assert=require('node:assert/strict');
const media=require('../room-media.js');
const owner='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const file=(name,bytes,size=bytes.length)=>({name,size,slice:()=>({arrayBuffer:async()=>Uint8Array.from(bytes).buffer})});
(async()=>{
  for(const [name,bytes] of [['song.mp3',[73,68,51]],['song.m4a',[0,0,0,0,102,116,121,112]],['song.ogg',[79,103,103,83]],['song.opus',[79,103,103,83]],['song.wav',[82,73,70,70,0,0,0,0,87,65,86,69]],['cover.jpg',[255,216,255]],['cover.png',[137,80,78,71]],['cover.webp',[82,73,70,70,0,0,0,0,87,69,66,80]]])assert(await media.inspect(file(name,bytes),name.startsWith('song')?'music':'covers'));
  for(const bad of [file('fake.mp3',[60,115,99]),file('script.svg',[60,115,118]),file('song.mp3',[73,68,51],media.limit+1),file('empty.mp3',[])])await assert.rejects(media.inspect(bad,'music'));
  const calls=[];
  const client={storage:{from:bucket=>{assert.equal(bucket,'bv-room-media');return {upload:async(path,file,options)=>{calls.push({path,options});return {data:{path},error:null};},remove:async paths=>{calls.push({remove:paths});return {error:null};},createSignedUrl:async(path,seconds)=>{calls.push({path,seconds});return {data:{signedUrl:'https://example.test/private-signed-track'},error:null};}};}}};
  assert.throws(()=>media.api(client,null),/Sign in/);
  const uploaded=await media.api(client,owner).upload(file('my own track.mp3',[73,68,51]),'music');assert(uploaded.path.startsWith(owner+'/music/'));assert.equal(uploaded.title,'my own track');assert.equal(calls[0].options.upsert,false);assert.equal(calls[0].options.contentType,'audio/mpeg');assert(!uploaded.path.includes('my own'));
  assert.equal(media.path('../secret','music'),'');assert.equal(media.path(owner+'/covers/33333333-3333-4333-8333-333333333333.mp3','covers'),'');
  await assert.rejects(media.api(client,other).remove(uploaded.path),/another room/);
  assert(await media.api(client,owner).remove(uploaded.path));assert.equal(await media.signed(client,uploaded.path,'music'),'https://example.test/private-signed-track');assert.equal(calls.at(-1).seconds,3600);
  const broken={storage:{from:()=>({upload:async()=>({data:null,error:{message:'offline'}}),createSignedUrl:async()=>({data:null,error:{message:'private'}})})}};
  await assert.rejects(media.api(broken,owner).upload(file('song.mp3',[73,68,51]),'music'),/offline/);await assert.rejects(media.signed(broken,uploaded.path,'music'),/private/);
  console.log('PASS: supported media signatures, size/type limits, owner upload paths, private signed playback, ownership checks and connection failures.');
})().catch(error=>{console.error(error);process.exitCode=1;});
