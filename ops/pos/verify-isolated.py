import json, subprocess, pathlib, urllib.request, urllib.error, time, base64, hmac, hashlib, uuid, concurrent.futures
def run(*a):return subprocess.check_output(a,text=True,stderr=subprocess.STDOUT,timeout=45)
folder=pathlib.Path('/root/chamos-pos-20260911');db='chamos_pos_verify_20260911'
cs=json.loads(run('docker','inspect',*run('docker','ps','-q').split()))
pg=next(c for c in cs if c['Name'].startswith('/postgres-'));pe=dict(x.split('=',1) for x in pg['Config']['Env']);assert db!=pe['POSTGRES_DB']
app=next(c for c in cs if c['Name'].startswith('/pos0'));forge=next(c for c in cs if c['Name']=='/chamos-pos-forge-test');fe=dict(x.split('=',1) for x in forge['Config']['Env']);assert fe['POSTGRES_DB']==db
def sql(q):
 p=subprocess.run(['docker','exec','-i',pg['Name'][1:],'psql','-U',pe['POSTGRES_USER'],'-d',db,'-XAt','-v','ON_ERROR_STOP=1'],input=q,text=True,capture_output=True,timeout=45)
 if p.returncode:raise RuntimeError(p.stderr[-1800:])
 return p.stdout.strip()
for file in ['20260911_pos_rpc_permissions.sql','20260911_pos_register_transactions.sql']:
 sql((folder/'source'/'database'/'migrations'/file).read_text())
print('PASS latest migrations in isolated database')
ae=dict(x.split('=',1) for x in app['Config']['Env']);ae['INSFORGE_INTERNAL_URL']='http://chamos-pos-forge-test:7130'
ef=folder/'test-app.env';ef.write_text('\n'.join(k+'='+v for k,v in ae.items())+'\n');ef.chmod(0o600)
if any(c['Name']=='/chamos-pos-app-test' for c in cs):run('docker','rm','-f','chamos-pos-app-test')
run('docker','run','-d','--name','chamos-pos-app-test','--network','coolify','--env-file',str(ef),'chamos-pos-candidate:20260911')
ip=json.loads(run('docker','inspect','chamos-pos-app-test'))[0]['NetworkSettings']['Networks']['coolify']['IPAddress'];base='http://'+ip+':3000'
def request(path,body=None,token=None,origin=base,method=None):
 headers={'Content-Type':'application/json','User-Agent':'node','Host':'old.chamosbarber.com'}
 if token:headers.update(Authorization='Bearer '+token,Cookie='insforge_access_token='+token)
 req=urllib.request.Request(origin+path,data=json.dumps(body).encode() if body is not None else None,headers=headers,method=method or ('POST' if body is not None else 'GET'))
 try:
  with urllib.request.urlopen(req,timeout=25) as r:status,content=r.status,r.read()
 except urllib.error.HTTPError as e:status,content=e.code,e.read()
 try:return status,json.loads(content)
 except Exception:return status,content.decode()[:200]
for _ in range(20):
 try:
  if request('/api/health')[0]==200:break
 except Exception:time.sleep(1)
else:raise RuntimeError('Candidate health failed')
rows=json.loads(sql("SELECT json_agg(row_to_json(t)) FROM (SELECT a.id,a.rol,a.barbero_id,a.comercio_id,u.email FROM admin_users a JOIN auth.users u ON u.id=a.id WHERE a.activo AND a.rol IN ('admin','cajero','barbero')) t;"))
owner=next(r for r in rows if r['id']=='4ce7e112-12a7-4909-b922-59fa1fdafc0b');barber=next(r for r in rows if r['rol']=='barbero' and r['barbero_id']!='82b2218c-e6ef-4440-bb3b-4dc4d7afe864' and r['comercio_id']==owner['comercio_id']);tenant=owner['comercio_id']
sql("UPDATE admin_users SET rol='admin' WHERE id='"+owner['id']+"';")
cashier=next(r for r in rows if r['comercio_id']==tenant and r['id'] not in [owner['id'],barber['id']]);sql("UPDATE admin_users SET rol='cajero' WHERE id='"+cashier['id']+"';")
def token(row):
 enc=lambda v:base64.urlsafe_b64encode(json.dumps(v,separators=(',',':')).encode()).decode().rstrip('=')
 d=enc({'alg':'HS256','typ':'JWT'})+'.'+enc({'sub':row['id'],'email':row['email'],'role':'authenticated','iat':int(time.time()),'exp':int(time.time())+3600})
 return d+'.'+base64.urlsafe_b64encode(hmac.new(fe['JWT_SECRET'].encode(),d.encode(),hashlib.sha256).digest()).decode().rstrip('=')
