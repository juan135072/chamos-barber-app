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
            // Diferencia y esperado se calculan en memoria — caja_sesiones
            // solo persiste monto_final (no _esperado / _real / diferencia).
            const diferencia = montoFinalReal - (sesion.monto_final_esperado ?? 0)

            const { data, error } = await (supabase
                .from('caja_sesiones') as any)
                .update({
                    estado: 'cerrada',
                    fecha_cierre: new Date().toISOString(),
                    monto_final: montoFinalReal,
                })
                .eq('id', sesion.id)
                .select()
                .single()

            if (error) throw error

            const descripcionCierre = `Cierre de caja. Esperado: ${sesion.monto_final_esperado ?? 0}, Real: ${montoFinalReal}, Diferencia: ${diferencia}. Notas: ${notas}`

            const movementPayload: any = {
                sesion_id: sesion.id,
                comercio_id: usuario.comercio_id,
                tipo: 'cierre',
                monto: montoFinalReal,
                descripcion: descripcionCierre,
            }

            await (supabase.from('movimientos_caja') as any).insert([movementPayload])

            setSesion(null)
            return data
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
