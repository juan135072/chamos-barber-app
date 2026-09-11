require('./load-typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const { calculateSale, SaleValidationError } = require('../src/lib/sale-validation.ts')
const { validateBookingInput, appointmentDuration, localWallTimestamp } = require('../src/lib/booking-validation.ts')
const id = '11111111-1111-4111-8111-111111111111'
const booking = { barbero_id: id, servicio_id: id, fecha: '2099-01-01', hora: '10:30', cliente_nombre: 'Prueba', cliente_telefono: '+56912345678' }
test('valid booking and repeated services are accepted', () => {
  assert.equal(validateBookingInput(booking), null)
  assert.equal(validateBookingInput({...booking, servicios_ids: [id,id]}), null)
})
for (const [field,value] of [['fecha','2026-02-30'],['hora','24:00'],['barbero_id','bad'],['cliente_nombre',' '],['cliente_telefono','123'],['servicios_ids',[]],['notas','x'.repeat(2001)]]) {
  test(`booking rejects invalid ${field}`, () => assert.ok(validateBookingInput({...booking,[field]:value})))
}
test('appointment duration sums quantities and respects zero buffer', () => {
  assert.equal(appointmentDuration({items:[{servicio_id:id,cantidad:2,duracion_minutos:40,tiempo_buffer:0}]},new Map()),80)
  assert.equal(appointmentDuration({servicio_id:id},new Map([[id,{duracion_minutos:20,tiempo_buffer:0}]])),20)
})
test('blocked ranges use Santiago summer and winter clocks', () => {
  assert.equal(localWallTimestamp(new Date('2026-01-15T15:00:00Z'),'America/Santiago'),Date.parse('2026-01-15T12:00:00Z'))
  assert.equal(localWallTimestamp(new Date('2026-07-15T15:00:00Z'),'America/Santiago'),Date.parse('2026-07-15T11:00:00Z'))
})
const catalog = new Map([['servicio:'+id,{activo:true,nombre:'Corte',precio:10000}]])
const sale = {items:[{servicio_id:id,cantidad:2,precio:1,subtotal:2}],total:2,metodo_pago:'efectivo',tipo_documento:'boleta',monto_recibido:25000}
test('sale ignores forged prices, totals and commission', () => {
  const result = calculateSale({...sale,comision_barbero:0},{porcentaje_comision:40},catalog)
  assert.equal(result.total,20000); assert.equal(result.comision_barbero,8000);assert.equal(result.ingreso_casa,12000);assert.equal(result.cambio,5000)
})
test('zero commission is preserved', () => assert.equal(calculateSale(sale,{porcentaje_comision:0},catalog).comision_barbero,0))
test('explicit staff appointment adjustment is preserved', () => assert.equal(calculateSale({...sale,cita_id:id,monto_cobrado:15000},{},catalog).total,15000))
for (const [label,change] of [['negative quantity',{items:[{servicio_id:id,cantidad:-1}]}],['missing article',{items:[null]}],['unknown article',{items:[{servicio_id:'foreign',cantidad:1}]}],['insufficient cash',{monto_recibido:1}],['nonfinite adjustment',{cita_id:id,monto_cobrado:NaN}],['unbooked adjustment',{monto_cobrado:1}],['payment',{metodo_pago:'free'}],['invoice without RUT',{tipo_documento:'factura'}]]) {
 test(`sale rejects ${label}`, () => assert.throws(()=>calculateSale({...sale,...change},{},catalog),SaleValidationError))
}
test('updated PDF and spreadsheet libraries export readable documents', () => {
  const {jsPDF}=require('jspdf');const {autoTable}=require('jspdf-autotable');const doc=new jsPDF();autoTable(doc,{head:[['Total']],body:[['10000']]});assert.ok(doc.output('arraybuffer').byteLength>1000)
  const xlsx=require('xlsx');const book=xlsx.utils.book_new();xlsx.utils.book_append_sheet(book,xlsx.utils.json_to_sheet([{Total:10000}]),'Gastos');const output=xlsx.write(book,{bookType:'xlsx',type:'buffer'});assert.equal(xlsx.utils.sheet_to_json(xlsx.read(output).Sheets.Gastos)[0].Total,10000)
})
