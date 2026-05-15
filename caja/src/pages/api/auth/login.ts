import { NextApiRequest, NextApiResponse } from 'next'
import { createClient as createInsforgeClient } from '@insforge/sdk'
import { serialize as serializeCookie } from 'cookie'

const BASE_URL = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY
const ACCESS_COOKIE = 'insforge_access_token'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end()

    const { email, password } = req.body ?? {}
    if (!email || !password) {
        return res.status(400).json({ error: 'email and password required' })
    }

    if (!BASE_URL || !ANON_KEY) {
        return res.status(500).json({ error: 'Server misconfigured' })
    }

    const client = createInsforgeClient({
        baseUrl: BASE_URL,
        anonKey: ANON_KEY,
        isServerMode: true,
    } as any)

    const { data, error } = await client.auth.signInWithPassword({ email, password })

    if (error || !(data as any)?.user) {
        return res.status(401).json({ error: (error as any)?.message ?? 'Invalid credentials' })
    }

    const accessToken = (data as any).accessToken
    if (accessToken) {
        const cookie = serializeCookie(ACCESS_COOKIE, accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 15,
        })
        res.setHeader('Set-Cookie', cookie)
    }

    return res.status(200).json({ ok: !!accessToken })
}
