import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { barberoId } = req.query

    if (!barberoId) {
        return res.status(400).json({ error: 'barberoId is required' })
    }

    try {
        const { data, error } = await supabase.rpc('get_barber_dashboard_metrics_v2', {
            barbero_uuid: barberoId
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
