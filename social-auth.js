/* Dimau social sign-in v1. Server/provider configuration is authoritative.
 * No roles are granted here. Each app keeps its existing data permissions.
 * Copy this file unchanged; configure URL/key/storage separately per app. */
(function(root){
  'use strict';
  const catalog=[['google','Google'],['facebook','Facebook'],['x','X'],['github','GitHub'],['apple','Apple'],['azure','Microsoft'],['discord','Discord']];
  function create(options, environment){
    const e=environment||root;
    const base=new URL(options.url);
    if(base.protocol!=='https:'||!base.hostname.endsWith('.supabase.co')||base.pathname!=='/'||base.search||base.hash||base.username||base.password)throw Error('Invalid account service.');
    const url=base.origin,key=options.key,pendingKey=options.storageKey||'dimau.oauth.pending.v1';
    let settingsPromise;
    async function request(path,body,token){
      const response=await e.fetch(url+'/auth/v1/'+path,{method:body?'POST':'GET',headers:{apikey:key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store',signal:AbortSignal.timeout(15000)});
      const data=await response.json();
      if(!response.ok)throw Error('Sign-in could not be completed. Please try again.');
      return data;
    }
    function providers(){
      if(!settingsPromise)settingsPromise=request('settings').then(data=>catalog.filter(([id])=>data.external?.[id]===true).map(([id,label])=>({id,label}))).catch(error=>{settingsPromise=null;throw error;});
      return settingsPromise;
    }
    const encode=bytes=>e.btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    function cleanUrl(){
      const u=new URL(e.location.href);
      ['code','error','error_code','error_description'].forEach(k=>u.searchParams.delete(k));
      if(/(?:access_token|refresh_token|provider_token)=/.test(u.hash))u.hash='';
      return u;
    }
    async function begin(provider){
      if(!(await providers()).some(p=>p.id===provider))throw Error('This sign-in option is not available yet.');
      const verifier=encode(e.crypto.getRandomValues(new Uint8Array(32)));
      const challenge=encode(new Uint8Array(await e.crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
      const back=cleanUrl();back.hash='';
      const pending={verifier,provider,createdAt:Date.now(),returnUrl:back.href};
      try{e.sessionStorage.setItem(pendingKey,JSON.stringify(pending));if(e.sessionStorage.getItem(pendingKey)!==JSON.stringify(pending))throw Error();}catch{throw Error('Allow storage in this tab to use social sign-in.');}
      const target=new URL(url+'/auth/v1/authorize');
      target.searchParams.set('provider',provider);target.searchParams.set('redirect_to',back.href);
      target.searchParams.set('code_challenge',challenge);target.searchParams.set('code_challenge_method','s256');
      if(provider==='google')target.searchParams.set('prompt','select_account');
      e.location.assign(target.href);
    }
    async function complete(){
      const current=new URL(e.location.href);
      const code=current.searchParams.get('code'),failure=current.searchParams.get('error');
      if(!code&&!failure)return null;
      const clean=cleanUrl();e.history.replaceState(null,'',clean.pathname+clean.search+clean.hash);
      let pending;try{pending=JSON.parse(e.sessionStorage.getItem(pendingKey)||'null');e.sessionStorage.removeItem(pendingKey);}catch{}
      if(failure)throw Error('Sign-in was cancelled or declined. You can try another option.');
      if(!pending||!Number.isFinite(pending.createdAt)||Date.now()-pending.createdAt>600000||pending.createdAt>Date.now()||!catalog.some(([p])=>p===pending.provider)||!/^[A-Za-z0-9_-]{43}$/.test(pending.verifier)||pending.returnUrl!==clean.origin+clean.pathname+clean.search)throw Error('This sign-in request expired. Start again in this tab.');
      if(code.length>4096)throw Error('Invalid sign-in response.');
      const session=await request('token?grant_type=pkce',{auth_code:code,code_verifier:pending.verifier});
      if(!session.access_token||!session.refresh_token)throw Error('Account session was not returned.');
      const user=await request('user',null,session.access_token);
      if(!user.id||user.is_anonymous)throw Error('Account could not be verified.');
      // Provider access/refresh tokens are deliberately not persisted by public apps.
      return {access_token:session.access_token,refresh_token:session.refresh_token,expires_in:session.expires_in,expires_at:session.expires_at||Math.floor(Date.now()/1000)+(session.expires_in||3600),user};
    }
    async function mount(container,{className='',onError=()=>{},onBegin=begin}={}){
      if(!container)return;
      container.textContent='Loading sign-in options…';container.setAttribute('aria-live','polite');
      try{
        const list=await providers();container.replaceChildren();
        for(const p of list){
          const button=e.document.createElement('button');button.type='button';button.className=className;button.textContent='Continue with '+p.label;
          button.style.minHeight='44px';button.style.marginBottom='8px';button.style.width='100%';
          button.addEventListener('click',async()=>{const buttons=[...container.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);try{await onBegin(p.id);}catch(error){onError(error);buttons.forEach(b=>b.disabled=false);}});
          container.append(button);
        }
      }catch(error){container.textContent='Social sign-in is temporarily unavailable. You can use email below.';onError(error);}
    }
    return Object.freeze({providers,begin,complete,mount});
  }
  const api=Object.freeze({create});
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.DimauSocialAuth=api;
})(typeof window!=='undefined'?window:null);
