/**
 * =====================================================
 * 💰 SUPABASE QUERIES - SISTEMA DE LIQUIDACIONES
 * =====================================================
 * Queries para gestionar liquidaciones de barberos
 * Incluye: crear, pagar, listar, calcular comisiones
 */

import { supabase } from './supabase'

// =====================================================
// TIPOS
// =====================================================

export interface BarberoResumen {
  id: string
  nombre: string
  apellido: string
  email: string
  telefono: string
  porcentaje_comision: number
  activo: boolean
  total_ventas: number
  total_vendido: number
  comisiones_generadas: number
  comisiones_pendientes: number
  comisiones_pagadas: number
}

export interface ComisionesPendientes {
  total_ventas: number // Total amount of money (SUM of invoices)
  cantidad_servicios: number // Count of invoices
  porcentaje_comision: number
  total_comision: number
}

export interface ComisionesProximoPeriodo {
  barbero_id: string
  barbero_nombre: string
  barbero_email: string
  cantidad_ventas: number
  monto_total: number
  porcentaje_comision: number
  total_comision: number
  ultima_liquidacion_numero: string
  ultima_liquidacion_fecha: string
}

export interface Liquidacion {
  id: string
  numero_liquidacion: string
  barbero_id: string
  fecha_inicio: string
  fecha_fin: string
  total_ventas: number // Total amount of money (SUM of invoices)
  cantidad_servicios: number // Count of invoices
  porcentaje_comision: number
  total_comision: number
  estado: 'pendiente' | 'pagada' | 'cancelada'
  metodo_pago?: 'efectivo' | 'transferencia' | 'mixto'
  monto_efectivo: number
  monto_transferencia: number
  fecha_pago?: string
  referencia_transferencia?: string
  comprobante_url?: string
  notas?: string
  creada_por?: string
  pagada_por?: string
  created_at: string
  updated_at: string
  // Relaciones
  barbero?: {
    nombre: string
    apellido: string
    email: string
    telefono: string
    banco?: string
    tipo_cuenta?: string
    numero_cuenta?: string
    titular_cuenta?: string
    rut_titular?: string
  }
}

export interface CrearLiquidacionParams {
  barbero_id: string
  fecha_inicio: string // YYYY-MM-DD
  fecha_fin: string // YYYY-MM-DD
}

export interface PagarLiquidacionParams {
  liquidacion_id: string
  metodo_pago: 'efectivo' | 'transferencia' | 'mixto'
  monto_efectivo: number
  monto_transferencia: number
  referencia_transferencia?: string
  notas?: string
}

// =====================================================
// QUERIES - BARBEROS RESUMEN
// =====================================================

/**
 * Obtener resumen de todos los barberos con sus comisiones
 */
export async function getBarberosResumen(): Promise<BarberoResumen[]> {
  const { data, error } = await supabase
    .from('barberos_resumen')
    .select('*')
    .order('comisiones_pendientes', { ascending: false })

  if (error) {
    console.error('❌ Error obteniendo resumen de barberos:', error)
    throw error
  }

  return data || []
}

/**
 * Obtener resumen de un barbero específico
 */
export async function getBarberoResumen(barberoId: string): Promise<BarberoResumen | null> {
  const { data, error } = await supabase
    .from('barberos_resumen')
    .select('*')
    .eq('id', barberoId)
    .single()

  if (error) {
    console.error('❌ Error obteniendo resumen del barbero:', error)
    throw error
  }

  return data
}

// =====================================================
// QUERIES - CALCULAR COMISIONES
// =====================================================

/**
 * Calcular comisiones pendientes de un barbero en un período
 */
export async function calcularComisionesPendientes(
  barberoId: string,
  fechaInicio?: string,
  fechaFin?: string
): Promise<ComisionesPendientes> {
  const { data, error } = await (supabase as any).rpc('calcular_comisiones_pendientes', {
    p_barbero_id: barberoId,
    p_fecha_inicio: fechaInicio || null,
    p_fecha_fin: fechaFin || null
  })

  if (error) {
    console.error('❌ Error calculando comisiones pendientes:', error)
    throw error
  }

  // La función retorna un array con un registro
  return data && data.length > 0 ? data[0] : {
    total_ventas: 0,
    cantidad_servicios: 0,
    porcentaje_comision: 50,
    total_comision: 0
  }
}

/**
 * Calcular comisiones del próximo período (ventas después de última liquidación)
 */
export async function calcularComisionesProximoPeriodo(): Promise<ComisionesProximoPeriodo[]> {
  const { data, error } = await (supabase as any).rpc('calcular_comisiones_proximo_periodo')

  if (error) {
    console.error('❌ Error calculando comisiones del próximo período:', error)
    throw error
  }

  return data || []
}

// =====================================================
// QUERIES - LIQUIDACIONES
// =====================================================

/**
 * Obtener todas las liquidaciones (para admin)
 */
