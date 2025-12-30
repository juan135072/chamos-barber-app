/**
 * =====================================================
 * 📄 PÁGINA - ADMIN LIQUIDACIONES
 * =====================================================
 * Ruta: /admin/liquidaciones
 * Acceso: Solo administradores
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import AdminLiquidacionesPanel from '@/components/liquidaciones/AdminLiquidacionesPanel'
import { supabase } from '@/lib/supabase'
import Logo from '@/components/shared/Logo'

export default function AdminLiquidacionesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

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
        router.push('/chamos-acceso')
        return
      }

      // Verificar si es admin
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('rol')
        .eq('id', session.user.id)
        .single()

      if (adminError || !adminUser || (adminUser as any).rol !== 'admin') {
        router.push('/chamos-acceso')
        return
      }

      setIsAdmin(true)
    } catch (error) {
      console.error('Error verificando autenticación:', error)
      router.push('/chamos-acceso')
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

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header con navegación */}
      <header style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Logo size="sm" withText={false} />
              <button
                onClick={() => router.push('/admin')}
                className="font-medium transition-colors"
                style={{ color: 'var(--accent-color)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#B8941F'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--accent-color)'}
              >
                ← Volver al Panel
              </button>
              <span style={{ color: 'var(--border-color)' }}>|</span>
              <h1 className="text-xl font-bold" style={{ color: 'var(--accent-color)' }}>
                Sistema de Liquidaciones
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/pos')}
                className="px-4 py-2 transition-colors"
                style={{ color: 'var(--text-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-color)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
              >
                POS
              </button>
              <button
                onClick={async () => {
                  await supabase.auth.signOut()
                  router.push('/chamos-acceso')
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
        <AdminLiquidacionesPanel />
      </main>
    </div>
  )
}

