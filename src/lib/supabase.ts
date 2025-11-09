// Re-export supabase client from initSupabase (root lib folder)
// This file exists for cleaner imports: import { supabase } from '@/lib/supabase'
export { supabase } from '../../lib/initSupabase'

// Re-export permissions utilities
export * from '../../lib/permissions'

// Re-export database types
export type { Database } from '../../lib/database.types'
