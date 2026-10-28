export const THEMES = Object.freeze({lagoon:{name:'Lagoon',color:'#245b53',paper:'#f8f6ef'},coral:{name:'Coral',color:'#984c3e',paper:'#fbf1e9'},indigo:{name:'Indigo',color:'#514a7b',paper:'#f4f2f8'},forest:{name:'Forest',color:'#3e6144',paper:'#f4f5e9'}});
export const DEMO_KEY='sota.revised.sample.v1';
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const id=()=>globalThis.crypto?.randomUUID?.()||'local-'+Date.now()+'-'+Math.random().toString(36).slice(2);
export const clone=v=>JSON.parse(JSON.stringify(v));
export function cleanText(value,max=500){const text=String(value??'').trim();if(!text)throw Error('Add a little something first.');if(text.length>max)throw Error(`Keep it to ${max} characters.`);return text;}
export function initials(name){return String(name||'?').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();}
export function timeAgo(value,now=Date.now()){const n=Math.max(0,(now-new Date(value).getTime())/60000);return !Number.isFinite(n)?'':n<1?'Just now':n<60?`${Math.floor(n)}m ago`:n<1440?`${Math.floor(n/60)}h ago`:`${Math.floor(n/1440)}d ago`;}
export const PEOPLE=[
 {id:'ani',name:'Ani Vula',handle:'ani.makes',emoji:'🌺',color:'peach',bio:'Making small things with a lot of heart.',interest:'Art & making'},
 {id:'jo',name:'Jo Roko',handle:'jo.on.repeat',emoji:'🎧',color:'lavender',bio:'Always looking for the next good song.',interest:'Music'},
 {id:'lani',name:'Lani Mere',handle:'lani.outside',emoji:'🌿',color:'sage',bio:'Slow walks. Salt air. Good company.',interest:'Outdoors'},
 {id:'eli',name:'Eli Tui',handle:'eli.cooks',emoji:'🍋',color:'yellow',bio:'A full table is a good table.',interest:'Food & family'},
 {id:'mika',name:'Mika Sere',handle:'mika.stories',emoji:'📷',color:'blue',bio:'Collecting the moments between the plans.',interest:'Photography'},
 {id:'sela',name:'Sela Namu',handle:'sela.grows',emoji:'🪴',color:'rose',bio:'Growing a little garden and a big circle.',interest:'Outdoors'}
];
export function seed(now=Date.now()){
 const at=m=>new Date(now-m*60000).toISOString();
 return {version:1,profile:{id:'you',name:'Your name',handle:'your.space',emoji:'☀️',bio:'A little corner of the world, made my own.',theme:'lagoon',color:'sage',interest:'Good company'},friends:['ani','jo','lani'],requests:[],saved:[],liked:[],favorites:[],
 posts:[{id:'post-1',author:'ani',text:'A little reminder to make something with your hands this week. It doesn’t have to be perfect. It just has to be yours.',createdAt:at(24),art:'craft',likes:12,comments:[{id:'c1',author:'lani',text:'Needed this little nudge today. 🌼',createdAt:at(18)}]},
 {id:'post-2',author:'lani',text:'Took the long way home. Very glad I did.',createdAt:at(75),art:'island',likes:24,comments:[]},
 {id:'post-3',author:'jo',text:'Tonight’s plan: one good playlist, nowhere to rush. What’s your go-to wind-down song?',createdAt:at(126),art:'music',likes:9,comments:[{id:'c2',author:'eli',text:'Anything that sounds good while dinner’s cooking.',createdAt:at(110)}]}],
 circles:[{id:'weekend',name:'The weekend people',emoji:'☀️',description:'Small adventures. Good company.',members:5,type:'family',color:'peach',joined:true},{id:'sounds',name:'On repeat',emoji:'🎧',description:'The songs we keep coming back to.',members:4,type:'music',color:'lavender',joined:true},{id:'makers',name:'Made by us',emoji:'✂️',description:'A place for your next little project.',members:3,type:'other',color:'sage',joined:false}],
 messages:{weekend:[{id:'m1',author:'lani',text:'Who’s up for a slow morning and a walk by the water?',createdAt:at(38)},{id:'m2',author:'eli',text:'I’ll bring something to share. 🍋',createdAt:at(30)},{id:'m3',author:'ani',text:'That sounds like exactly the right kind of plan.',createdAt:at(26)}],sounds:[{id:'m4',author:'jo',text:'Welcome to On repeat. Drop a song or tell us what you’re listening to.',createdAt:at(90)}],makers:[]}};
}
function validSample(v){
 const text=x=>typeof x==='string',message=m=>m&&text(m.id)&&text(m.author)&&text(m.text)&&text(m.createdAt);
 return v?.version===1&&v.profile?.id==='you'&&text(v.profile.name)&&text(v.profile.handle)&&text(v.profile.bio)&&text(v.profile.emoji)&&Boolean(THEMES[v.profile.theme])
 &&['friends','liked','saved','favorites','requests'].every(k=>Array.isArray(v[k])&&v[k].every(text))
 &&Array.isArray(v.posts)&&v.posts.every(p=>message(p)&&Number.isFinite(p.likes)&&Array.isArray(p.comments)&&p.comments.every(message))
 &&Array.isArray(v.circles)&&v.circles.every(c=>c&&text(c.id)&&text(c.name)&&text(c.description)&&typeof c.joined==='boolean'&&Number.isFinite(c.members))
 &&v.messages&&typeof v.messages==='object'&&!Array.isArray(v.messages)&&Object.values(v.messages).every(a=>Array.isArray(a)&&a.every(message));
}
export function loadDemo(storage){try{const v=JSON.parse(storage.getItem(DEMO_KEY));if(validSample(v))return v;}catch{}return seed();}
export function saveDemo(storage,data){try{storage.setItem(DEMO_KEY,JSON.stringify(data));return true;}catch{return false;}}
export function toggle(list,value){const i=list.indexOf(value);if(i<0)list.push(value);else list.splice(i,1);return i<0;}
export function addPost(data,text,art=''){const p={id:id(),author:'you',text:cleanText(text),art:['','island','craft','music'].includes(art)?art:'',createdAt:new Date().toISOString(),likes:0,comments:[]};data.posts.unshift(p);data.posts=data.posts.slice(0,80);return p;}
export function addMessage(data,circle,text){const c=data.circles.find(c=>c.id===circle);if(!c?.joined)throw Error('Join this circle before writing.');const m={id:id(),author:'you',text:cleanText(text,1200),createdAt:new Date().toISOString()};data.messages[circle]??=[];data.messages[circle].push(m);data.messages[circle]=data.messages[circle].slice(-200);return m;}
export function addComment(data,post,text){const p=data.posts.find(p=>p.id===post);if(!p)throw Error('That moment is no longer available.');p.comments??=[];p.comments.push({id:id(),author:'you',text:cleanText(text,300),createdAt:new Date().toISOString()});return p;}
export function updateProfile(data,values){data.profile={...data.profile,name:cleanText(values.name,40),bio:String(values.bio||'').trim().slice(0,400),emoji:String(values.emoji||'☀️').slice(0,8),theme:THEMES[values.theme]?values.theme:'lagoon'};return data.profile;}
export function newCircle(data,name,description){const c={id:id(),name:cleanText(name,60),description:String(description||'').slice(0,180),emoji:'💬',color:'sage',type:'other',members:1,joined:true};data.circles.push(c);data.messages[c.id]=[];return c;}
export function parseRoute(hash){const [page,arg]=String(hash||'').replace(/^#/,'').split('/');return {page:['welcome','home','discover','people','talanoa','music','space','studio','world','settings'].includes(page)?page:'welcome',arg:decodeURIComponentSafe(arg||'')};}
function decodeURIComponentSafe(s){try{return decodeURIComponent(s);}catch{return '';}}
export function validateCatalogue(raw){const tracks=Array.isArray(raw)?raw:raw?.tracks;if(!Array.isArray(tracks))throw Error('The playlist could not load.');return tracks.filter(t=>t&&typeof t.id==='string'&&typeof t.title==='string'&&/^(?:fiji-default-soundtrack|fiji-(?:remix|song)-\d{2,3})\.mp3$/.test(t.path)).slice(0,500).map(t=>({id:'community-'+t.id,title:t.title.slice(0,250),artist:'Community mix',kind:'community',art:'coral',url:'https://xnxmumbvgtmlpenutlii.supabase.co/storage/v1/object/public/fiji-audio/'+t.path}));}
