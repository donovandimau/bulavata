/* Editable hero photos. Guest blobs stay on this device; member files use existing private room media. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.SotaProfilePhotos=api;})(typeof globalThis==='object'?globalThis:this,function(root){
  'use strict';
  let context=null,current=null,editor=null,authSubscription=null,sequence=0;
  const roomMounts=new Set();
  const kinds=['avatar','cover'];
  const slots={
    desktop:{width:1360,height:832,avatar:[646,358,150,158],cover:[662,155,615,201],edit:[1133,399,164,55],clip:'polygon(0 14%,100% 0,100% 100%,0 100%)'},
    mobile:{width:1008,height:1896,avatar:[122,1051,215,219],cover:[137,822,741,226],edit:[678,1105,244,104],clip:'none'}
  };
  function owner(){return String(context?.state?.user?.id||'');}
  function own(session){return !!session&&current===session&&!session.disposed&&owner()===session.owner&&(!session.owner||String(context.state.me?.id||'')===session.owner);}
  function validPath(value,id){const checked=root.SotaRoomMedia?.path(value,'covers');return checked&&(!id||checked.startsWith(id+'/'))?checked:'';}
  function authError(){const error=new Error('Your session changed. Open Edit profile again to continue.');error.code='AUTH_REQUIRED';return error;}
  async function checkOwner(session){
    if(!own(session))throw authError();
    if(!session.owner)return;
    const result=await context.client.auth.getUser();
    if(!own(session)||result.error||String(result.data?.user?.id||'')!==session.owner)throw authError();
  }
  function localStore(action,value){
    return new Promise((resolve,reject)=>{
      if(!root.indexedDB){reject(new Error('This browser cannot save photos on this device.'));return;}
      let database,settled=false;
      const finish=(error,result)=>{if(settled)return;settled=true;database?.close();error?reject(error):resolve(result);};
      const request=root.indexedDB.open('sota-profile-photos',1);
      request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('photos'))request.result.createObjectStore('photos');};
      request.onerror=()=>finish(new Error('Your photos could not be saved on this device.'));
      request.onblocked=()=>finish(new Error('Close other Sota Kece tabs and try saving again.'));
      request.onsuccess=()=>{
        database=request.result;if(settled){database.close();return;}
        try{
          const transaction=database.transaction('photos',action==='put'?'readwrite':'readonly');
          const operation=action==='put'?transaction.objectStore('photos').put(value,'guest'):transaction.objectStore('photos').get('guest');
          let result;
          operation.onsuccess=()=>{result=operation.result;};
          transaction.oncomplete=()=>finish(null,action==='put'?value:result||{});
          transaction.onerror=transaction.onabort=()=>finish(new Error('Your photos could not be saved on this device.'));
        }catch(_){finish(new Error('Your photos could not be saved on this device.'));}
      };
    });
  }
  function urlFor(session,blob){const url=root.URL.createObjectURL(blob);session.urls.add(url);return url;}
  function revoke(session,url){if(session.urls.delete(url))root.URL.revokeObjectURL(url);}
  async function decode(url){
    const image=new root.Image();image.src=url;
    try{if(typeof image.decode==='function')await image.decode();else await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;});}
    catch(_){throw new Error('That image could not be opened. Choose another JPG, PNG or WebP.');}
    if(!(image.naturalWidth>0&&image.naturalHeight>0)||image.naturalWidth>16384||image.naturalHeight>16384||image.naturalWidth*image.naturalHeight>60000000)throw new Error('Choose an image smaller than 60 megapixels.');
    return image;
  }
  function setImage(node,url){node.src=url;node.hidden=!url;}
  function present(session){
    if(!own(session))return;
    for(const kind of kinds){
      const image=session.layer?.querySelector('[data-profile-photo="'+kind+'"]');if(image&&session.assets[kind])setImage(image,session.assets[kind]);
      if(editor?.session===session&&!editor.files[kind]&&session.assets[kind])setImage(editor.dialog.querySelector('[data-photo-preview="'+kind+'"]'),session.assets[kind]);
    }
  }
  async function loadAssets(session,{skip=[]}={}){
    const revision=session.assetRevision;
    const fresh=()=>own(session)&&session.assetRevision===revision;
    try{
      if(!session.owner){
        const saved=await localStore('get');if(!fresh())return;
        for(const kind of kinds){if(skip.includes(kind))continue;const blob=saved[kind];if(!blob||!blob.size||blob.size>6*1024*1024||!/^image\/(?:jpeg|png|webp)$/.test(blob.type||''))continue;const url=urlFor(session,blob);try{await decode(url);if(!fresh()){revoke(session,url);return;}session.assets[kind]=url;session.blobs[kind]=blob;}catch(_){revoke(session,url);}}
      }else{
        await checkOwner(session);if(!fresh())return;
        const settings=root.BulaSkins?.read(context.state.me?.room_css).settings||{};
        for(const kind of kinds){if(skip.includes(kind))continue;const path=validPath(settings[kind+'Path'],session.owner);if(!path)continue;const url=await root.SotaRoomMedia.signed(context.client,path,'cover');if(!fresh())return;session.assets[kind]=url;}
      }
      if(fresh())present(session);
    }catch(_){/* Existing artwork remains available when private or device storage is unavailable. */}
  }
  function stop(){
    sequence++;const session=current;current=null;
    closeEditor(true);
    for(const room of roomMounts){room.nodes.forEach(node=>node.remove());room.cleanup?.();}roomMounts.clear();
    if(!session)return;
    session.disposed=true;session.cleanup.forEach(fn=>fn());session.cleanup=[];
    session.layer?.remove();for(const url of session.urls)root.URL.revokeObjectURL(url);session.urls.clear();session.assets={};session.blobs={};
  }
  function init(options){
    stop();authSubscription?.unsubscribe();context=options;
    authSubscription=context?.client?.auth?.onAuthStateChange?.((event,session)=>{
      const next=String(session?.user?.id||'');
      if(event==='SIGNED_OUT'||current&&next!==current.owner||[...roomMounts].some(room=>room.viewer!==next))stop();
    })?.data?.subscription||null;
  }
  function makeSession(){return {owner:owner(),assets:{},assetRevision:0,blobs:{},urls:new Set(),cleanup:[],disposed:false,layer:null};}
  function geometry(image,artwork){
    const slot=Object.values(slots).find(item=>image.naturalWidth===item.width&&image.naturalHeight===item.height);if(!slot)return null;
    const rect=image.getBoundingClientRect(),bounds=artwork.getBoundingClientRect();if(!(rect.width>0&&rect.height>0))return null;
    const scale=Math.min(rect.width/slot.width,rect.height/slot.height);
    return {slot,scale,left:rect.left-bounds.left+(rect.width-slot.width*scale)/2,top:rect.top-bounds.top+(rect.height-slot.height*scale)/2};
  }
  function mountHero(target=context?.app){
    stop();if(!context||!target)return ()=>{};
    const image=target.querySelector('.sk-original-design'),artwork=image?.closest('.sk-hero-artwork');if(!image||!artwork)return ()=>{};
    const session=makeSession();current=session;
    const layer=root.document.createElement('div');layer.className='spp-hero-layer';
    layer.innerHTML='<img class="spp-hero-cover" data-profile-photo="cover" alt="Your banner photo" hidden><img class="spp-hero-avatar" data-profile-photo="avatar" alt="Your profile photo" hidden><button type="button" class="spp-hero-edit" data-profile-photo-edit aria-haspopup="dialog" aria-label="Edit profile photos" title="Edit profile photos" hidden><span class="sota-glass-mark" data-sota-mark="edit" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" focusable="false"><path d="m15 4 5 5M3 21l5-1L21 7a2 2 0 0 0-5-5L3 15v6Z"/></svg></span><span class="spp-edit-caption">Edit photos</span></button>';
    session.layer=layer;artwork.append(layer);
    const button=layer.querySelector('[data-profile-photo-edit]');
    const listen=(node,type,fn)=>{node.addEventListener(type,fn);session.cleanup.push(()=>node.removeEventListener(type,fn));};
    function measure(){
      if(!own(session)||!layer.isConnected)return;
      const dimensions=geometry(image,artwork);if(!dimensions)return;
      const {slot,scale,left,top}=dimensions;
      for(const kind of [...kinds,'edit']){const node=kind==='edit'?button:layer.querySelector('[data-profile-photo="'+kind+'"]'),[x,y,width,height]=slot[kind];node.style.left=(left+x*scale)+'px';node.style.top=(top+y*scale)+'px';node.style.width=(width*scale)+'px';node.style.height=(kind==='edit'?Math.max(44,height*scale):height*scale)+'px';}
      layer.querySelector('[data-profile-photo="cover"]').style.clipPath=slot.clip;
      button.hidden=false;
      button.style.fontSize=Math.max(9,Math.min(16,15*scale))+'px';button.style.setProperty('--spp-edit-scale',String(scale));
      layer.dataset.photoLayout=slot===slots.mobile?'mobile':'desktop';
    }
    listen(button,'click',()=>open());listen(image,'load',measure);listen(root,'resize',measure);
    if(root.ResizeObserver){const observer=new root.ResizeObserver(measure);observer.observe(image);observer.observe(artwork);session.cleanup.push(()=>observer.disconnect());}
    if(root.MutationObserver){const observer=new root.MutationObserver(()=>{if(current===session&&!layer.isConnected)stop();});observer.observe(target,{subtree:true,childList:true});session.cleanup.push(()=>observer.disconnect());}
    measure();loadAssets(session);
    return ()=>{if(current===session)stop();};
  }
  function closeEditor(forced=false){
    const active=editor;if(!active)return;
    if(active.commitStarted&&!forced)return;
    editor=null;active.cancelled=true;active.dialog.remove();
    for(const url of active.previewUrls)revoke(active.session,url);active.previewUrls.clear();
    if(!forced&&active.opener?.isConnected)active.opener.focus({preventScroll:true});
  }
  async function open(){
    if(!context)return;
    if(editor){editor.dialog.focus();return;}
    const requestedOwner=owner();
    if(!current){current=makeSession();loadAssets(current);}
    const session=current;if(!own(session)||session.owner!==requestedOwner)return;
    const dialog=root.document.createElement('dialog');dialog.className='spp-dialog';dialog.setAttribute('aria-labelledby','spp-title');
    dialog.innerHTML='<form method="dialog"><header><div><p class="spp-kicker">YOUR SPACE</p><h2 id="spp-title">Profile photos</h2></div><button type="button" class="spp-close" data-photo-cancel aria-label="Close profile photos">×</button></header><p class="spp-storage" data-photo-storage></p><div class="spp-previews"><div class="spp-field"><div class="spp-preview spp-preview-avatar"><span>Profile photo</span><img data-photo-preview="avatar" alt="Circular profile photo preview" hidden></div><label for="spp-avatar">Circular profile photo</label><input type="file" id="spp-avatar" data-photo-file="avatar" accept="image/jpeg,image/png,image/webp"></div><div class="spp-field"><div class="spp-preview spp-preview-cover"><span>Banner photo</span><img data-photo-preview="cover" alt="Rectangular banner photo preview" hidden></div><label for="spp-cover">Rectangular banner photo</label><input type="file" id="spp-cover" data-photo-file="cover" accept="image/jpeg,image/png,image/webp"></div></div><p class="spp-hint">JPG, PNG or WebP · up to 6 MB each. Photos fill their frame.</p><p data-photo-error role="alert"></p><p data-photo-status role="status" aria-live="polite"></p><footer><button type="button" class="spp-cancel" data-photo-cancel>Cancel</button><button type="button" class="spp-save" data-photo-save disabled>Save photos</button></footer></form>';
    const active={session,dialog,opener:root.document.activeElement,files:{},types:{},tasks:{avatar:0,cover:0},pending:0,previewUrls:new Set(),previewFor:{},cancelled:false,saving:false,commitStarted:false};editor=active;
    const q=selector=>dialog.querySelector(selector),valid=()=>editor===active&&!active.cancelled&&own(session);
    q('[data-photo-storage]').textContent=session.owner?'Saved to your private room. Visible through your existing room permissions.':'Saved on this device. These photos stay in this browser.';
    for(const kind of kinds)if(session.assets[kind])setImage(q('[data-photo-preview="'+kind+'"]'),session.assets[kind]);
    function ready(){q('[data-photo-save]').disabled=active.saving||active.pending>0||!kinds.some(kind=>active.files[kind]);}
    for(const kind of kinds){
      const input=q('[data-photo-file="'+kind+'"]');input.addEventListener('change',async()=>{
        const file=input.files?.[0],ticket=++active.tasks[kind];if(!file||active.saving)return;
        active.pending++;ready();q('[data-photo-error]').textContent='';q('[data-photo-status]').textContent='Checking image…';let url;
        try{
          const checked=await root.SotaRoomMedia.inspect(file,'cover');if(!valid()||ticket!==active.tasks[kind])return;
          url=urlFor(session,file);await decode(url);if(!valid()||ticket!==active.tasks[kind])return;
          const previous=active.previewFor[kind];if(previous){revoke(session,previous);active.previewUrls.delete(previous);}
          active.previewUrls.add(url);active.previewFor[kind]=url;active.files[kind]=file;active.types[kind]=checked.contentType;setImage(q('[data-photo-preview="'+kind+'"]'),url);
          q('[data-photo-status]').textContent='Photo ready. Save to apply your changes.';url=null;
        }catch(error){if(valid()&&ticket===active.tasks[kind]){q('[data-photo-error]').textContent=error.message||'Choose another image.';q('[data-photo-status]').textContent='';input.value='';}}
        finally{if(url)revoke(session,url);active.pending--;if(valid())ready();}
      });
    }
    dialog.querySelectorAll('[data-photo-cancel]').forEach(button=>button.addEventListener('click',()=>closeEditor()));
    dialog.addEventListener('cancel',event=>{event.preventDefault();closeEditor();});
    dialog.querySelector('form').addEventListener('submit',event=>event.preventDefault());
    q('[data-photo-save]').addEventListener('click',async()=>{
      if(!valid()||active.saving||active.pending||!kinds.some(kind=>active.files[kind]))return;
      active.saving=true;ready();q('[data-photo-error]').textContent='';q('[data-photo-status]').textContent='Saving photos…';
      dialog.querySelectorAll('input').forEach(input=>input.disabled=true);dialog.setAttribute('aria-busy','true');
      const uploaded=[],patchPaths={};let confirmed=false,writeAttempted=false;
      try{
        await checkOwner(session);
        if(!valid())throw authError();
        if(!session.owner){
          const latest=await localStore('get');if(!valid())throw authError();
          const record={...latest};for(const kind of kinds)if(active.files[kind]){const file=active.files[kind];record[kind]=file.type===active.types[kind]?file:new root.Blob([await file.arrayBuffer()],{type:active.types[kind]});}
          if(!valid())throw authError();
          active.commitStarted=true;dialog.querySelectorAll('[data-photo-cancel]').forEach(button=>button.disabled=true);
          await localStore('put',record);confirmed=true;if(!valid())return;
          session.assetRevision++;
          for(const kind of kinds)if(active.files[kind]){session.blobs[kind]=record[kind];session.assets[kind]=urlFor(session,record[kind]);}
        }else{
          const media=root.SotaRoomMedia.api(context.client,session.owner);
          for(const kind of kinds){
            if(!active.files[kind])continue;
            await checkOwner(session);if(!valid())throw authError();
            const result=await media.upload(active.files[kind],'cover');
            if(!validPath(result?.path,session.owner))throw new Error('The photo upload could not be confirmed.');
            uploaded.push(result.path);patchPaths[kind+'Path']=result.path;
            if(!valid())throw authError();
          }
          await checkOwner(session);if(!valid())throw authError();
          const latest=await context.client.from('bv_profiles').select('id,room_css').eq('id',session.owner).maybeSingle();
          if(latest.error||latest.data?.id!==session.owner)throw new Error('Your latest room settings could not be loaded. Try again.');
          if(!valid())throw authError();
          const parsed=root.BulaSkins.read(latest.data.room_css),settings=root.BulaSkins.normalize({...parsed.settings,...patchPaths});
          const room_css=root.BulaSkins.encode(settings,parsed.legacy);
          await checkOwner(session);if(!valid())throw authError();
          active.commitStarted=true;dialog.querySelectorAll('[data-photo-cancel]').forEach(button=>button.disabled=true);
          writeAttempted=true;
          let update=context.client.from('bv_profiles').update({room_css}).eq('id',session.owner);
          update=latest.data.room_css==null&&typeof update.is==='function'?update.is('room_css',null):update.eq('room_css',latest.data.room_css);
          const saved=await update.select('id,room_css').single();
          if(saved.error||saved.data?.id!==session.owner||saved.data?.room_css!==room_css)throw new Error(saved.error?.message||'Your room changed while saving. Try again to keep the latest settings.');
          confirmed=true;if(!valid())return;
          session.assetRevision++;
          Object.assign(context.state.me,saved.data);
          for(const kind of kinds)if(active.files[kind])session.assets[kind]=urlFor(session,active.files[kind]);
        }
        present(session);if(!valid())return;
        loadAssets(session,{skip:kinds.filter(kind=>active.files[kind])});
        q('[data-photo-status]').textContent=session.owner?'Photos saved to your room.':'Saved on this device.';
        active.commitStarted=false;closeEditor();
        context.onSaved?.({owner:session.owner,local:!session.owner});
      }catch(error){
        if(!confirmed&&!writeAttempted&&uploaded.length){
          // A lost UPDATE response can follow a real commit. Retain those private
          // objects rather than deleting a possibly saved photo. Only uploads
          // cancelled or rejected before the profile write can be removed here.
          for(const path of uploaded)try{await root.SotaRoomMedia.api(context.client,session.owner).remove(path);}catch(_){}
        }
        if(valid()){q('[data-photo-error]').textContent=error.message||'Your photos could not be saved. Try again.';q('[data-photo-status]').textContent='';}
      }finally{
        active.saving=false;active.commitStarted=false;
        if(valid()){dialog.removeAttribute('aria-busy');dialog.querySelectorAll('input,[data-photo-cancel]').forEach(input=>input.disabled=false);ready();}
      }
    });
    root.document.body.append(dialog);root.SotaSpaceDesign?.decorateDialog?.(dialog);if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');q('[data-photo-cancel]').focus();
    return dialog;
  }
  async function mountRoom(target,profile,{isOwner=false}={}){
    if(!context||!target||!profile?.id)return ()=>{};
    const stamp=sequence,viewer=owner(),settings=root.BulaSkins?.read(profile.room_css).settings||{},inserted=[];
    const record={viewer,nodes:inserted};roomMounts.add(record);
    if(isOwner){const button=target.querySelector('[data-profile-photo-edit]');button?.addEventListener('click',open);record.cleanup=()=>button?.removeEventListener('click',open);}
    for(const kind of kinds){
      const path=validPath(settings[kind+'Path'],String(profile.id));if(!path)continue;
      try{
        const url=await root.SotaRoomMedia.signed(context.client,path,'cover');if(sequence!==stamp||owner()!==viewer||!target.isConnected)return ()=>{};
        const holder=target.querySelector(kind==='avatar'?'#room-head .av.lg, .bv-room-avatar, .bv-avatar':'#room-head .bv-cover, .bv-cover');if(!holder)continue;
        const image=root.document.createElement('img');image.className='spp-room-'+kind;image.src=url;image.alt=kind==='avatar'?'Profile photo':'Banner photo';
        holder.classList.add('spp-room-photo-host');holder.append(image);inserted.push(image);
      }catch(_){/* Existing room representation remains when RLS refuses private media. */}
    }
    return ()=>{inserted.forEach(image=>image.remove());record.cleanup?.();roomMounts.delete(record);};
  }
  return {init,mountHero,mountRoom,open,stop,slots,geometry,validPath};
});
