// Four original, deterministic instrumental sketches. No sampled recordings.
export const ORIGINALS=Object.freeze([
 {id:'lagoon',title:'Sea glass',artist:'Sota Sessions · original instrumental',art:'lagoon',duration:24,bpm:80,notes:[60,64,67,71,67,64,62,67],chords:[[48,55,60],[45,52,57],[53,60,65],[43,50,55]]},
 {id:'gold',title:'The long way home',artist:'Sota Sessions · original instrumental',art:'gold',duration:24,bpm:90,notes:[62,66,69,73,71,69,66,64],chords:[[50,57,62],[47,54,59],[43,50,55],[45,52,57]]},
 {id:'coral',title:'After the rain',artist:'Sota Sessions · original instrumental',art:'coral',duration:24,bpm:76,notes:[57,60,64,67,64,62,60,55],chords:[[45,52,57],[53,60,65],[48,55,60],[43,50,55]]},
 {id:'night',title:'Somewhere, together',artist:'Sota Sessions · original instrumental',art:'night',duration:24,bpm:72,notes:[59,62,66,69,66,64,62,57],chords:[[47,54,59],[43,50,55],[50,57,62],[45,52,57]]}
]);
export function synthesize(track,rate=22050){
 const length=Math.floor(track.duration*rate),samples=new Float32Array(length),beat=60/track.bpm;
 const tone=(midi,start,duration,gain,pluck=false)=>{const f=440*Math.pow(2,(midi-69)/12),begin=Math.floor(start*rate),end=Math.min(length,Math.floor((start+duration)*rate));for(let i=begin;i<end;i++){const t=(i-begin)/rate,env=pluck?Math.exp(-t*3.2):Math.min(t/.35,1)*Math.min((duration-t)/.65,1);samples[i]+=gain*env*(Math.sin(2*Math.PI*f*t)+.2*Math.sin(2*Math.PI*f*2*t))*(.8+.2*Math.sin(t*2));}};
 for(let bar=0;bar*beat*4<track.duration;bar++){const start=bar*beat*4;track.chords[bar%4].forEach(n=>tone(n,start,beat*4+.35,.045));tone(track.chords[bar%4][0]-12,start,beat*3.8,.07);for(let step=0;step<4;step++)tone(track.notes[(bar*2+step)%8]+12,start+step*beat,beat*1.7,.085,true);}
 // Soft original brushed pulses, deterministic noise, never microphone input.
 let noise=98765;for(let b=0;b*beat<track.duration;b++){const begin=Math.floor(b*beat*rate);for(let i=0;i<rate*.09&&begin+i<length;i++){noise=(noise*1664525+1013904223)>>>0;samples[begin+i]+=((noise/4294967296)*2-1)*Math.exp(-i/(rate*.019))*.024;}}
 const bytes=new ArrayBuffer(44+length*2),view=new DataView(bytes),write=(at,s)=>{for(let i=0;i<s.length;i++)view.setUint8(at+i,s.charCodeAt(i));};write(0,'RIFF');view.setUint32(4,36+length*2,true);write(8,'WAVE');write(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);write(36,'data');view.setUint32(40,length*2,true);
 for(let i=0;i<length;i++){const fade=Math.min(i/(rate*.3),(length-i)/(rate*1.2),1);view.setInt16(44+i*2,Math.max(-1,Math.min(1,samples[i]*fade))*32767,true);}return bytes;
}
export class Player{
 constructor(audio,changed){this.audio=audio;this.changed=changed;this.track=null;this.queue=[...ORIGINALS];this.urls=new Map();this.repeat=false;this.attempt=0;this.error='';this.volume=.55;audio.volume=this.volume;for(const e of ['play','pause','loadedmetadata','timeupdate','volumechange','ended','error'])audio.addEventListener(e,()=>{if(e==='ended'){if(this.repeat){audio.currentTime=0;this.play(this.track);}else this.next(1);}if(e==='error')this.error='This track could not play. Try another song.';changed();});}
 async play(track){if(!track)return;const n=++this.attempt;this.error='';if(track.id!==this.track?.id||this.audio.error){this.audio.pause();this.track=track;let url=track.url;if(!url){url=this.urls.get(track.id);if(!url){url=URL.createObjectURL(new Blob([synthesize(track)],{type:'audio/wav'}));this.urls.set(track.id,url);}}this.audio.src=url;}this.changed();try{await this.audio.play();if(n!==this.attempt)return;}catch{if(n===this.attempt)this.error='Playback paused. Tap play to try again.';}this.changed();}
 toggle(){if(this.audio.paused)this.play(this.track||this.queue[0]);else{this.attempt++;this.audio.pause();}}
 next(direction){const i=this.queue.findIndex(t=>t.id===this.track?.id);this.play(this.queue[(i+direction+this.queue.length)%this.queue.length]);}
 seek(value){if(Number.isFinite(this.audio.duration))this.audio.currentTime=Math.min(this.audio.duration,Math.max(0,Number(value)));}
 setVolume(value){this.audio.volume=Math.max(0,Math.min(1,Number(value)));}
 stop(){this.attempt++;this.audio.pause();}
 destroy(){this.stop();this.urls.forEach(url=>URL.revokeObjectURL(url));this.urls.clear();}
}
