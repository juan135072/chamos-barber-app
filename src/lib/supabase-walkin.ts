/**
 * =====================================================
 * 🚶 SUPABASE QUERIES - WALK-IN CLIENTS
 * =====================================================
 * Sistema para gestionar clientes que llegan sin reserva
 * Permite registrar datos para futura comunicación
 */

import { supabase } from './supabase'

// =====================================================
// TIPOS
// =====================================================

export interface WalkInClient {
  id: string
  nombre: string
  telefono: string
  email?: string | null
  notas?: string | null
  origen: 'sin_reserva' // Para identificar que es walk-in
  created_at: string
  updated_at: string
}

export interface CreateWalkInClientParams {
  nombre: string
  telefono: string
  email?: string
  notas?: string
}

// =====================================================
// QUERIES - WALK-IN CLIENTS
// =====================================================

/**
 * Obtener todos los walk-in clients registrados
 */
export async function getAllWalkInClients(): Promise<WalkInClient[]> {
  const { data, error } = await supabase
    .from('walk_in_clients')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Error obteniendo walk-in clients:', error)
    throw error
  }

  return data || []
}

/**
 * Obtener walk-in client por ID
 */
export async function getWalkInClientById(id: string): Promise<WalkInClient | null> {
  const { data, error } = await supabase
    .from('walk_in_clients')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('❌ Error obteniendo walk-in client:', error)
    throw error
  }

  return data
}

/**
 * Buscar walk-in client por teléfono
 */
export async function searchWalkInClientByPhone(telefono: string): Promise<WalkInClient | null> {
  const { data, error } = await supabase
    .from('walk_in_clients')
    .select('*')
    .eq('telefono', telefono)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found
    console.error('❌ Error buscando walk-in client:', error)
    throw error
  }

  return data
}

// =====================================================
// MUTATIONS - CREAR WALK-IN CLIENT
// =====================================================

/**
 * Crear un nuevo walk-in client
 */
export async function createWalkInClient(params: CreateWalkInClientParams): Promise<WalkInClient> {
  // Validar que el teléfono no esté duplicado
  const existing = await searchWalkInClientByPhone(params.telefono)
  
  if (existing) {
    throw new Error('Ya existe un cliente registrado con este teléfono')
  }

  const { data, error } = await supabase
    .from('walk_in_clients')
    .insert([
      {
        nombre: params.nombre,
        telefono: params.telefono,
        email: params.email || null,
        notas: params.notas || null,
        origen: 'sin_reserva'
      }
    ])
    .select()
    .single()

  if (error) {
    console.error('❌ Error creando walk-in client:', error)
    throw error
  }

  console.log('✅ Walk-in client creado:', data.id)
  return data
}

// =====================================================
// MUTATIONS - ACTUALIZAR WALK-IN CLIENT
// =====================================================

/**
 * Actualizar información de un walk-in client
 */
export async function updateWalkInClient(
  id: string,
  updates: Partial<CreateWalkInClientParams>
): Promise<WalkInClient> {
  const { data, error } = await supabase
    .from('walk_in_clients')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('❌ Error actualizando walk-in client:', error)
    throw error
  }

  console.log('✅ Walk-in client actualizado:', data.id)
  return data
}

// =====================================================
// MUTATIONS - ELIMINAR WALK-IN CLIENT
// =====================================================

/**
 * Eliminar un walk-in client
 */
export async function deleteWalkInClient(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('walk_in_clients')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('❌ Error eliminando walk-in client:', error)
    throw error
  }

  console.log('✅ Walk-in client eliminado:', id)
  return true
}

// =====================================================
// ESTADÍSTICAS
// =====================================================

/**
 * Obtener estadísticas de walk-in clients
 */
export async function getWalkInStats() {
  const clientes = await getAllWalkInClients()

  const hoy = new Date()
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const inicioSemana = new Date(hoy)
  inicioSemana.setDate(hoy.getDate() - 7)
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)

  const clientesHoy = clientes.filter(c => new Date(c.created_at) >= inicioHoy)
  const clientesSemana = clientes.filter(c => new Date(c.created_at) >= inicioSemana)
  const clientesMes = clientes.filter(c => new Date(c.created_at) >= inicioMes)

  return {
    total: clientes.length,
    hoy: clientesHoy.length,
    semana: clientesSemana.length,
    mes: clientesMes.length
  }
}

// =====================================================
// UTILIDADES
// =====================================================

/**
 * Formatear fecha
 */
export function formatFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
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