admin_token=token(owner);cash_token=token(cashier);barber_token=token(barber)
passed=[]
def check(label,path,body=None,expected=200,t=admin_token):
 status,result=request(path,body,t)
 assert status==expected,(label,status,result)
 passed.append(label);print('PASS',label,status,flush=True);return result
for path in ['/api/pos/registrar-venta','/api/pos/corregir-venta','/api/pos/anular-venta','/api/pos/caja','/api/pos/corregir-cita']:
 check('anonymous denied '+path,path,{'facturaId':'00000000-0000-4000-8000-000000000000'},401,None)
check('barber cannot operate POS','/api/pos/registrar-venta',{},403,barber_token)
check('barber cannot open cash register','/api/pos/caja',{'action':'open','monto':0},403,barber_token)
legacy=check('legacy open register loads cash totals','/api/pos/caja')
if legacy['sesion']:
 check('legacy register closes atomically','/api/pos/caja',{'action':'close','sesion_id':legacy['sesion']['id'],'monto':legacy['sesion']['monto_final_esperado']})
# Isolated fixture reset: no modifications here touch the production database.
sql("UPDATE caja_sesiones SET estado='cerrada',fecha_cierre=now() WHERE estado='abierta';")
opened=check('open register with 5000 float','/api/pos/caja',{'action':'open','monto':5000});sid=opened['sesion']['id'];assert opened['sesion']['monto_final_esperado']==5000
again=check('retry opening reuses register','/api/pos/caja',{'action':'open','monto':9999});assert again['sesion']['id']==sid
assert sql("SELECT count(*) FROM movimientos_caja WHERE sesion_id='"+sid+"' AND tipo='apertura';")=='1'
check('negative float rejected','/api/pos/caja',{'action':'open','monto':-1},400)
services=json.loads(sql("SELECT json_agg(row_to_json(s)) FROM (SELECT id,nombre,precio FROM servicios WHERE comercio_id='"+tenant+"' AND activo ORDER BY precio DESC) s;"))
svc=next(s for s in services if s['precio']==14000);other=next(s for s in services if s['id']!=svc['id'])
barbers=json.loads(sql("SELECT json_agg(row_to_json(b)) FROM (SELECT id,porcentaje_comision FROM barberos WHERE comercio_id='"+tenant+"' AND activo) b;"))
b=next(b for b in barbers if b['porcentaje_comision']==60);b2=next(x for x in barbers if x['id']!=b['id'])
pin=sql("SELECT valor FROM sitio_configuracion WHERE comercio_id='"+tenant+"' AND clave='pos_clave_seguridad';")
def sale(**kwargs):return {'barbero_id':b['id'],'cliente_nombre':'POS VERIFY','tipo_documento':'boleta','metodo_pago':'efectivo','items':[{'servicio_id':svc['id'],'cantidad':1}],'monto_recibido':20000,'caja_sesion_id':sid,'request_id':str(uuid.uuid4()),**kwargs}
for method in ['efectivo','tarjeta','transferencia','zelle','binance','pago_movil','otro']:
 f=check('payment '+method,'/api/pos/registrar-venta',sale(metodo_pago=method))['factura']
 assert f['total']==14000 and f['comision_barbero']==8400 and f['cambio']==(6000 if method=='efectivo' else 0)
