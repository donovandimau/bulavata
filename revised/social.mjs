import {id,cleanText,addPost,PEOPLE} from './core.mjs';

export const TOPICS=Object.freeze([
 {id:'music',name:'On repeat',label:'Music',emoji:'♫',color:'lavender',description:'Songs, sounds and something to feel.'},
 {id:'making',name:'Made by us',label:'Making',emoji:'✳',color:'peach',description:'Small projects. A lot of heart.'},
 {id:'outside',name:'The slow lane',label:'Outdoors',emoji:'↟',color:'sage',description:'Salt air, green things and the long way home.'},
 {id:'food',name:'At our table',label:'Food',emoji:'◒',color:'yellow',description:'Good food tastes better together.'},
 {id:'photos',name:'Little moments',label:'Photography',emoji:'▧',color:'blue',description:'Find the lovely in the everyday.'},
 {id:'culture',name:'Closer to home',label:'Culture',emoji:'✺',color:'rose',description:'Our stories, our roots, our way of being.'}
]);
const strings=v=>Array.isArray(v)?v.filter(x=>typeof x==='string').slice(0,200):[];
export const topicFor=p=>p.topic||({craft:'making',island:'outside',music:'music'}[p.art])||'';
export const personTopic=p=>({'Art & making':'making',Music:'music',Outdoors:'outside','Food & family':'food',Photography:'photos'}[p.interest]||'culture');
export function preferences(value={}){return {interests:strings(value?.interests).filter(t=>TOPICS.some(x=>x.id===t)),hidden:strings(value?.hidden),muted:strings(value?.muted)};}
export function upgradeSample(d){
 d.preferences=preferences(d.preferences);d.activity=Array.isArray(d.activity)?d.activity.filter(a=>a&&typeof a.text==='string'&&typeof a.at==='string').slice(0,40):[];
 d.profile.status=typeof d.profile.status==='string'?d.profile.status.slice(0,80):'';
 d.profile.song=['lagoon','gold','coral','night'].includes(d.profile.song)?d.profile.song:'lagoon';
 for(const p of d.posts){p.topic=TOPICS.some(t=>t.id===topicFor(p))?topicFor(p):'';if(!validPhoto(p.photo))delete p.photo;if(p.poll&&!validPoll(p.poll))delete p.poll;p.replyMode=p.replyMode==='off'?'off':'open';}
 if(!d.socialVersion){d.posts.push({id:'sample-poll',author:'eli',text:'One free Sunday. Where are we all heading?',topic:'food',art:'',createdAt:new Date(Date.now()-155*60000).toISOString(),likes:0,comments:[],poll:{options:['A table full of food','A walk by the water','Music in the garden'],votes:[0,0,0],choice:null}});d.socialVersion=1;}
 return d;
}
export function validPhoto(p){return !!p&&typeof p.src==='string'&&p.src.length<=400000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(p.src)&&typeof p.alt==='string'&&p.alt.length<=180;}
export function validPoll(p){return !!p&&Array.isArray(p.options)&&p.options.length>=2&&p.options.length<=4&&p.options.every(x=>typeof x==='string'&&x.length>0&&x.length<=80)&&Array.isArray(p.votes)&&p.votes.length===p.options.length&&p.votes.every(n=>Number.isInteger(n)&&n>=0)&&(p.choice===null||Number.isInteger(p.choice)&&p.choice>=0&&p.choice<p.options.length);}
export function createMoment(d,values){
 const text=cleanText(values.text),topic=TOPICS.some(t=>t.id===values.topic)?values.topic:'';
 let poll;if(values.kind==='poll'){const options=[values.option1,values.option2,values.option3,values.option4].map(x=>String(x||'').trim()).filter(Boolean);if(options.length<2||options.some(x=>x.length>80)||new Set(options.map(x=>x.toLowerCase())).size!==options.length)throw Error('Add at least two different poll choices, each under 80 characters.');poll={options,votes:options.map(()=>0),choice:null};}
 let photo;if(values.kind==='photo'){photo=values.photo;if(!validPhoto(photo)||!photo.alt.trim())throw Error('Choose a photo and add a short description of it.');if(d.posts.reduce((n,p)=>n+(p.photo?.src.length||0),0)+photo.src.length>2000000)throw Error('Your sample photo storage is full. Remove an older photo moment first.');}
 const p=addPost(d,text,values.kind==='words'?values.art:'');Object.assign(p,{topic,replyMode:values.replyMode==='off'?'off':'open'});if(poll)p.poll=poll;if(photo)p.photo=photo;recordActivity(d,'You shared a moment.');return p;
}
export function vote(p,index){if(!validPoll(p?.poll)||!Number.isInteger(index)||index<0||index>=p.poll.options.length)throw Error('That poll choice is not available.');const poll=p.poll;if(poll.choice!==null)poll.votes[poll.choice]=Math.max(0,poll.votes[poll.choice]-1);poll.choice=poll.choice===index?null:index;if(poll.choice!==null)poll.votes[index]++;return poll;}
export function editMoment(d,postId,values){const p=d.posts.find(x=>x.id===postId);if(!p||p.author!=='you')throw Error('You can only edit your own moments.');p.text=cleanText(values.text);p.replyMode=values.replyMode==='off'?'off':'open';p.edited=true;recordActivity(d,'You updated a moment.');return p;}
export function removeMoment(d,postId){const index=d.posts.findIndex(x=>x.id===postId&&x.author==='you');if(index<0)throw Error('You can only remove your own moments.');const [post]=d.posts.splice(index,1);if(d.profile.pinned===postId)delete d.profile.pinned;return {post,index};}
export function restoreMoment(d,removed){if(removed&&!d.posts.some(p=>p.id===removed.post.id))d.posts.splice(Math.min(removed.index,d.posts.length),0,removed.post);}
export function recordActivity(d,text){d.activity??=[];d.activity.unshift({id:id(),text,at:new Date().toISOString()});d.activity=d.activity.slice(0,40);}
export function selectFeed(posts,prefs,filter,{owner='you',friends=[],saved=[],topic=''}={}){
 const p=preferences(prefs);let list=posts.filter(x=>!p.hidden.includes(x.id)&&!p.muted.includes(x.author)&&(!topic||topicFor(x)===topic));
 if(filter==='saved')list=list.filter(x=>saved.includes(x.id));if(filter==='mine')list=list.filter(x=>x.author===owner);if(filter==='following')list=list.filter(x=>x.author===owner||friends.includes(x.author));
 return [...list].sort((a,b)=>{if(filter==='all'){const score=x=>x.author===owner?3:p.interests.includes(topicFor(x))?2:friends.includes(x.author)?1:0;const diff=score(b)-score(a);if(diff)return diff;}return new Date(b.createdAt)-new Date(a.createdAt);});
}
export function feedReason(p,prefs,friends,owner){return p.author===owner?'A moment from you':preferences(prefs).interests.includes(topicFor(p))?'Because you follow '+(TOPICS.find(t=>t.id===topicFor(p))?.label||'this topic'):friends.includes(p.author)?'From your people':'From the sample community';}
export function safeLink(value){if(!value)return '';try{const u=new URL(String(value));return u.protocol==='https:'&&!u.username&&!u.password?u.href.slice(0,300):'';}catch{return '';}}
export function searchLocal(query,{posts=[],people=PEOPLE,circles=[]}={}){const q=String(query).trim().toLowerCase().slice(0,100);if(!q)return {posts:[],people:[],circles:[]};const has=s=>String(s||'').toLowerCase().includes(q);return {posts:posts.filter(p=>has(p.text)).slice(0,10),people:people.filter(p=>has(p.name)||has(p.handle)||has(p.interest)).slice(0,8),circles:circles.filter(c=>has(c.name)||has(c.description)).slice(0,8)};}
