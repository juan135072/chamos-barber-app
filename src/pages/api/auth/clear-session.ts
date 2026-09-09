import type { NextApiRequest, NextApiResponse } from 'next'
import { clearAuthCookies } from '@/lib/supabase-server'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        res.setHeader('Allow', 'GET, POST')
        return res.status(405).json({ error: 'Method not allowed' })
    }

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
    clearAuthCookies(res)

    if (req.method === 'POST') {
        return res.status(200).json({ ok: true })
    }

    return res.redirect(302, '/chamos-acceso')
}
