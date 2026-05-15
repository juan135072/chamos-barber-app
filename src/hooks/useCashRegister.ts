import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const devLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== 'production') console.log(...args)
}

export interface CajaSesion {
    id: string
    usuario_id: string
    comercio_id: string
    fecha_apertura: string
    fecha_cierre: string | null
    monto_inicial: number
    monto_final_esperado: number
    monto_final: number | null
    estado: 'abierta' | 'cerrada'
}

export function useCashRegister(usuario: any) {
    const [sesion, setSesion] = useState<CajaSesion | null>(null)
    const [loading, setLoading] = useState(true)

    const checkActiveSession = useCallback(async () => {
        if (!usuario?.id) return

        try {
            setLoading(true)
            let query = (supabase.from('caja_sesiones') as any)
                .select('*')
                .eq('estado', 'abierta')
                .eq('usuario_id', usuario.id)

            if (usuario.comercio_id) {
                query = query.eq('comercio_id', usuario.comercio_id)
            } else {
                query = query.is('comercio_id', null)
            }

            const { data, error } = await query
                .order('fecha_apertura', { ascending: false })
                .limit(1)

            if (error) throw error
            setSesion(data?.[0] ?? null)
        } catch (error) {
            console.error('Error al verificar sesión de caja:', error)
        } finally {
            setLoading(false)
        }
    }, [usuario?.id, usuario?.comercio_id])

    useEffect(() => {
        checkActiveSession()
    }, [checkActiveSession])

    const abrirCaja = async (montoInicial: number) => {
        if (!usuario?.id) throw new Error('Usuario no identificado')

        try {
            if (!usuario.comercio_id) {
                throw new Error('Usuario sin comercio asignado. No se puede operar la caja.')
            }

            devLog('🔄 Intentando abrir caja para usuario:', usuario.id)

            // 1. Preparar datos de sesión
            const sessionPayload: any = {
                usuario_id: usuario.id,
                comercio_id: usuario.comercio_id,
                monto_inicial: montoInicial,
                estado: 'abierta'
            }

            devLog('📤 Enviando payload de sesión:', sessionPayload)

            // Insertar nueva sesión
            const { data, error } = await (supabase
                .from('caja_sesiones') as any)
                .insert([sessionPayload])
                .select()
                .single()

            if (error) {
                console.error('❌ Error de Supabase al insertar sesión:', error)
                throw error
            }

            devLog('✅ Sesión creada:', data)

            // 2. Registrar movimiento de apertura
            const movementPayload: any = {
                sesion_id: data.id,
                comercio_id: usuario.comercio_id,
                tipo: 'apertura',
                monto: montoInicial,
                descripcion: 'Fondo inicial de caja'
            }

            const { error: moveError } = await (supabase.from('movimientos_caja') as any).insert([movementPayload])

            if (moveError) {
                console.warn('⚠️ Sesión abierta pero error al registrar movimiento:', moveError)
            }

            setSesion(data)
            return data
        } catch (error: any) {
            console.error('💥 Error crítico en abrirCaja:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code,
                error
            })
            throw error
        }
    }

    const cerrarCaja = async (montoFinalReal: number, notas: string = '') => {
        if (!sesion) throw new Error('No hay una sesión activa')

        try {
            // 1. Recolectar las facturas de esta sesión (no anuladas, no asignadas
            //    a otro cierre) para computar totales del Z-report.
            const fechaApertura = sesion.fecha_apertura
            const fechaFinIso = new Date().toISOString()

            const { data: facturasSesion, error: facturasErr } = await (supabase
                .from('facturas') as any)
                .select('total, comision_barbero, ingreso_casa, metodo_pago')
                .eq('comercio_id', usuario.comercio_id)
                .eq('anulada', false)
                .is('cierre_caja_id', null)
                .gte('created_at', fechaApertura)
                .lt('created_at', fechaFinIso)

            if (facturasErr) throw facturasErr

            const facturas: Array<{ total: number; comision_barbero: number; ingreso_casa: number; metodo_pago: string }> = facturasSesion ?? []

            const totals = facturas.reduce(
                (acc, f) => {
                    const total = Number(f.total) || 0
                    const com = Number(f.comision_barbero) || 0
                    const casa = Number(f.ingreso_casa) || 0
                    const metodo = (f.metodo_pago || 'otro').toLowerCase()
                    acc.total_ventas += total
                    acc.total_comisiones += com
                    acc.total_casa += casa
                    acc.metodos_pago[metodo] = (acc.metodos_pago[metodo] || 0) + total
                    return acc
                },
                {
                    total_ventas: 0,
                    total_comisiones: 0,
                    total_casa: 0,
                    metodos_pago: {} as Record<string, number>,
                }
            )

            const ventasEfectivo = totals.metodos_pago['efectivo'] || 0
            const montoEsperadoEfectivo = Number(sesion.monto_inicial || 0) + ventasEfectivo
            const diferencia = montoFinalReal - montoEsperadoEfectivo

            // 2. Crear la fila formal en cierres_caja (Z-report).
            const fechaApDate = fechaApertura.slice(0, 10)
            const fechaFinDate = fechaFinIso.slice(0, 10)

            // Nota: cierres_caja.diferencia es columna generada
            // (monto_real_efectivo - monto_esperado_efectivo), no se incluye
            // en el INSERT — Postgres rebota con 428C9 si se le pasa valor.
            const cierrePayload: any = {
                fecha_inicio: fechaApDate,
                fecha_fin: fechaFinDate,
                cajero_id: usuario.id,
                comercio_id: usuario.comercio_id,
                monto_apertura: Number(sesion.monto_inicial || 0),
                monto_esperado_efectivo: montoEsperadoEfectivo,
                monto_real_efectivo: montoFinalReal,
                total_ventas: totals.total_ventas,
                total_comisiones: totals.total_comisiones,
                total_casa: totals.total_casa,
                metodos_pago: totals.metodos_pago,
                notas: notas || null,
                estado: 'cerrada',
            }

            const { data: cierre, error: cierreErr } = await (supabase
                .from('cierres_caja') as any)
                .insert([cierrePayload])
                .select()
                .single()

            if (cierreErr) throw cierreErr

            // 3. Sellar las facturas de la sesión con el id del cierre. Idempotente:
            //    sólo afecta filas con cierre_caja_id IS NULL.
            const { error: stampErr } = await (supabase
                .from('facturas') as any)
                .update({ cierre_caja_id: cierre.id })
                .eq('comercio_id', usuario.comercio_id)
                .eq('anulada', false)
                .is('cierre_caja_id', null)
                .gte('created_at', fechaApertura)
                .lt('created_at', fechaFinIso)

            if (stampErr) {
                console.warn('⚠️ Cierre creado pero no se pudieron sellar todas las facturas:', stampErr)
            }

            // 4. Marcar la sesión como cerrada.
            const { data, error } = await (supabase
                .from('caja_sesiones') as any)
                .update({
                    estado: 'cerrada',
                    fecha_cierre: fechaFinIso,
                    monto_final: montoFinalReal,
                })
                .eq('id', sesion.id)
                .select()
                .single()

            if (error) throw error

            // 5. Movimiento de cierre (auditoría).
            const descripcionCierre = `Cierre Z-report ${cierre.id}. Apertura: ${sesion.monto_inicial}, Esperado efectivo: ${montoEsperadoEfectivo}, Real: ${montoFinalReal}, Diferencia: ${diferencia}, Total ventas: ${totals.total_ventas} (${facturas.length} facturas). Notas: ${notas}`

            await (supabase.from('movimientos_caja') as any).insert([{
                sesion_id: sesion.id,
                comercio_id: usuario.comercio_id,
                tipo: 'cierre',
                monto: montoFinalReal,
                descripcion: descripcionCierre,
            }])

            setSesion(null)
            return { sesion: data, cierre, facturasSelladas: facturas.length }
        } catch (error) {
            console.error('Error al cerrar caja:', error)
            throw error
        }
    }

    const registrarVenta = async (monto: number, referenciaId: string, metodoPago: string) => {
        if (!sesion) {
            console.warn('Venta registrada sin sesión de caja activa')
            return
        }

        try {
            devLog(`📝 Registrando venta de ${monto} en sesión ${sesion.id}`)

            // Running total persistido en caja_sesiones.monto_final_esperado
            // para que sobreviva al refresh del POS.
            const nuevoEsperado = (sesion.monto_final_esperado || 0) + monto
            await (supabase
                .from('caja_sesiones') as any)
                .update({ monto_final_esperado: nuevoEsperado })
                .eq('id', sesion.id)

            // movimientos_caja solo expone descripcion/tipo/monto — el método
            // de pago y la referencia a la factura van embebidos en descripcion.
            // facturas.cierre_caja_id NO se actualiza aquí: esa FK apunta a
            // cierres_caja y solo se debe poblar cuando se genere un cierre real.
            const movementPayload: any = {
                sesion_id: sesion.id,
                comercio_id: usuario.comercio_id,
                tipo: 'venta',
                monto: monto,
                descripcion: `Venta ${metodoPago} - factura:${referenciaId}`,
            }

            const { error: moveError } = await (supabase.from('movimientos_caja') as any).insert([movementPayload])
            if (moveError) {
                console.warn('⚠️ Error al registrar movimiento de venta en caja:', moveError)
            }

            setSesion(prev => prev ? { ...prev, monto_final_esperado: nuevoEsperado } : null)
            devLog('✅ Venta registrada en la sesión correctamente')
        } catch (error) {
            console.error('Error al registrar venta en caja:', error)
        }
    }

    return {
        sesion,
        loading,
        abrirCaja,
        cerrarCaja,
        registrarVenta,
        refreshSession: checkActiveSession
    }
}
