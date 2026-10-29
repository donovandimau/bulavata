/* Dimau Connect v3.1 — small round launcher: chat, voice call, video call, boards.
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
  let host, root, menu, toggle, close, previousFocus, open = false;

  function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  function activeElement() {
    let focused = document.activeElement;
    while (focused && focused.shadowRoot && focused.shadowRoot.activeElement) focused = focused.shadowRoot.activeElement;
    return focused;
  }

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
    if (value && !open) previousFocus = opener || activeElement();
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

    menu = el('nav', 'menu'); menu.id = 'connect-menu'; menu.hidden = true;
    menu.setAttribute('aria-label', 'Connect from ' + label);
    close = el('button', 'close'); close.type = 'button';
    close.setAttribute('aria-label', 'Close Connect'); close.title = 'Close Connect';
    close.appendChild(el('span', 'glyph'));
    close.addEventListener('click', () => setOpen(false, null, true));
    menu.appendChild(close);
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

    document.addEventListener('keydown', e => { if (open && e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); setOpen(false, null, true); } });
    document.addEventListener('pointerdown', e => { if (open && e.composedPath().indexOf(host) === -1 && !(e.target.closest && e.target.closest('[data-dimau-connect]'))) setOpen(false); });
    // This is a nonmodal flyout. Tab can leave it; no keyboard trap or forced
    // focus return when the user moves to another app control.
    document.addEventListener('focusin', e => {
      if (open && e.composedPath().indexOf(host) === -1 && !(e.target.closest && e.target.closest('[data-dimau-connect]'))) setOpen(false);
    });
    menu.addEventListener('keydown', e => {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
      const items = Array.from(menu.querySelectorAll('a'));
      const current = items.indexOf(root.activeElement);
      if (current < 0) return;
      const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (current + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      e.preventDefault(); items[next].focus();
    });
    document.addEventListener('click', e => {
      const t = e.target.closest && e.target.closest('[data-dimau-connect]');
      if (!t) return;
      e.preventDefault(); setOpen(!open, t, true);
    });
  }

  window.DimauConnect = Object.freeze({
    version: '3.1.0',
    open: function () { start(); setOpen(true, activeElement()); },
    close: function () { setOpen(false, null, true); },
    hubURL: hubURL
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();

