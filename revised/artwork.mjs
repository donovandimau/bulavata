import {esc} from './core.mjs';

// Original generated artwork. Only these project-owned paths can be selected by data.
export const ARTWORK=Object.freeze({
 hero:{file:'hero.webp',alt:'Original illustration of friends gathering on a sunlit veranda beside a lagoon',shape:'wide'},
 making:{file:'making.webp',alt:'Original illustration of paper flowers, colored paper and tools on a sunny craft table',shape:'wide'},
 outside:{file:'outside.webp',alt:'Original illustration of a leafy coastal path beside clear lagoon water at sunset',shape:'wide'},
 music:{file:'music.webp',alt:'Original illustration of a record player, headphones and tea on a tropical veranda',shape:'wide'},
 food:{file:'food.webp',alt:'Original illustration of a colorful shared lunch with fruit, greens and warm flatbreads',shape:'wide'},
 photos:{file:'photos.webp',alt:'Original illustration of a camera, small printed photographs and a flower on a garden table',shape:'wide'},
 culture:{file:'culture.webp',alt:'Original illustration of family and friends sharing stories and a photo album',shape:'wide'},
 ani:{file:'ani.webp',alt:'Original illustrated portrait of Ani, a fictional sample person',shape:'square'},
 jo:{file:'jo.webp',alt:'Original illustrated portrait of Jo, a fictional sample person',shape:'square'},
 lani:{file:'lani.webp',alt:'Original illustrated portrait of Lani, a fictional sample person',shape:'square'},
 eli:{file:'eli.webp',alt:'Original illustrated portrait of Eli, a fictional sample person',shape:'square'},
 mika:{file:'mika.webp',alt:'Original illustrated portrait of Mika, a fictional sample person',shape:'square'},
 sela:{file:'sela.webp',alt:'Original illustrated portrait of Sela, a fictional sample person',shape:'square'},
 identity:{file:'identity.webp',alt:'Original white flower and lagoon-green leaves illustration',shape:'square'},
 'album-lagoon':{file:'album-lagoon.webp',alt:'Sea glass: original artwork of translucent sea glass and quiet shoreline light',shape:'square'},
 'album-gold':{file:'album-gold.webp',alt:'The long way home: original artwork of a winding path through golden tropical light',shape:'square'},
 'album-coral':{file:'album-coral.webp',alt:'After the rain: original artwork of rain-washed leaves and coral flowers',shape:'square'},
 'album-night':{file:'album-night.webp',alt:'Somewhere, together: original artwork of a moonlit sea and softly lit home',shape:'square'}
});
export const IDENTITY_ART=Object.freeze([['identity','Island bloom'],['album-lagoon','Sea glass'],['album-gold','Golden hour'],['album-coral','After the rain'],['album-night','Moonlight']]);
export const artworkSource=key=>'./assets/'+(Object.hasOwn(ARTWORK,key)?ARTWORK[key]:ARTWORK.identity).file;
export function artworkImage(key,{className='',decorative=false,eager=false}={}){const art=Object.hasOwn(ARTWORK,key)?ARTWORK[key]:ARTWORK.identity;return `<img class="artwork ${esc(className)}" src="${artworkSource(key)}" width="${art.shape==='wide'?1200:512}" height="${art.shape==='wide'?800:512}" alt="${decorative?'':esc(art.alt)}" loading="${eager?'eager':'lazy'}" decoding="async"${eager?' fetchpriority="high"':''}>`;}
export function identityArtwork(p,mode='demo'){if(mode!=='demo')return p?.emoji?null:'identity';if(['ani','jo','lani','eli','mika','sela'].includes(p?.id))return p.id;return IDENTITY_ART.some(([key])=>key===p?.avatarArt)?p.avatarArt:'identity';}
export const topicArtwork=key=>['making','outside','music','food','photos','culture'].includes(key)?key:'hero';
export function circleArtwork(c){return c?.id==='makers'?'making':c?.id==='sounds'||c?.type==='music'?'music':c?.id==='weekend'?'food':'hero';}
export function coverArtwork(p,mode='demo'){if(mode==='demo'&&p?.id!=='you'){return ({'Art & making':'making',Music:'music',Outdoors:'outside','Food & family':'food',Photography:'photos'}[p?.interest]||'culture');}return ({lagoon:'outside',coral:'hero',indigo:'album-night',forest:'culture'}[p?.theme]||'outside');}
export function albumArtwork(track){return ['lagoon','gold','coral','night'].includes(track?.id)?'album-'+track.id:track?.kind==='community'?'music':track?.kind==='local'?'album-night':'album-lagoon';}
