import { NextApiRequest, NextApiResponse } from 'next'
import { clearAuthCookies } from '@/lib/supabase-server'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    clearAuthCookies(res)
    res.redirect(302, '/chamos-acceso')
}
