(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SotaFriendFeed=api;
})(typeof globalThis==='object'?globalThis:this,function(root){
  'use strict';
  function watchFriends({read,valid,active,onData,onStatus,setTimer=root.setTimeout.bind(root),clearTimer=root.clearTimeout.bind(root),interval=15000}){
    let stopped=false,running=null,timer=null,hasData=false;
    const current=()=>!stopped&&valid();
    function clear(){if(timer!==null){clearTimer(timer);timer=null;}}
    function stop(){stopped=true;clear();}
    function status(value){if(current())onStatus(value);}
    function schedule(){
      if(!current()){stop();return;}
      if(!active())return;
      timer=setTimer(()=>{timer=null;refresh();},interval);
    }
    async function run(finish){
      try{
        const result=await read();
        if(!current()){stop();return;}
        if(!active()){status('paused');return;}
        onData(result);
        if(!current()){stop();return;}
        hasData=true;status('current');
      }catch(err){
        if(!current()){stop();return;}
        if(err?.code==='AUTH_REQUIRED'){status('auth-required');stop();return;}
        if(!active()){status('paused');return;}
        status(hasData?'stale':'error');
      }finally{
        running=null;
        try{schedule();}finally{finish();}
      }
    }
    function refresh(){
      clear();
      if(!current()){stop();return Promise.resolve();}
      if(!active()){status('paused');return Promise.resolve();}
      if(running)return running;
      if(!hasData)status('loading');
      let finish;
      const request=new Promise(resolve=>{finish=resolve;});
      running=request;run(finish);
      return request;
    }
    refresh();return {refresh,stop};
  }
  return {watchFriends};
});
