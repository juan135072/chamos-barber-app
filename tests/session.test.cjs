require('./load-typescript.cjs')
const test=require('node:test');const assert=require('node:assert/strict')
let native;let requests=0
const token=(exp)=>'header.'+Buffer.from(JSON.stringify({exp})).toString('base64url')+'.signature'
const fresh={user:{id:'test-user'},access_token:token(Math.floor(Date.now()/1000)+900)}
global.window={};global.fetch=async()=>{requests++;return {ok:true,json:async()=>({session:fresh})}}
const sdkFile=require.resolve('../src/lib/supabase.ts')
require.cache[sdkFile]={id:sdkFile,filename:sdkFile,loaded:true,exports:{supabase:{_insforge:{tokenManager:{getSession:()=>native,saveSession:(value)=>{native=value}}}}}}
const {getAppSession}=require('../src/lib/app-session.ts')
test('fresh in-memory sessions avoid unnecessary restoration',async()=>{
 native={accessToken:fresh.access_token,user:fresh.user};requests=0
 assert.equal((await getAppSession()).user.id,'test-user');assert.equal(requests,0)
})
test('expired in-memory access token is refreshed through the app cookie endpoint',async()=>{
 native={accessToken:token(1),user:fresh.user};requests=0
 assert.equal((await getAppSession()).access_token,fresh.access_token);assert.equal(requests,1);assert.equal(native.accessToken,fresh.access_token)
})
test('simultaneous requests share one session restoration',async()=>{
 native=null;requests=0;await Promise.all([getAppSession(),getAppSession(),getAppSession()]);assert.equal(requests,1)
})
