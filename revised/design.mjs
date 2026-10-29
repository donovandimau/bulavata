// The existing page designer owns persistence; this bridge only supplies route and account context.
const routes={welcome:'home',home:'home',people:'people',discover:'people',talanoa:'talanoa',music:'music',space:'profile',studio:'skins',world:'world',settings:'settings'};
export const designPage=page=>Object.prototype.hasOwnProperty.call(routes,page)?routes[page]:'home';
export function createDesigner(root){
 let context=null,initialized=false,decorationCleanup=null;
 const native=()=>root.SotaSpaceDesign;
 const getOwner=()=>context?.mode==='member'?context.owner:'sota-revised-sample';
 const getPage=()=>context?.page||'home';
 function decorate(dialog){decorationCleanup?.();decorationCleanup=null;if(dialog?.childElementCount&&native()?.decorateDialog)decorationCleanup=native().decorateDialog(dialog);return decorationCleanup||(()=>{});}
 function mount({app,dialog,page,mode='demo',owner=null}={}){
  const designer=native();if(!app||!designer?.mount||!designer?.init)return false;
  context={app,dialog,page:designPage(page),mode,owner:mode==='member'&&typeof owner==='string'&&owner?owner:null};
  // A loading member session must never borrow the guest's saved design.
  if(mode==='member'&&!context.owner){clear();return false;}
  app.dataset.frontPage=context.page;app.dataset.designScope=mode==='member'?'member':'sample';
  if(!initialized){designer.init({getOwner,getPage});initialized=true;}
  designer.mount(app,{getOwner,getPage,page:context.page});decorate(dialog);return true;
 }
 function open(){if(!context||!native()?.open)return false;native().open(context.page);return true;}
 function clear(){decorationCleanup?.();decorationCleanup=null;native()?.stop?.();context=null;initialized=false;}
 return {mount,open,decorate,clear};
}
if(typeof window!=='undefined'&&window.document)window.SotaRevisedDesign=createDesigner(window);
