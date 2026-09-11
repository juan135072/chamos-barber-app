import { getAppSession } from './app-session'

export async function posRequest(path: string, body?: unknown) {
  const token = (await getAppSession())?.access_token
  const response = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.message || result.error || 'No se pudo completar la operación')
  return result
}
