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
    monto_final_real: number | null
    diferencia: number
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

            // Si tenemos el ID de comercio, lo usamos para filtrar (seguridad extra)
            if (usuario.comercio_id) {
                query = query.eq('comercio_id', usuario.comercio_id)
            }

            const { data, error } = await query.maybeSingle()

            if (error) throw error
            setSesion(data)
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
            devLog('🔄 Intentando abrir caja para usuario:', usuario.id)

            // 1. Preparar datos de sesión
            const sessionPayload: any = {
                usuario_id: usuario.id,
                monto_inicial: montoInicial,
                estado: 'abierta'
                // Dejamos que la BD maneje fecha_apertura por defecto (now())
            }

            if (usuario.comercio_id) {
                sessionPayload.comercio_id = usuario.comercio_id
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
                tipo: 'apertura',
                monto: montoInicial,
                descripcion: 'Fondo inicial de caja'
            }

            if (usuario.comercio_id) {
                movementPayload.comercio_id = usuario.comercio_id
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
            // Calcular diferencia
            const diferencia = montoFinalReal - sesion.monto_final_esperado

            const { data, error } = await (supabase
                .from('caja_sesiones') as any)
                .update({
                    estado: 'cerrada',
                    fecha_cierre: new Date().toISOString(),
                    monto_final_real: montoFinalReal,
                    diferencia: diferencia
                })
                .eq('id', sesion.id)
                .select()
                .single()

            if (error) throw error

            // Registrar movimiento de cierre
            const movementPayload: any = {
                sesion_id: sesion.id,
                tipo: 'cierre',
                monto: montoFinalReal,
                descripcion: `Cierre de caja. Notas: ${notas}`
            }

            if (usuario.comercio_id) {
                movementPayload.comercio_id = usuario.comercio_id
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

            // 1. Actualizar el monto esperado en la sesión
            const nuevoEsperado = (sesion.monto_final_esperado || 0) + monto
            await (supabase
                .from('caja_sesiones') as any)
                .update({ monto_final_esperado: nuevoEsperado })
                .eq('id', sesion.id)

            // 2. Registrar el movimiento en movimientos_caja
            const movementPayload: any = {
                sesion_id: sesion.id,
                tipo: 'venta',
                monto: monto,
                metodo_pago: metodoPago,
                referencia_id: referenciaId
            }

            if (usuario.comercio_id) {
                movementPayload.comercio_id = usuario.comercio_id
            }

            await (supabase.from('movimientos_caja') as any).insert([movementPayload])

            // 3. Vincular la factura con la sesión (Importante para reportes)
            // Intentamos actualizar la columna cierre_caja_id en facturas
            const { error: invoiceError } = await (supabase
                .from('facturas') as any)
                .update({ cierre_caja_id: sesion.id })
                .eq('id', referenciaId)

            if (invoiceError) {
                console.warn('⚠️ Venta registrada pero no se pudo vincular con la factura:', invoiceError)
            }

            // Actualizar estado local
            setSesion(prev => prev ? { ...prev, monto_final_esperado: nuevoEsperado } : null)
            devLog('✅ Venta vinculada a la sesión correctamente')
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
