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
    {id:'notebook',name:'Notebook',category:'Classic',note:'Leave a little note.',bg:'#eeeee8',panel:'#fffef5',ink:'#303f55',muted:'#697283',accent:'#3558a1',cover:'#c2d2e4',pattern:'grid',font:'mono'},
    {"id":"electric","name":"Bula Electric","category":"Bright","note":"Big bula. Bigger energy.","bg":"#151025","panel":"#261c3b","ink":"#fff5fd","muted":"#d1bedf","accent":"#6cedee","cover":"#ba399f","pattern":"checker","font":"rounded"},
    {"id":"masi","name":"Masi Social","category":"Masi-inspired","note":"Island roots. Your story.","bg":"#efe1c6","panel":"#fff8eb","ink":"#3d2920","muted":"#705d4c","accent":"#6e3827","cover":"#d9b984","pattern":"masi","font":"serif"},
    {"id":"drua","name":"Drua Day","category":"Sport","note":"Bring the whole crew.","bg":"#d9f1ff","panel":"#ffffff","ink":"#102c50","muted":"#475d78","accent":"#1458a0","cover":"#66c5ef","pattern":"stripes","font":"rounded"},
    {"id":"hibiscus","name":"Hibiscus Heat","category":"Island","note":"Full bloom. Full volume.","bg":"#ffe1f0","panel":"#fff9fd","ink":"#531932","muted":"#795063","accent":"#bb2066","cover":"#ee69a5","pattern":"flowers","font":"rounded"},
    {"id":"reef","name":"Reef Rave","category":"Bright","note":"Ocean air. Electric nights.","bg":"#08232d","panel":"#103440","ink":"#e8ffff","muted":"#b7d9de","accent":"#64f2d7","cover":"#0d776d","pattern":"waves","font":"mono"},
    {"id":"kava","name":"Yaqona Nights","category":"Dark","note":"Good stories. Late nights.","bg":"#231b17","panel":"#352b25","ink":"#fff0d5","muted":"#d4c1ac","accent":"#edc086","cover":"#624b35","pattern":"masi","font":"serif"},
    {"id":"mango","name":"Mango Season","category":"Island","note":"A little sunshine goes a long way.","bg":"#fff0cf","panel":"#fffaf0","ink":"#5c3619","muted":"#78604d","accent":"#a6450e","cover":"#ffc05c","pattern":"dots","font":"rounded"},
    {"id":"candy","name":"Candy Crush","category":"Soft","note":"Sweet colours. Big personality.","bg":"#f6e5ff","panel":"#fffbff","ink":"#4a255d","muted":"#725583","accent":"#8a399c","cover":"#e4a3e8","pattern":"checker","font":"rounded"},
    {"id":"cloud","name":"Cloud Nine","category":"Soft","note":"Soft days. Good company.","bg":"#e8eefb","panel":"#fcfdff","ink":"#273750","muted":"#536782","accent":"#3d5ea7","cover":"#bacdf8","pattern":"stars","font":"serif"},
    {"id":"ink","name":"Ink & Paper","category":"Classic","note":"Your words take the stage.","bg":"#e7e4dd","panel":"#fffdf5","ink":"#232b31","muted":"#59636c","accent":"#343e46","cover":"#c9c4b7","pattern":"grid","font":"mono"},
    {"id":"disco","name":"Disco Cousins","category":"Bright","note":"One more song for the cousins.","bg":"#27113d","panel":"#3a1c4c","ink":"#fff2fc","muted":"#dab8e7","accent":"#ffb2e9","cover":"#9e327e","pattern":"dots","font":"rounded"},
    {"id":"acid","name":"Lime Limelight","category":"Bright","note":"Main stage. Main character.","bg":"#162110","panel":"#26351c","ink":"#f2ffe5","muted":"#c4d9b2","accent":"#c7ff48","cover":"#5e732a","pattern":"checker","font":"mono"},
    {"id":"varsity","name":"Schoolyard Stories","category":"Sport","note":"Same mates. New stories.","bg":"#eee5e0","panel":"#fffaf6","ink":"#3d2328","muted":"#70555c","accent":"#8f2d40","cover":"#ca7f89","pattern":"stripes","font":"serif"},
    {"id":"comic","name":"Comic Crew","category":"Bright","note":"Big laughs. Bold lines.","bg":"#fff3bc","panel":"#fffdf1","ink":"#2b263f","muted":"#605772","accent":"#6a37a5","cover":"#f9d647","pattern":"dots","font":"mono"},
    {"id":"afterglow","name":"Island Afterglow","category":"Dark","note":"Stay for one more story.","bg":"#221326","panel":"#39223b","ink":"#fff0eb","muted":"#e4bfc7","accent":"#ffbe94","cover":"#a05c76","pattern":"waves","font":"serif"},
    {"id":"mint","name":"Mint Condition","category":"Soft","note":"Fresh space. Fresh start.","bg":"#dcefe8","panel":"#f8fffb","ink":"#224638","muted":"#577468","accent":"#25634a","cover":"#a4d2bb","pattern":"flowers","font":"rounded"}
  ];
  const patterns = ['waves','dots','stars','flowers','stripes','checker','grid','masi','plain'];
  const fonts = ['rounded','serif','mono'];
  const marker = /^\/\* bv-skin:v1 ([^\n]*?) \*\/\n?/;
  const hex = (v, fallback) => /^#[0-9a-f]{6}$/i.test(String(v)) ? String(v).toLowerCase() : fallback;
  function safeUrl(value, audio=false) {
    try {
      const u=new URL(String(value||'').trim());
      if(u.protocol!=='https:'||u.username||u.password||u.href.length>320)return '';
      if(audio&&!/\.(mp3|m4a|ogg|opus|wav)$/i.test(u.pathname))return '';
      return u.href;
    }catch(_){return '';}
  }
  function safeMediaPath(value,kind) {
    const text=String(value||'');return new RegExp('^[a-f0-9-]{36}/'+kind+'/[a-f0-9-]{36}\\.(?:'+(kind==='music'?'mp3|m4a|ogg|opus|wav':'jpg|jpeg|png|webp')+')$','i').test(text)?text:'';
  }
  function normalize(raw) {
    const input = raw && typeof raw === 'object' ? raw : {};
    const preset = presets.find(p => p.id === input.id) || presets[0];
    return {id:preset.id,accent:hex(input.accent,preset.accent),background:hex(input.background,preset.bg),
      pattern:patterns.includes(input.pattern)?input.pattern:preset.pattern,
      font:fonts.includes(input.font)?input.font:preset.font,
      layout:input.layout==='wide'?'wide':'classic',
      note:String(input.note??preset.note).slice(0,80),interests:String(input.interests??'').slice(0,160),
      trackUrl:safeUrl(input.trackUrl,true),trackTitle:String(input.trackTitle??'').slice(0,80),
      trackPath:safeMediaPath(input.trackPath,'music'),coverPath:safeMediaPath(input.coverPath,'covers'),
      panel:hex(input.panel,preset.panel),cover:hex(input.cover,preset.cover),
      cardStyle:['soft','square','round'].includes(input.cardStyle)?input.cardStyle:'soft',
      effect:['flat','glow','sticker'].includes(input.effect)?input.effect:'flat'};
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
      grid:`linear-gradient(${dark} 1px,transparent 1px),linear-gradient(90deg,${dark} 1px,transparent 1px)`,masi:'url(/assets/masi-band.svg)',plain:'none'}[pattern]||'none';
  }
  function tokens(raw) {
    const s=normalize(raw),p=presets.find(p=>p.id===s.id);
    // Materials follow the chosen palette; saved v1 settings remain compatible.
    const paper=['masi','kava','notebook','ink','varsity','comic'].includes(s.id);
    const raised=['kula','bloom','palm','mango','candy','cloud','mint'].includes(s.id);
    const light=luminance(s.panel)>.5;
    const edge=`color-mix(in srgb,${s.accent} ${paper?'24':'18'}%,${s.panel})`;
    const sheen=`color-mix(in srgb,${s.panel} 91%,${light?'#ffffff':'#b3eaff'})`;
    const materialShadow=paper?`0 3px 0 color-mix(in srgb,${s.accent} 17%,${s.background}),0 8px 20px ${s.accent}14,inset 0 0 0 1px ${edge}`:
      raised?`7px 7px 18px color-mix(in srgb,${s.background} 82%,${p.ink}),-5px -5px 14px ${light?'#ffffff99':'#ffffff0c'},inset 0 1px 0 ${light?'#ffffff':'#ffffff26'}`:
      `0 12px 28px ${light?'#102b3c18':'#00000040'},inset 0 1px 0 ${light?'#ffffff':'#ffffff30'},inset 0 0 0 1px ${edge}`;
    const texture=paper?`repeating-linear-gradient(0deg,transparent 0 3px,${light?'#5c361908':'#fff1d507'} 3px 4px),radial-gradient(${light?'#6e382718':'#fff1d514'} .6px,transparent .8px)`:
      raised?`linear-gradient(135deg,${sheen},${s.panel} 55%,color-mix(in srgb,${s.panel} 95%,${s.accent}))`:
      `linear-gradient(135deg,${light?'#ffffff99':'#ffffff14'},transparent 55%,${s.accent}0d)`;
    const finish=s.effect==='glow'?`,0 0 16px ${s.accent}44`:s.effect==='sticker'?`,4px 4px 0 ${s.accent}`:'';
    const controlShadow=`0 3px 8px ${s.accent}24,inset 0 1px 0 #ffffff40,inset 0 -2px 0 #00000012`;
    return {'--bv-bg':s.background,'--bv-panel':s.panel,'--bv-ink':s.panel===p.panel?p.ink:foreground(s.panel),'--bv-muted':s.panel===p.panel?p.muted:foreground(s.panel),
      '--bv-accent':s.accent,'--bv-on-accent':foreground(s.accent),
      '--bv-link':contrast(s.accent,s.panel)>=4.5?s.accent:s.panel===p.panel?p.ink:foreground(s.panel),
      '--bv-cover':s.cover,'--bv-cover-ink':foreground(s.cover),
      '--bv-radius':s.cardStyle==='square'?'2px':s.cardStyle==='round'?'22px':'10px',
      '--bv-card-shadow':s.effect==='glow'?'0 0 16px '+s.accent+'44':s.effect==='sticker'?'4px 4px 0 '+s.accent:'none',
      '--bv-surface':s.panel,'--bv-surface-image':texture,'--bv-surface-size':paper?'auto,7px 9px':'auto',
      '--bv-surface-shadow':materialShadow,'--bv-surface-edge':edge,
      '--bv-surface-card-shadow':materialShadow+finish,
      '--bv-surface-blur':paper||raised?'none':'blur(10px)',
      '--bv-glass-surface':paper||raised?s.panel:`color-mix(in srgb,${s.panel} 94%,transparent)`,
      '--bv-control-shadow':controlShadow,'--bv-control-card-shadow':controlShadow+finish,
      '--bv-cover-sheen':`linear-gradient(135deg,#ffffff30,transparent 48%,${s.accent}18)`,
      '--bv-pattern':motif(s.pattern),'--bv-pattern-size':['dots','stars','grid'].includes(s.pattern)?'24px 24px':s.pattern==='checker'?'48px 48px':s.pattern==='masi'?'120px 32px':'160px 140px',
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
  return {presets,patterns,fonts,normalize,read,encode,tokens,inline,safeLegacy,contrast,foreground,safeUrl};
});