cash=check('only cash enters expected cash total','/api/pos/caja');assert cash['sesion']['monto_final_esperado']==19000
retry=sale();f=check('idempotent sale first attempt','/api/pos/registrar-venta',retry)['factura'];again=check('idempotent sale retry','/api/pos/registrar-venta',retry)['factura'];assert again['id']==f['id']
check('insufficient cash rejected','/api/pos/registrar-venta',sale(monto_recibido=1),400)
check('invoice requires RUT','/api/pos/registrar-venta',sale(tipo_documento='factura'),400)
check('invoice with RUT','/api/pos/registrar-venta',sale(tipo_documento='factura',cliente_rut='12.345.678-5'))
product=str(uuid.uuid4());sql("INSERT INTO productos(id,nombre,precio_venta,stock_actual,comercio_id) VALUES ('"+product+"','POS VERIFY',5000,3,'"+tenant+"');")
mixed=sale(items=[{'servicio_id':svc['id'],'cantidad':2},{'servicio_id':other['id'],'cantidad':1},{'producto_id':product,'cantidad':2}],metodo_pago='tarjeta')
mixf=check('multiple services products quantities','/api/pos/registrar-venta',mixed)['factura'];assert mixf['total']==38000+other['precio'];assert sql("SELECT stock_actual FROM productos WHERE id='"+product+"';")=='1'
check('wrong cancellation PIN rejected','/api/pos/anular-venta',{'facturaId':mixf['id'],'claveSeguridad':'invalid-pos-test'},403)
changed=check('payment-only correction','/api/pos/corregir-venta',{'facturaId':mixf['id'],'nuevoMetodoPago':'efectivo','claveSeguridad':pin})
assert changed['data']['total']==mixf['total']
check('service-only correction retains other items','/api/pos/corregir-venta',{'facturaId':mixf['id'],'nuevoServicioId':other['id'],'claveSeguridad':pin})
items=json.loads(sql("SELECT items FROM facturas WHERE id='"+mixf['id']+"';"));assert len(items)==3 and items[0]['cantidad']==2 and items[2]['producto_id']==product
check('barber correction recalculates commission','/api/pos/corregir-venta',{'facturaId':mixf['id'],'nuevoBarberoId':b2['id'],'claveSeguridad':pin})
check('cancellation restores stock','/api/pos/anular-venta',{'facturaId':mixf['id'],'claveSeguridad':pin});assert sql("SELECT stock_actual FROM productos WHERE id='"+product+"';")=='3'
# The exact reported appointment is copied from production; reset it only here.
appointment='95185059-97c7-4bdb-ab28-25e5a8decb6c'
sql("UPDATE facturas SET anulada=true WHERE cita_id='"+appointment+"'; UPDATE citas SET estado_pago='pendiente' WHERE id='"+appointment+"';")
orig=json.loads(sql("SELECT json_build_object('barbero_id',barbero_id,'items',items) FROM citas WHERE id='"+appointment+"';"))
booked=sale(cita_id=appointment,barbero_id=orig['barbero_id'],items=orig['items'],monto_cobrado=14000)
f=check('reported appointment 14000 through HTTP','/api/pos/registrar-venta',booked)['factura'];assert f['total']==14000 and f['comision_barbero']==8400
check('duplicate appointment rejected','/api/pos/registrar-venta',{**booked,'request_id':str(uuid.uuid4())},409)
check('paid appointment cannot be edited as unpaid','/api/pos/corregir-cita',{'cita_id':appointment,'barbero_id':orig['barbero_id'],'servicio_id':svc['id']},409)
check('cancel appointment payment','/api/pos/anular-venta',{'facturaId':f['id'],'claveSeguridad':pin})
assert sql("SELECT estado_pago FROM citas WHERE id='"+appointment+"';")=='pendiente'
f=check('discounted appointment recobro','/api/pos/registrar-venta',{**booked,'request_id':str(uuid.uuid4()),'monto_cobrado':10000})['factura'];assert f['descuento']==4000 and f['comision_barbero']==6000
check('method change retains appointment discount','/api/pos/corregir-venta',{'facturaId':f['id'],'nuevoMetodoPago':'zelle','claveSeguridad':pin})
assert sql("SELECT descuento FROM facturas WHERE id='"+f['id']+"';") in ['4000','4000.00']
check('cancel discounted appointment','/api/pos/anular-venta',{'facturaId':f['id'],'claveSeguridad':pin})
check('edit unpaid appointment service','/api/pos/corregir-cita',{'cita_id':appointment,'barbero_id':orig['barbero_id'],'servicio_id':other['id']})
updated=json.loads(sql("SELECT json_build_object('items',items,'precio_final',precio_final) FROM citas WHERE id='"+appointment+"';"));assert updated['items'][0]['servicio_id']==other['id'] and updated['precio_final']==other['precio']
check('restore unpaid appointment service','/api/pos/corregir-cita',{'cita_id':appointment,'barbero_id':orig['barbero_id'],'servicio_id':svc['id']})
f=check('appointment surcharge','/api/pos/registrar-venta',{**booked,'request_id':str(uuid.uuid4()),'monto_cobrado':16000})['factura'];assert f['total']==16000 and f['comision_barbero']==9600
# Stock and numbering must remain correct under simultaneous requests.
sql("UPDATE productos SET stock_actual=1 WHERE id='"+product+"';")
with concurrent.futures.ThreadPoolExecutor(2) as pool:
 results=list(pool.map(lambda _:request('/api/pos/registrar-venta',sale(items=[{'producto_id':product,'cantidad':1}]),admin_token),range(2)))
assert sorted(r[0] for r in results)==[200,409],results
print('PASS concurrent last unit sold once');passed.append('concurrent stock')
assert sql("SELECT stock_actual FROM productos WHERE id='"+product+"';")=='0'
with concurrent.futures.ThreadPoolExecutor(2) as pool:
 same=sale(metodo_pago='tarjeta');results=list(pool.map(lambda _:request('/api/pos/registrar-venta',same,admin_token),range(2)))
