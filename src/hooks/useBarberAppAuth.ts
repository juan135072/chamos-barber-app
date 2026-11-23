// ================================================================
// 📱 HOOK: useBarberAppAuth
// Maneja la autenticación específica para la Barber App
// ================================================================

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import { checkAppSession, isNoRowsError } from '../lib/app-session'
import { logoutOneSignal } from '../lib/onesignal-client'
import { createRetryBackoff } from '../lib/insforge-react'
import type { BarberoSession } from '../types/barber-app'

type AuthOutcome =
  | { status: 'ok'; session: BarberoSession }
  | { status: 'denied'; message: string }
  | { status: 'transient' }

async function resolveBarberoSession(): Promise<AuthOutcome> {
  const denied = (message: string): AuthOutcome => ({ status: 'denied', message })

  // 1. Verificar sesión (cookie propia de Chamos, no el refresh del SDK)
  const check = await checkAppSession()
  if (check.status === 'unknown') return { status: 'transient' }
  if (check.status === 'signed-out') return denied('No hay sesión activa')
  const authUserId = check.session.user.id

  // 2. Obtener datos del usuario admin
  const { data: adminUser, error: adminError } = await supabase
    .from('admin_users')
    .select('id, email, nombre, rol, barbero_id')
    .eq('id', authUserId)
    .single()

  if (adminError && !isNoRowsError(adminError)) return { status: 'transient' }
  if (!adminUser) return denied('Usuario no encontrado')

  // 3. Verificar que sea un barbero
  if ((adminUser as any).rol !== 'barbero') return denied('Este usuario no es un barbero')
  if (!(adminUser as any).barbero_id) return denied('Usuario barbero sin perfil de barbero asociado')

  // 4. Obtener datos completos del barbero
  const { data: barbero, error: barberoError } = await supabase
    .from('barberos')
    .select('*')
    .eq('id', (adminUser as any).barbero_id)
    .single()

  if (barberoError && !isNoRowsError(barberoError)) return { status: 'transient' }
  if (!barbero) return denied('Perfil de barbero no encontrado')

  // 5. Crear sesión de barbero
  return {
    status: 'ok',
    session: {
      userId: authUserId,
      barberoId: (barbero as any).id,
      barbero: barbero as any,
      email: (adminUser as any).email,
      nombre: (adminUser as any).nombre
    }
  }
}

export function useBarberAppAuth() {
  const router = useRouter()
  const [session, setSession] = useState<BarberoSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const sessionRef = useRef<BarberoSession | null>(null)
  const retryTimer = useRef<ReturnType<typeof setTimeout>>()
  // Sin conexión o servidor caído no es un cierre de sesión: se reintenta en
  // silencio con el mismo calendario que useSession (3 s, 6 s, 12 s … 30 s).
  const backoff = useRef(createRetryBackoff())
  // Solo la verificación más reciente puede cambiar el estado: una más vieja
  // que responde tarde (p. ej. "sin sesión" de antes del login) se descarta.
  const latestCheck = useRef(0)
  const checkInFlight = useRef(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    checkAuth()

    // Re-check on tab focus or reconnect — catches expired sessions when the user returns to the tab.
    // These start a fresh check even if one is pending: that one may hang from the background or offline.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkAuth()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', checkAuth)

    // Periodic check every 5 minutes — redirects if the refresh token has expired
    const interval = setInterval(checkIfIdle, 5 * 60 * 1000)

    return () => {
      mounted.current = false
      clearTimeout(retryTimer.current)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', checkAuth)
      clearInterval(interval)
    }
  }, [])

  const checkIfIdle = () => {
    if (!checkInFlight.current) checkAuth()
  }

  const checkAuth = async () => {
    const check = ++latestCheck.current
    checkInFlight.current = true
    clearTimeout(retryTimer.current)
    // Después de la primera verificación, las siguientes corren en segundo plano (sin spinner).
    const background = sessionRef.current !== null
    if (!background) {
      setLoading(true)
      setError(null)
    }

    let outcome: AuthOutcome
    try {
      outcome = await resolveBarberoSession()
    } catch (err) {
      console.warn('No se pudo verificar la sesión del barbero:', err)
      outcome = { status: 'transient' }
    }
    if (!mounted.current || check !== latestCheck.current) return
    checkInFlight.current = false

    if (outcome.status === 'transient') {
      // Mantener la sesión actual (o el spinner inicial) y reintentar.
      retryTimer.current = setTimeout(checkAuth, backoff.current.next())
      return
    }
    backoff.current.reset()

    if (outcome.status === 'ok') {
      // Mismo contenido = mismo objeto: evita re-renderizar y recargar la agenda.
      if (JSON.stringify(sessionRef.current) !== JSON.stringify(outcome.session)) {
        sessionRef.current = outcome.session
        setSession(outcome.session)
      }
      setError(null)
    } else {
      console.error('Error en autenticación de barbero:', outcome.message)
      sessionRef.current = null
      setSession(null)
      setError(outcome.message)

      // Redirigir al login si no hay sesión válida
      setTimeout(() => {
        router.push('/chamos-acceso')
      }, 2000)
    }
    setLoading(false)
  }

  const logout = async () => {
    // Desvincular este dispositivo del barbero en OneSignal (acotado, nunca bloquea)
    await logoutOneSignal()
    try {
      await supabase.auth.signOut()
      sessionRef.current = null
      setSession(null)
      router.push('/chamos-acceso')
    } catch (err: any) {
      console.error('Error al cerrar sesión:', err)
      setError('Error al cerrar sesión')
    }
  }

  return {
    session,
    loading,
    error,
    logout,
    signOut: logout,
    isAuthenticated: !!session,
    barbero: session?.barbero || null,
    barberoId: session?.barberoId || null
  }
}
