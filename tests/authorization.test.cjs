require('./load-typescript.cjs')
const test=require('node:test');const assert=require('node:assert/strict')
const id='11111111-1111-4111-8111-111111111111'
let verifiedUser={id};let row={id,rol:'admin',activo:true,comercio_id:'tenant'};let calls=0
const query={select(){return this},eq(){return this},async limit(){return {data:row?[row]:[],error:null}}}
const adapter=require.resolve('../src/lib/supabase-server.ts')
require.cache[adapter]={id:adapter,filename:adapter,loaded:true,exports:{
  async getUserFromBearer(){calls++;return {data:{user:verifiedUser}}},
  createPagesServerClient(){return {auth:{async getSession(){calls++;return {data:{session:{user:verifiedUser}}}}}}},
  createPagesAdminClient(){return {from(){return query}}}
}}
const {requireStaff,barberFields}=require('../src/lib/server-authorization.ts')
function response(){return {code:200,status(code){this.code=code;return this},json(body){this.body=body;return this}}}
test('body admin ID cannot authenticate a request',async()=>{
 const res=response();const result=await requireStaff({headers:{},body:{adminId:id}},res,['admin']);assert.equal(result,null);assert.equal(res.code,401);assert.equal(calls,0)
})
test('invalid bearer cannot authenticate',async()=>{
 verifiedUser=null;const res=response();assert.equal(await requireStaff({headers:{authorization:'Bearer invalid'}},res,['admin']),null);assert.equal(res.code,401);verifiedUser={id}
})
test('verified admin resolves tenant from membership',async()=>{
 const res=response();const actor=await requireStaff({headers:{authorization:'Bearer valid'},body:{comercio_id:'foreign'}},res,['admin']);assert.equal(actor.access.comercio_id,'tenant')
})
test('barber cannot perform admin actions',async()=>{
 row.rol='barbero';const res=response();assert.equal(await requireStaff({headers:{authorization:'Bearer valid'}},res,['admin']),null);assert.equal(res.code,403);row.rol='admin'
})
test('disabled admin is denied',async()=>{
 row.activo=false;const res=response();assert.equal(await requireStaff({headers:{cookie:'insforge_access_token=valid'}},res,['admin']),null);assert.equal(res.code,403);row.activo=true
})
test('unknown member with matching-looking email is denied',async()=>{
 const saved=row;row=null;verifiedUser={id,email:'contacto@chamosbarber.com'};const res=response();assert.equal(await requireStaff({headers:{authorization:'Bearer valid'}},res,['admin']),null);assert.equal(res.code,403);row=saved
})
test('barber edit strips tenant, role and audit fields',()=>assert.deepEqual(barberFields({nombre:'Nombre',comercio_id:'foreign',rol:'admin',created_by:id,id}),{nombre:'Nombre'}))
test('barber can edit own contact profile without changing commission',async()=>{
 row.rol='barbero';row.barbero_id=id;let written;query.update=(data)=>{written=data;return query};query.single=async()=>({data:{id},error:null})
 const handler=require('../src/pages/api/barberos/update.ts').default;const res=response()
 await handler({method:'PUT',headers:{authorization:'Bearer valid'},body:{barberoId:id,updates:{telefono:'12345678',porcentaje_comision:100,comercio_id:'foreign'}}},res)
 assert.equal(res.code,200);assert.equal(written.telefono,'12345678');assert.equal(written.porcentaje_comision,undefined);assert.equal(written.comercio_id,undefined);row.rol='admin'
})
test('barber profile endpoint rejects another barber',async()=>{
 row.rol='barbero';const handler=require('../src/pages/api/barberos/update.ts').default;const res=response()
 await handler({method:'PUT',headers:{authorization:'Bearer valid'},body:{barberoId:'foreign',updates:{telefono:'12345678'}}},res)
 assert.equal(res.code,403);row.rol='admin'
})
