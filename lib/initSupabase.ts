import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from './database.types'

export const supabase = createPagesBrowserClient<Database>()