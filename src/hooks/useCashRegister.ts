import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getChileAhora, getChileHoy } from '@/lib/date-utils'

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
            const { data, error } = await (supabase
                .from('caja_sesiones') as any)
                .select('*')
                .eq('estado', 'abierta')
                .eq('usuario_id', usuario.id)
                .maybeSingle()

            if (error) throw error
            setSesion(data)
        } catch (error) {
            console.error('Error al verificar sesión de caja:', error)
        } finally {
            setLoading(false)
        }
    }, [usuario?.id])

    useEffect(() => {
        checkActiveSession()
    }, [checkActiveSession])

    const abrirCaja = async (montoInicial: number) => {
        if (!usuario?.id) throw new Error('Usuario no identificado')

        try {
            // 1. Insertar nueva sesión
            const { data, error } = await (supabase
                .from('caja_sesiones') as any)
                .insert([{
                    usuario_id: usuario.id,
                    monto_inicial: montoInicial,
                    estado: 'abierta',
                    fecha_apertura: new Date().toISOString()
                }])
                .select()
                .single()

            if (error) throw error

            // 2. Registrar movimiento de apertura
            await (supabase.from('movimientos_caja') as any).insert({
                sesion_id: data.id,
                tipo: 'apertura',
                monto: montoInicial,
                descripcion: 'Fondo inicial de caja'
            })

            setSesion(data)
            return data
        } catch (error) {
            console.error('Error al abrir caja:', error)
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
            await (supabase.from('movimientos_caja') as any).insert({
                sesion_id: sesion.id,
                tipo: 'cierre',
                monto: montoFinalReal,
                descripcion: `Cierre de caja. Notas: ${notas}`
            })

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
            // 1. Actualizar el monto esperado en la sesión
            const nuevoEsperado = sesion.monto_final_esperado + monto
            await (supabase
                .from('caja_sesiones') as any)
                .update({ monto_final_esperado: nuevoEsperado })
                .eq('id', sesion.id)

            // 2. Registrar el movimiento
            await (supabase.from('movimientos_caja') as any).insert({
                sesion_id: sesion.id,
                tipo: 'venta',
                monto: monto,
                metodo_pago: metodoPago,
                referencia_id: referenciaId
            })

            // Actualizar estado local
            setSesion(prev => prev ? { ...prev, monto_final_esperado: nuevoEsperado } : null)
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
