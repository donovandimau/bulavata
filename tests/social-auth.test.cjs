const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const block=html.slice(html.indexOf('const SB_URL ='),html.indexOf('/* ---------- state ---------- */'));
async function run(hash,oauth){let result;const errors=[];const ctx={window:{supabase:{createClient:(_,__,opts)=>{assert.equal(opts.auth.detectSessionInUrl,false);return{auth:{setSession:async s=>{result=s;return{}}}}}},DimauSocialAuth:{create:()=>({complete:async()=>oauth})}},location:{hash,pathname:'/',search:''},URLSearchParams,history:{replaceState:()=>{}},setTimeout:fn=>fn(),toast:e=>errors.push(e)};vm.createContext(ctx);await vm.runInContext(block+'\nsocialReady;',ctx);return{result,errors};}
test('native inline scripts parse',()=>{for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);});
test('email confirmation is adopted through the SDK',async()=>assert.equal((await run('#access_token=a&refresh_token=b&type=signup',null)).result.access_token,'a'));
test('an unbound implicit OAuth hash is rejected',async()=>{const r=await run('#access_token=a&refresh_token=b',null);assert.equal(r.result,undefined);assert.equal(r.errors.length,1);});
test('verified PKCE session is adopted through the SDK',async()=>assert.equal((await run('',{access_token:'pkce'})).result.access_token,'pkce'));
test('signup confirmation returns to its allowed Sota origin',async()=>{
  const signup=html.slice(html.indexOf('const bandFor ='),html.indexOf('/* ================= SHELL ================= */'));
  for(const origin of ['https://sotakece.com','https://sotakece.vercel.app','https://bulavata.vercel.app']){
    let request; const pending=[];
    const inputs={'#a-go':{},'#a-err':{},'#a-handle':{value:'bula_test'},'#a-name':{value:'Test'},'#a-year':{value:String(new Date().getFullYear()-20)},'#a-email':{value:'test@example.com'},'#a-pass':{value:'test-password'}};
    const ctx={$:id=>inputs[id],location:{origin},localStorage:{setItem:(...args)=>pending.push(args)},sb:{rpc:async()=>({data:true}),auth:{signUp:async args=>{request=args;return{data:{session:null}}}}}};
    vm.createContext(ctx); await vm.runInContext(signup+'\nsignUp();',ctx);
    assert.equal(request.options.emailRedirectTo,origin+'/');
    assert.equal(pending[0][0],'bv_pending');
    assert.match(inputs['#a-err'].textContent,/Check your email/);
  }
});
