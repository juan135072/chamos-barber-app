import { requireStaff } from '@/lib/server-authorization'
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient as createInsforgeClient } from '@insforge/sdk'
import { createPagesAdminClient, getUserFromBearer } from '@/lib/supabase-server'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    const { barberoId } = req.body

    if (!barberoId) {
      return res.status(400).json({ error: 'Faltan datos: barberoId' })
    }

    const actor = await requireStaff(req, res, ['admin'])
    if (!actor) return
    const supabaseAdmin = actor.admin

    // PASO 2: Obtener email del barbero
    const { data: barbero, error: barberoError } = await supabaseAdmin
      .from('barberos')
      .select('email, nombre, apellido')
      .eq('id', barberoId)
      .eq('comercio_id', actor.access.comercio_id)
      .single()

    if (barberoError || !barbero || !barbero.email) {
      return res.status(400).json({ error: 'Barbero no encontrado o sin email' })
    }

    // PASO 3: Disparar reset via InsForge SDK
    const baseUrl = process.env.INSFORGE_INTERNAL_URL || process.env.NEXT_PUBLIC_INSFORGE_BASE_URL
    const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY
    const apiKey = process.env.INSFORGE_API_KEY

    if (!baseUrl || !anonKey || !apiKey) {
      throw new Error('Missing InsForge env vars')
    }

    const client = createInsforgeClient({
      baseUrl,
      anonKey,
      isServerMode: true,
      edgeFunctionToken: apiKey,
    } as Parameters<typeof createInsforgeClient>[0])

    const { error: resetError } = await (client.auth as any).sendResetPasswordEmail({
      email: barbero.email
    })

    if (resetError) {
      throw new Error(`InsForge reset error: ${resetError.message ?? resetError}`)
    }

    return res.status(200).json({
      success: true,
      email: barbero.email,
      nombre: `${barbero.nombre} ${barbero.apellido}`,
      message: 'Email enviado'
    })

  } catch (error: any) {
    console.error('[Reset Password] Error:', error)
    return res.status(500).json({ error: error.message || 'Error reseteando contraseña' })
  }
}
