import type { NextApiRequest, NextApiResponse } from 'next'

// Lightweight process readiness check: no writes, user data or external calls.
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).end()
  return res.status(200).json({ status: 'ok' })
}
