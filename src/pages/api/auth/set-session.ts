import { NextApiRequest, NextApiResponse } from 'next'
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/supabase-server'
import { serialize as serializeCookie } from 'cookie'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end()

    const { accessToken, refreshToken } = req.body ?? {}
    if (!accessToken || typeof accessToken !== 'string') {
        return res.status(400).json({ error: 'accessToken required' })
    }
    // Reject API keys (ik_...) — only user JWTs (eyJ...) are valid session tokens
    if (!accessToken.startsWith('eyJ')) {
        return res.status(400).json({ error: 'Invalid token format' })
    }

    const cookies = [
        serializeCookie(ACCESS_COOKIE, accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 15,
        }),
    ]

    // Store refresh token if provided (7-day expiry)
    if (refreshToken && typeof refreshToken === 'string') {
        cookies.push(
            serializeCookie(REFRESH_COOKIE, refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24 * 7,
            })
        )
    }

    res.setHeader('Set-Cookie', cookies)
    return res.status(200).json({ ok: true })
}