require('./load-typescript.cjs')
const test=require('node:test');const assert=require('node:assert/strict')
process.env.NEXT_PUBLIC_INSFORGE_BASE_URL='https://insforge.invalid'
process.env.INSFORGE_INTERNAL_URL='http://insforge.internal:7130'
process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY='public-anon'
process.env.INSFORGE_API_KEY='ik_test_nonsecret'
test('installed SDK sends admin API key to the internal backend',async()=>{
 const saved=global.fetch;let called
 global.fetch=async(url,options)=>{called={url:String(url),headers:new Headers(options.headers)};return new Response('[]',{status:200,headers:{'content-type':'application/json'}})}
 try{const sdkPath=require.resolve('@insforge/sdk');require.cache[sdkPath]={id:sdkPath,filename:sdkPath,loaded:true,exports:await import('@insforge/sdk')};const {createPagesAdminClient}=require('../src/lib/supabase-server.ts');const r=await createPagesAdminClient().from('admin_users').select('id');assert.equal(r.error,null);assert.ok(called.url.startsWith('http://insforge.internal:7130/'));assert.equal(called.headers.get('authorization'),'Bearer ik_test_nonsecret')}
 finally{global.fetch=saved}
})
