// Only the public app shell is cached. Auth, profiles, messages and media never enter this cache.
const CACHE='sota-kece-shell-20261011-v4';
const ASSETS=['/','/index.html','/skins.css','/skins.js','/skin-studio.js','/offline.js','/kava.css','/kava.js','/kava-ui.js','/vendor/supabase-2.45.0.min.js'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('sota-kece-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin||!ASSETS.includes(url.pathname))return;
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put('/',copy)));}return response;}).catch(()=>caches.match('/')));return;
  }
  event.respondWith(caches.match(event.request).then(cached=>{
    const fresh=fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}return response;});
    if(cached){event.waitUntil(fresh.catch(()=>{}));return cached;}return fresh;
  }));
});
