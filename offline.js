(function(){
  function status(){
    let notice=document.querySelector('#sota-connection');
    if(!notice){notice=document.createElement('div');notice.id='sota-connection';notice.setAttribute('role','status');document.body.prepend(notice);}
    notice.hidden=navigator.onLine;
    notice.textContent='You are offline. Previously loaded designs may still be available. Reconnect to sign in, visit friends or send posts.';
  }
  // Connectivity changes must not replace an active view or discard an unsent draft.
  status();window.addEventListener('offline',status);window.addEventListener('online',status);
  if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
})();
