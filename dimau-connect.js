/* Dimau Connect v3 — small round launcher: chat, voice call, video call, boards.
 * Voice and video open a direct call straight away (no sign-in needed).
 * Chat and boards open the shared Sota Kece community. No account data or
 * page address is sent anywhere. */
(function () {
  'use strict';
  if (window.DimauConnect) return;

  const script = document.currentScript;
  const requestedApp = script && script.getAttribute('data-app') || 'dimau';
  const app = /^[a-z0-9][a-z0-9-]{0,63}$/.test(requestedApp) ? requestedApp : 'dimau';
  const label = String(script && script.getAttribute('data-label') || 'this app').trim().slice(0, 80) || 'this app';
  const triggerOnly = !!(script && script.getAttribute('data-trigger-only') === 'true');
  const HUB = 'https://sotakece.com';
  const actions = [
    { id: 'video', name: 'Video call', hint: 'Start a video call now' },
    { id: 'audio', name: 'Voice call', hint: 'Start a voice call now' },
    { id: 'chat', name: 'Chat', hint: 'Message your groups' },
    { id: 'boards', name: 'Boards', hint: 'Share updates and plans' }
  ];
  let host, root, menu, toggle, previousFocus, open = false;

  function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  function hubURL(view, mode) {
    if (view === 'calls' || view === 'video' || view === 'audio') {
      const m = view === 'audio' || mode === 'audio' ? 'audio' : 'video';
      return HUB + '/call.html?mode=' + m + '&app=' + encodeURIComponent(app);
    }
    const v = view === 'boards' ? 'boards' : view === 'groups' ? 'groups' : 'chat';
    return HUB + '/communications.html?app=' + encodeURIComponent(app) + '&view=' + v;
  }

  function stylesheetURL() {
    const fallback = new URL('/dimau-connect.css', window.location.origin).href;
    try {
      const u = new URL(script && script.src || '', window.location.href);
      if (!script || !script.src || u.origin !== window.location.origin) return fallback;
      return new URL('./dimau-connect.css', u).href;
    } catch { return fallback; }
  }

  function setOpen(value, opener, restoreFocus) {
    if (!menu) return;
    if (value && !open) previousFocus = opener || document.activeElement;
    open = value;
    host.toggleAttribute('data-open', open);
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close Connect' : 'Connect: chat, voice or video call');
    document.querySelectorAll('[data-dimau-connect]').forEach(t => t.setAttribute('aria-expanded', String(open)));
    if (open) { const first = menu.querySelector('a'); if (first) first.focus(); }
    else if (restoreFocus && previousFocus && previousFocus.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus();
  }

  function start() {
    if (host || !document.body || !Element.prototype.attachShadow) return;
    host = el('div'); host.id = 'dimau-connect-launcher'; host.setAttribute('data-private', '');
    if (triggerOnly) host.setAttribute('data-trigger-only', '');
    root = host.attachShadow({ mode: 'open' });
    const css = el('link'); css.rel = 'stylesheet'; css.href = stylesheetURL(); root.appendChild(css);
    const glass = el('style'); glass.setAttribute('data-glass-controls', ''); glass.textContent = "\n.toggle,.item .ic{--dg-tint:var(--sota-unified-tint,#8abbea);position:relative;isolation:isolate;color:#101924;border:1px solid #42516c88;background:radial-gradient(ellipse at 50% 110%,color-mix(in srgb,var(--dg-tint) 85%,#fff),transparent 65%),linear-gradient(155deg,#ffffffe0,#ffffff30 38%,color-mix(in srgb,var(--dg-tint) 67%,transparent) 72%,#ffffffb0);background-color:color-mix(in srgb,var(--dg-tint) 50%,transparent);box-shadow:inset 0 2px 1px #fff,inset 2px 0 3px #dbfbff,inset -2px 0 3px #ffdcf8b0,inset 0 -3px 2px #62728b88,0 5px 14px #152a4540;backdrop-filter:blur(12px) saturate(1.3);-webkit-backdrop-filter:blur(12px) saturate(1.3)}\n.toggle::before,.item .ic::before{content:'';position:absolute;left:16%;right:16%;top:5px;height:23%;border-top:4px solid #ffffffe8;border-radius:50%;pointer-events:none}.toggle::after,.item .ic::after{content:'';position:absolute;right:5px;top:29%;width:3px;height:31%;border-radius:50%;background:linear-gradient(#ffffffd0,#ffffff00);pointer-events:none}\n.toggle .glyph,.item .glyph{background:#101924;position:relative;z-index:1;filter:drop-shadow(0 1px 0 #ffffff80)}\n:host([data-open]) .toggle{background:linear-gradient(145deg,#fff,color-mix(in srgb,var(--dg-tint) 65%,transparent));color:#101924}\n.video .ic{--dg-tint:var(--sota-unified-tint,#86b4f2)}.audio .ic{--dg-tint:var(--sota-unified-tint,#5dc5a5)}.chat .ic{--dg-tint:var(--sota-unified-tint,#b69ee6)}.boards .ic{--dg-tint:var(--sota-unified-tint,#efc064)}\n.item{min-height:48px;min-width:48px}.item .tag{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;box-shadow:none}.toggle:focus-visible,.item:focus-visible{outline:3px solid #0c5e91;outline-offset:4px}\n@media(forced-colors:active){.toggle,.item .ic{background:ButtonFace!important;color:ButtonText!important;border:2px solid ButtonText;box-shadow:none;backdrop-filter:none}.toggle::before,.toggle::after,.item .ic::before,.item .ic::after{display:none}.glyph{background:ButtonText!important;filter:none}}\n"; root.appendChild(glass);

    menu = el('nav', 'menu'); menu.id = 'connect-menu'; menu.hidden = true;
    menu.setAttribute('aria-label', 'Connect from ' + label);
    actions.forEach(a => {
      const link = el('a', 'item ' + a.id);
      link.href = hubURL(a.id);
      link.target = '_blank'; link.rel = 'noopener noreferrer'; link.referrerPolicy = 'no-referrer';
      link.title = a.hint;
      link.setAttribute('aria-label', a.name + ' — ' + a.hint + ' (opens a new tab)');
      const tag = el('span', 'tag', a.name); tag.setAttribute('aria-hidden', 'true');
      const ic = el('span', 'ic'); ic.setAttribute('aria-hidden', 'true'); ic.appendChild(el('span', 'glyph'));
      link.append(tag, ic);
      link.addEventListener('click', () => setTimeout(() => setOpen(false), 0));
      menu.appendChild(link);
    });
    root.appendChild(menu);

    toggle = el('button', 'toggle'); toggle.type = 'button'; toggle.hidden = triggerOnly;
    toggle.setAttribute('aria-controls', menu.id); toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Connect: chat, voice or video call'); toggle.title = 'Connect';
    toggle.appendChild(el('span', 'glyph'));
    toggle.addEventListener('click', () => setOpen(!open, toggle, true));
    root.appendChild(toggle);
    document.body.appendChild(host);

    document.addEventListener('keydown', e => { if (open && e.key === 'Escape') { e.preventDefault(); setOpen(false, null, true); } });
    document.addEventListener('pointerdown', e => { if (open && e.composedPath().indexOf(host) === -1 && !(e.target.closest && e.target.closest('[data-dimau-connect]'))) setOpen(false); });
    document.addEventListener('click', e => {
      const t = e.target.closest && e.target.closest('[data-dimau-connect]');
      if (!t) return;
      e.preventDefault(); setOpen(!open, t, true);
    });
  }

  window.DimauConnect = Object.freeze({
    version: '3.0.0',
    open: function () { start(); setOpen(true, document.activeElement); },
    close: function () { setOpen(false, null, true); },
    hubURL: hubURL
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
