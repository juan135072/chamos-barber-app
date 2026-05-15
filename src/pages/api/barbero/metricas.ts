import { NextApiRequest, NextApiResponse } from 'next'
import { createPagesAdminClient, getUserFromBearer } from '@/lib/supabase-server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { barberoId } = req.query

    if (!barberoId) {
        return res.status(400).json({ error: 'barberoId is required' })
    }

    const token = (req.headers.authorization ?? '').replace('Bearer ', '') || null
    const { data: { user } } = await getUserFromBearer(token)
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    const supabaseAdmin = createPagesAdminClient()

    const { data: adminUser } = await supabaseAdmin
        .from('admin_users')
        .select('rol, barbero_id')
        .eq('id', user.id)
        .single()

    if (!adminUser) {
        return res.status(403).json({ error: 'Forbidden' })
    }
    if (adminUser.rol !== 'admin' && adminUser.barbero_id !== barberoId) {
        return res.status(403).json({ error: 'Forbidden' })
    }

    try {
        const { data, error } = await supabaseAdmin.rpc('get_barber_dashboard_metrics_v2', {
            p_barbero_id: barberoId as string
        })

        if (error) throw error

        return res.status(200).json({
            success: true,
            data: data
        })
    } catch (error: any) {
        console.error('Error fetching metrics:', error)
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal Server Error'
        })
    }
}