export async function getAllLiquidaciones(estado?: string): Promise<Liquidacion[]> {
  let query = supabase
    .from('liquidaciones')
    .select(`
      *,
      barbero:barberos!liquidaciones_barbero_id_fkey (
        nombre,
        apellido,
        email,
        telefono,
        banco,
        tipo_cuenta,
        numero_cuenta,
        titular_cuenta,
        rut_titular
      )
    `)
    .order('created_at', { ascending: false })

  if (estado) {
    query = query.eq('estado', estado)
  }

  const { data, error } = await query

  if (error) {
    console.error('❌ Error obteniendo liquidaciones:', error)
    throw error
  }

  return data || []
}

/**
 * Obtener liquidaciones de un barbero específico
 */
export async function getLiquidacionesByBarbero(barberoId: string): Promise<Liquidacion[]> {
  const { data, error } = await supabase
    .from('liquidaciones')
    .select(`
      *,
      barbero:barberos!liquidaciones_barbero_id_fkey (
        nombre,
        apellido,
        email,
        telefono,
        banco,
        tipo_cuenta,
        numero_cuenta,
        titular_cuenta,
        rut_titular
      )
    `)
    .eq('barbero_id', barberoId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Error obteniendo liquidaciones del barbero:', error)
    throw error
  }

  return data || []
}

/**
 * Obtener una liquidación por ID
 */
export async function getLiquidacionById(liquidacionId: string): Promise<Liquidacion | null> {
  const { data, error } = await supabase
    .from('liquidaciones')
    .select(`
      *,
      barbero:barberos!liquidaciones_barbero_id_fkey (
        nombre,
        apellido,
        email,
        telefono,
        banco,
        tipo_cuenta,
        numero_cuenta,
        titular_cuenta,
        rut_titular
      )
    `)
    .eq('id', liquidacionId)
    .single()

  if (error) {
    console.error('❌ Error obteniendo liquidación:', error)
    throw error
  }

  return data
}

// =====================================================
// MUTATIONS - CREAR LIQUIDACIÓN
// =====================================================

/**
 * Crear una nueva liquidación para un barbero
 */
export async function crearLiquidacion(params: CrearLiquidacionParams): Promise<string> {
  const { data, error } = await (supabase as any).rpc('crear_liquidacion', {
    p_barbero_id: params.barbero_id,
    p_fecha_inicio: params.fecha_inicio,
    p_fecha_fin: params.fecha_fin
  })

  if (error) {
    console.error('❌ Error creando liquidación:', error)
    throw error
  }

  console.log('✅ Liquidación creada:', data)
  return data // Retorna el UUID de la liquidación creada
}

// =====================================================
// MUTATIONS - PAGAR LIQUIDACIÓN
// =====================================================

/**
 * Marcar una liquidación como pagada
 */
export async function pagarLiquidacion(params: PagarLiquidacionParams): Promise<boolean> {
  const { data, error } = await supabase.rpc('pagar_liquidacion', {
    p_liquidacion_id: params.liquidacion_id,
    p_metodo_pago: params.metodo_pago,
    p_monto_efectivo: params.monto_efectivo,
    p_monto_transferencia: params.monto_transferencia,
    p_numero_transferencia: params.referencia_transferencia || null,
    p_notas: params.notas || null
  })

  if (error) {
    console.error('❌ Error pagando liquidación:', error)
    throw error
  }

  console.log('✅ Liquidación pagada exitosamente')
  return data
}

// =====================================================
// QUERIES - ESTADÍSTICAS
// =====================================================

/**
 * Obtener estadísticas generales del sistema de liquidaciones
 */
export async function getEstadisticasLiquidaciones() {
  const [pendientes, pagadas] = await Promise.all([
    getAllLiquidaciones('pendiente'),
    getAllLiquidaciones('pagada')
  ])

  const totalComisionesPendientes = pendientes.reduce(
    (sum, liq) => sum + parseFloat(liq.total_comision.toString()),
    0
  )

  const totalComisionesPagadas = pagadas.reduce(
    (sum, liq) => sum + parseFloat(liq.total_comision.toString()),
    0
  )

  return {
    total_pendientes: pendientes.length,
    total_pagadas: pagadas.length,
    monto_pendiente: totalComisionesPendientes,
    monto_pagado: totalComisionesPagadas
  }
}

// =====================================================
// UTILIDADES
// =====================================================

/**
 * Formatear monto en CLP
 */
export function formatCLP(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0
  }).format(num)
}

/**
 * Formatear fecha
 */
export function formatFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Formatear fecha corta
 */
export function formatFechaCorta(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-CL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

/**
 * Obtener badge color por estado
 */
export function getEstadoBadgeColor(estado: string): string {
  switch (estado) {
    case 'pendiente':
      return 'bg-yellow-100 text-yellow-800'
    case 'pagada':
      return 'bg-green-100 text-green-800'
    case 'cancelada':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

/**
 * Obtener label en español para estado
 */
export function getEstadoLabel(estado: string): string {
  switch (estado) {
    case 'pendiente':
      return 'Pendiente'
    case 'pagada':
      return 'Pagada'
    case 'cancelada':
      return 'Cancelada'
    default:
      return estado
  }
}
