import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient as createInsforgeClient } from '@insforge/sdk'
import { setAuthCookies } from '@/lib/supabase-server'

const BASE_URL = process.env.NEXT_PUBLIC_INSFORGE_BASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end()

    const { email, password } = req.body ?? {}
    if (!email || !password) {
        return res.status(400).json({ error: 'email and password required' })
    }

    if (!BASE_URL || !ANON_KEY) {
        return res.status(500).json({ error: 'Server misconfigured' })
    }

    // Server mode returns access + refresh tokens in the response body so the
    // Next.js app can own the httpOnly session cookies on the Chamos domain.
    const client = createInsforgeClient({
        baseUrl: BASE_URL,
        anonKey: ANON_KEY,
        isServerMode: true,
    } as any)

    const { data, error } = await client.auth.signInWithPassword({ email, password })

    if (error || !(data as any)?.user) {
        return res.status(401).json({ error: (error as any)?.message ?? 'Invalid credentials' })
    }

    const accessToken = (data as any)?.accessToken
    const refreshToken = (data as any)?.refreshToken ?? ''

    if (accessToken) {
        setAuthCookies(res, accessToken, refreshToken)
    }

    return res.status(200).json({ ok: !!accessToken })
}
