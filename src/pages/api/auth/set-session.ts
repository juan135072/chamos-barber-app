import { NextApiRequest, NextApiResponse } from 'next'
import { ACCESS_COOKIE } from '@/lib/supabase-server'
import { serialize as serializeCookie } from 'cookie'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end()

    const { accessToken } = req.body ?? {}
    if (!accessToken || typeof accessToken !== 'string') {
        return res.status(400).json({ error: 'accessToken required' })
    }

    const cookie = serializeCookie(ACCESS_COOKIE, accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 15,
    })
    res.setHeader('Set-Cookie', cookie)
    return res.status(200).json({ ok: true })
}