assert all(r[0]==200 for r in results) and results[0][1]['factura']['id']==results[1][1]['factura']['id']
print('PASS concurrent retry creates one receipt');passed.append('concurrent retry')
cashreg=check('cashier opens independent register','/api/pos/caja',{'action':'open','monto':1000},t=cash_token)
cashsale=check('cashier sale','/api/pos/registrar-venta',sale(caja_sesion_id=cashreg['sesion']['id']),t=cash_token)['factura']
check('other cashier cannot close owner register','/api/pos/caja',{'action':'close','sesion_id':sid,'monto':0},409,cash_token)
snapshot=check('closing totals read from database','/api/pos/caja');expected=snapshot['sesion']['monto_final_esperado']
closed=check('atomic closing with cash reconciliation','/api/pos/caja',{'action':'close','sesion_id':sid,'monto':expected,'notas':'POS VERIFY'})
assert closed['cierre']['diferencia']==0 and closed['cierre']['total_ventas']==snapshot['total_ventas']
assert sql("SELECT cierre_caja_id IS NULL FROM facturas WHERE id='"+cashsale['id']+"';")=='t'
check('closed register refuses new sale','/api/pos/registrar-venta',sale(),409)
check('closed invoice refuses cancellation','/api/pos/anular-venta',{'facturaId':f['id'],'claveSeguridad':pin},409)
check('duplicate closure rejected','/api/pos/caja',{'action':'close','sesion_id':sid,'monto':expected},409)
opened2=check('second turn same day can open','/api/pos/caja',{'action':'open','monto':0})
check('second turn same day can close','/api/pos/caja',{'action':'close','sesion_id':opened2['sesion']['id'],'monto':0})
# Actual user-token PostgREST reads used by list, report and receipt generation.
forge_ip=forge['NetworkSettings']['Networks']['coolify']['IPAddress'];origin='http://'+forge_ip+':7130'
for label,path in [('receipt','facturas?select=id,numero_factura,items,total,barbero:barberos!facturas_barbero_id_fkey(nombre,apellido)&id=eq.'+f['id']),('summary','facturas?select=id,total,comision_barbero,ingreso_casa,metodo_pago&caja_sesion_id=eq.'+sid),('commissions','barberos_resumen?select=*&limit=5')]:
 status,data=request('/api/database/records/'+path,token=admin_token,origin=origin);assert status==200,(label,status,data);print('PASS authenticated '+label);passed.append(label)
for name,args in [('app_record_sale',{'p_data':{}}),('app_cash_register',{'p_comercio':tenant,'p_actor':owner['id'],'p_action':'get','p_data':{}})]:
 status,data=request('/api/database/rpc/'+name,args,admin_token,origin);assert status in [401,403,404],(name,status,data);print('PASS server-only RPC '+name)
# Barber completion must use the same atomic invoice path and their own appointment.
own_cita=str(uuid.uuid4())
sql("INSERT INTO citas(id,comercio_id,barbero_id,servicio_id,cliente_nombre,cliente_telefono,fecha,hora,estado,estado_pago,items) VALUES ('"+own_cita+"','"+tenant+"','"+barber['barbero_id']+"','"+svc['id']+"','POS VERIFY','000000000',date '2099-01-01'+floor(random()*30000)::int,'12:00','confirmada','pendiente','"+json.dumps([{'servicio_id':svc['id'],'cantidad':1,'precio':14000,'subtotal':14000,'nombre':'Combo'}])+"');")
check('barber cannot charge another appointment','/api/barbero/completar-cita-con-cobro',{'cita_id':appointment,'monto_cobrado':14000,'metodo_pago':'efectivo'},403,barber_token)
check('barber completes own appointment with payment','/api/barbero/completar-cita-con-cobro',{'cita_id':own_cita,'monto_cobrado':14000,'metodo_pago':'efectivo'},200,barber_token)
check('barber duplicate payment rejected','/api/barbero/completar-cita-con-cobro',{'cita_id':own_cita,'monto_cobrado':14000,'metodo_pago':'efectivo'},409,barber_token)
manifest={'passed':len(passed),'cases':passed,'database':db,'image':run('docker','image','inspect','chamos-pos-candidate:20260911','--format','{{.Id}}').strip()}
(folder/'http-tests.json').write_text(json.dumps(manifest,indent=2));print('ALL_HTTP_POS_TESTS_PASSED',len(passed))
