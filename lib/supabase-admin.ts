// ===================================================================
// SUPABASE ADMIN CLIENT
// ===================================================================
// Cliente con Service Role para operaciones administrativas
// ⚠️ SOLO usar en backend/server-side, NUNCA en frontend
// ===================================================================

import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

// Intentar obtener la service role key desde diferentes nombres de variables
// (para compatibilidad con diferentes configuraciones de Supabase)
const supabaseServiceRoleKey = 
  process.env.SUPABASE_SERVICE_ROLE_KEY ||           // Nombre estándar
  process.env.SERVICE_SUPABASESERVICE_KEY ||          // Nombre alternativo en algunos setups
  process.env.SUPABASE_SERVICE_KEY                    // Otro nombre alternativo

if (!supabaseUrl) {
  throw new Error('❌ NEXT_PUBLIC_SUPABASE_URL no está definida en variables de entorno')
}

if (!supabaseServiceRoleKey) {
  throw new Error(
    '❌ Service Role Key no está definida. ' +
    'Intenta agregar alguna de estas variables: ' +
    'SUPABASE_SERVICE_ROLE_KEY, SERVICE_SUPABASESERVICE_KEY, o SUPABASE_SERVICE_KEY'
  )
}

/**
 * Cliente Supabase con Service Role
 * 
 * CAPACIDADES:
 * - Crear usuarios en auth.users (bypass email confirmation)
 * - Modificar/eliminar cualquier usuario
 * - Bypass RLS policies
 * - Operaciones administrativas
 * 
 * SEGURIDAD:
 * - SOLO usar en código server-side
 * - NUNCA exponer en frontend
 * - NUNCA enviar al cliente
 */
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * Verificar que el cliente admin está configurado correctamente
 */
export const verifyAdminClient = () => {
  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return {
        success: false,
        error: 'Variables de entorno no configuradas'
      }
    }
    
    return {
      success: true,
      message: '✅ Supabase Admin Client configurado correctamente'
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}
