
import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/auth-helpers-nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { Database } from '../../lib/database.types'

/**
 * Crea un cliente de Supabase para su uso en API Routes (Pages Router)
 * manejando automáticamente las cookies de sesión.
 * 
 * Esta versión usa la interfaz getAll/setAll requerida por las versiones 
 * recientes de auth-helpers que usan @supabase/ssr internamente.
 */
export function createPagesServerClient(req: NextApiRequest, res: NextApiResponse) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase environment variables are missing')
    }

    return createServerClient<any>(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() {
                    return parseCookieHeader(req.headers.cookie ?? '')
                },
                setAll(cookiesToSet) {
                    const serialized = cookiesToSet.map(({ name, value, options }) =>
                        serializeCookieHeader(name, value, options)
                    )

                    // Obtener headers existentes para no borrarlos
                    const currentHeaders = res.getHeader('Set-Cookie') || []
                    const headersArray = Array.isArray(currentHeaders)
                        ? currentHeaders
                        : [currentHeaders as string]

                    res.setHeader('Set-Cookie', [...headersArray, ...serialized])
                }
            },
        }
    )
}
