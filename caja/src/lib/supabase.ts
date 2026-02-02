// Re-export supabase client from initSupabase
// This file exists for cleaner imports: import { supabase } from '@/lib/supabase'
export { supabase } from './initSupabase'

// Re-export permissions utilities
export * from './permissions'

// Re-export database types
export type { Database } from './database.types'
