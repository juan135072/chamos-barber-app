// ================================================================
// API: Completar Cita con Cobro
// Completa una cita y registra el cobro en el sistema
// ================================================================

import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    const { cita_id, monto_cobrado, metodo_pago, barbero_id } = req.body

    // Validar parámetros requeridos
    if (!cita_id || !monto_cobrado || !metodo_pago || !barbero_id) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros requeridos'
      })
    }

    // Validar monto
    if (typeof monto_cobrado !== 'number' || monto_cobrado <= 0) {
      return res.status(400).json({
        success: false,
        error: 'El monto debe ser un número mayor a 0'
      })
    }

    // Validar método de pago
    if (!['efectivo', 'tarjeta'].includes(metodo_pago)) {
      return res.status(400).json({
        success: false,
        error: 'Método de pago inválido'
      })
    }

    // 1. Obtener información completa de la cita
    const { data: cita, error: citaError } = await supabase
      .from('citas')
      .select(`
        *,
        servicios (
          id,
          nombre,
          precio,
          categoria
        ),
        barberos (
          id,
          nombre,
          apellido,
          porcentaje_comision
        )
      `)
      .eq('id', cita_id)
      .single()

    if (citaError || !cita) {
      console.error('Error obteniendo cita:', citaError)
      return res.status(404).json({
        success: false,
        error: 'Cita no encontrada'
      })
    }

    // Verificar que el barbero de la cita coincide con el que hace la solicitud
    if (cita.barbero_id !== barbero_id) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para completar esta cita'
      })
    }

    // Verificar que la cita no esté ya completada o cancelada
    if (cita.estado === 'completada') {
      return res.status(400).json({
        success: false,
        error: 'Esta cita ya fue completada'
      })
    }

    if (cita.estado === 'cancelada') {
      return res.status(400).json({
        success: false,
        error: 'Esta cita está cancelada'
      })
    }

    // 2. Calcular comisión
    const porcentaje_comision = cita.barberos?.porcentaje_comision || 50
    const comision = Math.round(monto_cobrado * (porcentaje_comision / 100))

    // 3. Actualizar estado de la cita a 'completada'
    const { error: updateCitaError } = await supabase
      .from('citas')
      .update({
        estado: 'completada',
        updated_at: new Date().toISOString()
      })
      .eq('id', cita_id)

    if (updateCitaError) {
      console.error('Error actualizando cita:', updateCitaError)
      return res.status(500).json({
        success: false,
        error: 'Error al actualizar la cita'
      })
    }

    // 4. Registrar el cobro en la tabla de facturas (si existe)
    try {
      const { error: facturaError } = await supabase
        .from('facturas')
        .insert({
          cita_id: cita_id,
          barbero_id: barbero_id,
          cliente_nombre: cita.cliente_nombre,
          servicio_nombre: cita.servicios?.nombre || 'Servicio',
          monto_total: monto_cobrado,
          metodo_pago: metodo_pago,
          fecha: new Date().toISOString().split('T')[0],
          hora: new Date().toTimeString().split(' ')[0],
          estado: 'pagado',
          comision_barbero: comision,
          porcentaje_comision: porcentaje_comision,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (facturaError) {
        console.warn('Advertencia: No se pudo crear factura:', facturaError.message)
        // No fallar si la tabla facturas no existe, solo advertir
      }
    } catch (facturaErr) {
      console.warn('Tabla facturas no disponible:', facturaErr)
    }

    // 5. Responder con éxito
    return res.status(200).json({
      success: true,
      message: 'Cita completada y cobro registrado exitosamente',
      data: {
        cita_id,
        monto_cobrado,
        metodo_pago,
        comision,
        porcentaje_comision
      }
    })

  } catch (error: any) {
    console.error('Error en completar-cita-con-cobro:', error)
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    })
  }
}
