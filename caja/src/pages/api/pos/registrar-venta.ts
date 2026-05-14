import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método no permitido' })
    }

    try {
        const body = req.body

        const { data: factura, error: insertError } = await supabase
            .from('facturas')
            .insert(body)
            .select()
            .single()

        if (insertError) throw insertError

        return res.status(200).json({ factura })

    } catch (error: any) {
        console.error('Error en registrar-venta (caja):', error)
        return res.status(500).json({ message: 'Error interno del servidor', error: error.message })
    }
}
