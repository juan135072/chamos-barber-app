import type { NextApiRequest, NextApiResponse } from 'next'

// Retired 2026-11-23. It sent an InsForge reset-code email, but the site has
// no page to enter the code, so the barber could never finish the reset.
// The admin now generates a temporary password with /api/barberos/credenciales.
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }
  return res.status(410).json({
    error: 'Este flujo ya no existe. Usa "Nueva contraseña" en la lista de barberos para generar una contraseña temporal.'
  })
}
