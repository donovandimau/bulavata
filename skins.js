(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BulaSkins = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const presets = [
    {id:'lagoon',name:'Lagoon Club',category:'Island',note:'Salt air. Good company.',bg:'#e1f4f3',panel:'#ffffff',ink:'#173e49',muted:'#506b72',accent:'#086779',cover:'#86ded5',pattern:'waves',font:'rounded'},
    {id:'kula',name:'Kula Classic',category:'Classic',note:'A little loud. All you.',bg:'#fae8ed',panel:'#ffffff',ink:'#412132',muted:'#775866',accent:'#b52b50',cover:'#f3abc0',pattern:'dots',font:'rounded'},
    {id:'midnight',name:'Midnight Mixtape',category:'Dark',note:'For the after-hours crowd.',bg:'#17172c',panel:'#25253e',ink:'#f4f1ff',muted:'#c1b9dc',accent:'#c6a8ff',cover:'#48416e',pattern:'stars',font:'rounded'},
    {id:'bloom',name:'Island Bloom',category:'Island',note:'Full colour. Soft heart.',bg:'#fcecdf',panel:'#fffaf5',ink:'#4b3040',muted:'#796074',accent:'#ad376e',cover:'#f2b88c',pattern:'flowers',font:'serif'},
    {id:'palm',name:'Palm Social',category:'Island',note:'Your little green corner.',bg:'#e4eedc',panel:'#fbfff7',ink:'#274231',muted:'#5c715f',accent:'#326342',cover:'#a7c98a',pattern:'stripes',font:'rounded'},
    {id:'sunset',name:'Golden Hour',category:'Bright',note:'Stay for one more sunset.',bg:'#fff0d9',panel:'#fffdf8',ink:'#583725',muted:'#80684d',accent:'#a34321',cover:'#ffbf7a',pattern:'waves',font:'serif'},
    {id:'pixel',name:'Pixel Party',category:'Bright',note:'Main-character energy.',bg:'#eee6ff',panel:'#fffaff',ink:'#3e255a',muted:'#755b87',accent:'#7938bc',cover:'#c5a4f0',pattern:'checker',font:'mono'},
    {id:'notebook',name:'Notebook',category:'Classic',note:'Leave a little note.',bg:'#eeeee8',panel:'#fffef5',ink:'#303f55',muted:'#697283',accent:'#3558a1',cover:'#c2d2e4',pattern:'grid',font:'mono'}
  ];
  const patterns = ['waves','dots','stars','flowers','stripes','checker','grid','plain'];
  const fonts = ['rounded','serif','mono'];
  const marker = /^\/\* bv-skin:v1 ([^\n]*?) \*\/\n?/;
  const hex = (v, fallback) => /^#[0-9a-f]{6}$/i.test(String(v)) ? String(v).toLowerCase() : fallback;
  function normalize(raw) {
    const input = raw && typeof raw === 'object' ? raw : {};
    const preset = presets.find(p => p.id === input.id) || presets[0];
    return {id:preset.id,accent:hex(input.accent,preset.accent),background:hex(input.background,preset.bg),
      pattern:patterns.includes(input.pattern)?input.pattern:preset.pattern,
      font:fonts.includes(input.font)?input.font:preset.font,
      layout:input.layout==='wide'?'wide':'classic',
      note:String(input.note??preset.note).slice(0,80),interests:String(input.interests??'').slice(0,160)};
  }
  function read(css) {
    const text = String(css??'').slice(0,4000), match = text.match(marker);
    if (!match) return {settings:normalize(),legacy:text};
    try { return {settings:normalize(JSON.parse(decodeURIComponent(match[1]))),legacy:text.slice(match[0].length)}; }
    catch (_) { return {settings:normalize(),legacy:text.replace(marker,'')}; }
  }
  function encode(settings, legacy='') {
    const header = `/* bv-skin:v1 ${encodeURIComponent(JSON.stringify(normalize(settings)))} */\n`;
    if (header.length > 4000) throw new Error('Skin settings are too long.');
    if (header.length + String(legacy).length > 4000) throw new Error('Your custom CSS is too long. Shorten it before saving.');
    return header + String(legacy);
  }
  function luminance(colour) {
    const rgb = [1,3,5].map(i=>parseInt(colour.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
    return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
  }
  function foreground(bg) { return luminance(bg) > .179 ? '#172433' : '#ffffff'; }
  function contrast(a,b) { const x=luminance(a),y=luminance(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); }
  function motif(pattern) {
    const light='rgba(255,255,255,.25)',dark='rgba(25,40,60,.08)';
    return {waves:`repeating-radial-gradient(ellipse at 0 0,transparent 0 20px,${light} 21px 23px,transparent 24px 45px)`,
      dots:`radial-gradient(${dark} 1.5px,transparent 1.5px)`,
      stars:`radial-gradient(${light} 1px,transparent 1px)`,
      flowers:`radial-gradient(ellipse at 30% 35%,${light} 0 12px,transparent 13px),radial-gradient(ellipse at 65% 65%,${light} 0 12px,transparent 13px)`,
      stripes:`repeating-linear-gradient(125deg,transparent 0 22px,${light} 23px 28px,transparent 29px 48px)`,
      checker:`conic-gradient(${light} 25%,transparent 0 50%,${light} 0 75%,transparent 0)`,
      grid:`linear-gradient(${dark} 1px,transparent 1px),linear-gradient(90deg,${dark} 1px,transparent 1px)`,plain:'none'}[pattern]||'none';
  }
  function tokens(raw) {
    const s=normalize(raw),p=presets.find(p=>p.id===s.id);
    return {'--bv-bg':s.background,'--bv-panel':p.panel,'--bv-ink':p.ink,'--bv-muted':p.muted,
      '--bv-accent':s.accent,'--bv-on-accent':foreground(s.accent),
      '--bv-link':contrast(s.accent,p.panel)>=4.5?s.accent:p.ink,
      '--bv-cover':p.cover,'--bv-cover-ink':foreground(p.cover),
      '--bv-pattern':motif(s.pattern),'--bv-pattern-size':['dots','stars','grid'].includes(s.pattern)?'24px 24px':s.pattern==='checker'?'48px 48px':'160px 140px',
      '--bv-font':s.font==='mono'?'ui-monospace, monospace':s.font==='serif'?'Georgia, serif':'Manrope, system-ui, sans-serif'};
  }
  function inline(raw) { return Object.entries(tokens(raw)).map(([k,v])=>`${k}:${v}`).join(';'); }
  function safeLegacy(css) {
    const text = String(css??'').replace(/\/\*[\s\S]*?\*\//g,'');
    if (/<|>|@|url\s*\(|expression\s*\(|javascript\s*:|behavior\s*:|\\/i.test(text)) return '';
    const allowed=/^(color|background-color|border(?:-(?:color|width|style|radius|top|right|bottom|left))?|border-(?:top|right|bottom|left)-(?:color|width|style)|font-(?:family|size|weight|style)|line-height|letter-spacing|text-(?:align|decoration|transform)|padding(?:-(?:top|right|bottom|left))?|margin(?:-(?:top|right|bottom|left))?|box-shadow|opacity)$/;
    const rules=[];
    for (const match of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selectors=match[1].split(',').map(s=>s.trim()).filter(s=>/^[\w\s.#:>+~\[\]="'()-]+$/.test(s)&&!/(^|[\s>+~])(?:html|body)|:root|:has\(/i.test(s));
      const declarations=match[2].split(';').filter(d=>allowed.test(d.split(':')[0].trim().toLowerCase())).join(';');
      if(selectors.length&&declarations)rules.push(selectors.map(s=>`#view.bv-room ${s}`).join(',')+'{'+declarations+'}');
    }
    return rules.join('\n');
  }
  return {presets,patterns,fonts,normalize,read,encode,tokens,inline,safeLegacy,contrast,foreground};
});
