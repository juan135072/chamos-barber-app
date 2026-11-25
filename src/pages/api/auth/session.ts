import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@/lib/supabase-server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET')
        return res.status(405).json({ error: 'Method not allowed' })
    }

    // Never cache authentication state in the browser or an intermediary.
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')

    try {
        const supabase = createPagesServerClient(req, res)
        const result = await supabase.auth.getSession()
        // The auth backend did not answer. That is not "signed out": the cookies
        // stay in place and the browser keeps what it has and asks again.
        if (result?.unavailable) {
            // One line for operations: the backend status only, never a token or its text.
            console.error('[auth/session] Auth backend unavailable, answered 503', { status: result.error?.statusCode ?? null })
            return unavailable(res)
        }
        const session = result?.data?.session ?? null

        if (!session?.user || !session?.access_token) {
            return res.status(200).json({ session: null })
        }

        // The refresh token stays httpOnly. The browser only receives the
        // access token it needs to hydrate InsForge's in-memory TokenManager.
        return res.status(200).json({
            session: {
                user: session.user,
                access_token: session.access_token,
                refresh_token: '',
                expires_at: session.expires_at ?? 0,
                expires_in: session.expires_in ?? 0,
                token_type: 'bearer',
            },
        })
    } catch (error) {
        console.error('[auth/session] Failed to restore session:', error)
        return unavailable(res)
    }
}

/**
 * 503 without a `session` key: checkAppSession() reads any non-2xx answer as
 * "unknown" and retries, while `{ session: null }` would sign the user out.
 */
function unavailable(res: NextApiResponse) {
    return res.status(503).json({ error: 'No se pudo verificar la sesión' })
}
