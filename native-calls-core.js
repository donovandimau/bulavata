(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DimauNativeCallsCore=api;})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const terminal=new Set(['declined','busy','missed','left','kicked','rejected']);
 function mode(value){return value==='video'?'video':'audio';}
 function mine(snapshot,user){return snapshot?.participants?.find(p=>p.member===user)||null;}
 function joined(snapshot,user,device){const p=mine(snapshot,user);return !!p&&p.state==='joined'&&p.device_id===device&&snapshot.call.status!=='ended';}
 function incoming(calls,user){return (calls||[]).filter(c=>c.host!==user&&c.my_state==='ringing'&&c.status!=='ended'&&Date.parse(c.ring_expires_at)>Date.now());}
 function peers(snapshot,user){return (snapshot?.participants||[]).filter(p=>p.member!==user&&p.state==='joined');}
 function readableState(value){return ({ringing:'Ringing',waiting:'Waiting for host',joined:'In the call',declined:'Declined',busy:'Busy',missed:'Missed',left:'Left',kicked:'Removed',rejected:'Not admitted'})[value]||'Connecting';}
 function toSignal(kind,payload){if(kind==='offer'||kind==='answer')return {type:'description',payload};if(kind==='ice')return {type:'ice',payload};throw Error('Unsupported signal');}
 function fromSignal(signal){if(signal.type==='description'&&['offer','answer'].includes(signal.payload?.type))return {kind:signal.payload.type,payload:signal.payload};if(signal.type==='ice')return {kind:'ice',payload:signal.payload};throw Error('Unsupported signal');}
 function volume(a,b){const d=Math.hypot((a?.x??.5)-(b?.x??.5),(a?.y??.5)-(b?.y??.5));return Math.max(.08,1-d*.8);}
 function errorText(error){const name=error?.name||'';if(name==='NotAllowedError'||name==='PermissionDeniedError')return 'Camera or microphone permission was declined. Allow access in your browser, then try again.';if(name==='NotFoundError')return 'No matching camera or microphone was found. Choose another device or use audio only.';if(name==='NotReadableError')return 'Your camera or microphone is in use elsewhere. Close the other app and try again.';return 'This action could not finish. Check your connection and try again.';}
 return {terminal,mode,mine,joined,incoming,peers,readableState,toSignal,fromSignal,volume,errorText};
});
