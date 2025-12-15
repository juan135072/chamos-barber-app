/**
 * =====================================================
 * 📄 PÁGINA - BARBERO LIQUIDACIONES
 * =====================================================
 * Ruta: /barbero/liquidaciones
 * Acceso: Solo barberos autenticados
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import BarberoLiquidacionesPanel from '@/components/liquidaciones/BarberoLiquidacionesPanel'
import { supabase } from '@/lib/supabase'

export default function BarberoLiquidacionesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [barberoId, setBarberoId] = useState<string | null>(null)
  const [barberoNombre, setBarberoNombre] = useState<string>('')

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      // Verificar sesión
      const {
        data: { session },
        error: sessionError
      } = await supabase.auth.getSession()

      if (sessionError || !session) {
        router.push('/login')
        return
      }

      // Verificar si es admin_user con barbero_id
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('barbero_id')
        .eq('id', session.user.id)
        .single()

      if (adminError || !adminUser || !(adminUser as any).barbero_id) {
        // No es un barbero, redirigir
        router.push('/login')
        return
      }

      // Obtener datos del barbero
      const { data: barbero, error: barberoError } = await supabase
        .from('barberos')
        .select('id, nombre, apellido')
        .eq('id', (adminUser as any).barbero_id)
        .single()

      if (barberoError || !barbero) {
        router.push('/login')
        return
      }

      setBarberoId((barbero as any).id)
      setBarberoNombre(`${(barbero as any).nombre} ${(barbero as any).apellido}`)
    } catch (error) {
      console.error('Error verificando autenticación:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--accent-color)' }}></div>
      </div>
    )
  }

  if (!barberoId) {
    return null
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header con navegación */}
      <header style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/barbero-panel')}
                className="font-medium transition-colors"
                style={{ color: 'var(--accent-color)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#B8941F'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--accent-color)'}
              >
                ← Volver al Panel
              </button>
              <span style={{ color: 'var(--border-color)' }}>|</span>
              <h1 className="text-xl font-bold" style={{ color: 'var(--accent-color)' }}>
                Mis Liquidaciones
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
                Hola, <strong style={{ color: 'var(--accent-color)' }}>{barberoNombre}</strong>
              </span>
              <button
                onClick={async () => {
                  await supabase.auth.signOut()
                  router.push('/login')
                }}
                className="px-4 py-2 rounded-lg transition-colors"
                style={{ backgroundColor: '#dc2626', color: 'white' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BarberoLiquidacionesPanel barberoId={barberoId} />
      </main>
    </div>
  )
}
