// ================================================================
// 📱 HOOK: useBarberAppAuth
// Maneja la autenticación específica para la Barber App
// ================================================================

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabase'
import type { BarberoSession } from '../types/barber-app'

export function useBarberAppAuth() {
  const router = useRouter()
  const [session, setSession] = useState<BarberoSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkAuth()

    // Suscribirse a cambios de autenticación
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setSession(null)
        router.push('/login')
      } else if (event === 'SIGNED_IN' && session) {
        checkAuth()
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const checkAuth = async () => {
    try {
      setLoading(true)
      setError(null)

      // 1. Verificar sesión de Supabase
      const { data: { session: authSession }, error: authError } = await supabase.auth.getSession()
      
      if (authError || !authSession) {
        throw new Error('No hay sesión activa')
      }

      // 2. Obtener datos del usuario admin
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('id, email, nombre, rol, barbero_id')
        .eq('id', authSession.user.id)
        .single()

      if (adminError || !adminUser) {
        throw new Error('Usuario no encontrado')
      }

      // 3. Verificar que sea un barbero
      if ((adminUser as any).rol !== 'barbero') {
        throw new Error('Este usuario no es un barbero')
      }

      if (!(adminUser as any).barbero_id) {
        throw new Error('Usuario barbero sin perfil de barbero asociado')
      }

      // 4. Obtener datos completos del barbero
      const { data: barbero, error: barberoError } = await supabase
        .from('barberos')
        .select('*')
        .eq('id', (adminUser as any).barbero_id)
        .single()

      if (barberoError || !barbero) {
        throw new Error('Perfil de barbero no encontrado')
      }

      // 5. Actualizar última conexión
      await supabase.rpc('actualizar_ultima_conexion', {
        barbero_uuid: (barbero as any).id
      } as any)

      // 6. Crear sesión de barbero
      const barberoSession: BarberoSession = {
        userId: authSession.user.id,
        barberoId: (barbero as any).id,
        barbero: barbero as any,
        email: (adminUser as any).email,
        nombre: (adminUser as any).nombre
      }

      setSession(barberoSession)
    } catch (err: any) {
      console.error('Error en autenticación de barbero:', err)
      setError(err.message || 'Error al verificar autenticación')
      
      // Redirigir al login si hay error
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await supabase.auth.signOut()
      setSession(null)
      router.push('/login')
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
