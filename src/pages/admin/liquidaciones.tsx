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
        router.push('/login')
        return
      }

      // Verificar si es admin
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('rol')
        .eq('id', session.user.id)
        .single()

      if (adminError || !adminUser || adminUser.rol !== 'admin') {
        router.push('/login')
        return
      }

      setIsAdmin(true)
    } catch (error) {
      console.error('Error verificando autenticación:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header con navegación */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin')}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                ← Volver al Panel
              </button>
              <span className="text-gray-300">|</span>
              <h1 className="text-xl font-bold text-gray-900">
                Sistema de Liquidaciones
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/pos')}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                POS
              </button>
              <button
                onClick={async () => {
                  await supabase.auth.signOut()
                  router.push('/login')
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
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
