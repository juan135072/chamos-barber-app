import type { NextApiRequest, NextApiResponse } from 'next'

// Diagnostic actions must never send notifications or incur AI usage in production.
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(404).json({ error: 'Not found' })
}
