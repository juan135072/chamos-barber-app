import { useState, useEffect, useCallback } from 'react'
import { posRequest } from '@/lib/pos-client'

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
  const [error, setError] = useState<string | null>(null)
  const checkActiveSession = useCallback(async () => {
    if (!usuario?.id) { setLoading(false); return }
    try {
      const result = await posRequest('/api/pos/caja')
      setSesion(result.sesion)
      setError(null)
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }, [usuario?.id])
  useEffect(() => { checkActiveSession() }, [checkActiveSession])
  const abrirCaja = async (montoInicial: number) => {
    const result = await posRequest('/api/pos/caja', { action: 'open', monto: montoInicial })
    setSesion(result.sesion)
    setError(null)
    return result.sesion
  }
  const cerrarCaja = async (montoFinalReal: number, notas = '') => {
    if (!sesion) throw new Error('No hay una sesión activa')
    const result = await posRequest('/api/pos/caja', { action: 'close', sesion_id: sesion.id, monto: montoFinalReal, notas })
    setSesion(null)
    return result
  }
  // The sale transaction already recorded the cash movement; only refresh here.
  const registrarVenta = async (_monto: number, _referenciaId: string, _metodoPago: string) => { await checkActiveSession() }
  return { sesion, loading, error, abrirCaja, cerrarCaja, registrarVenta, refreshSession: checkActiveSession }
}
