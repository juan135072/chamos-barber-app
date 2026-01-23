import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/auth-helpers-nextjs'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { Database } from '../../lib/database.types'

/**
 * Crea un cliente de Supabase para su uso en API Routes (Pages Router)
 * manejando automáticamente las cookies de sesión.
 */
export function createPagesServerClient(req: NextApiRequest, res: NextApiResponse) {
    return createServerClient<any>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    const cookies = parseCookieHeader(req.headers.cookie ?? '')
                    return cookies.map(cookie => ({
                        name: cookie.name,
                        value: cookie.value ?? ''
                    }))
                },
                setAll(cookiesToSet) {
                    res.setHeader(
                        'Set-Cookie',
                        cookiesToSet.map(({ name, value, options }) =>
                            serializeCookieHeader(name, value, options)
                        )
                    )
                },
            },
        }
    )
}
