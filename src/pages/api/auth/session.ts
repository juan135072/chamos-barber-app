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
        const { data } = await supabase.auth.getSession()
        const session = data?.session ?? null

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
        return res.status(200).json({ session: null })
    }
}
