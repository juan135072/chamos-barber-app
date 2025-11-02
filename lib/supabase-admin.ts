// ===================================================================
// SUPABASE ADMIN CLIENT
// ===================================================================
// Cliente con Service Role para operaciones administrativas
// ⚠️ SOLO usar en backend/server-side, NUNCA en frontend
// ===================================================================

import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('❌ SUPABASE_URL no está definida en variables de entorno')
}

if (!supabaseServiceRoleKey) {
  throw new Error('❌ SUPABASE_SERVICE_ROLE_KEY no está definida en variables de entorno')
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
