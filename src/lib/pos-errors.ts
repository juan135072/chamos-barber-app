import type { NextApiResponse } from 'next'

export function respondPosError(res: NextApiResponse, error: any, operation: string) {
  const code = String(error?.code ?? '')
  // Log only structured diagnostics, never the submitted payload, PIN or token.
  console.error(`[pos:${operation}]`, { code, message: String(error?.message ?? 'Unknown error').slice(0, 300) })
  const message = code === 'P0001' ? String(error.message) : code === '23505' ? 'Esta operación ya fue registrada. Actualiza el POS.' : 'No se pudo completar la operación. Intenta nuevamente.'
  return res.status(['P0001', '23505'].includes(code) ? 409 : 500).json({ message, error: message })
}
