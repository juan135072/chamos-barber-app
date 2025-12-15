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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!barberoId) {
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
                onClick={() => router.push('/barbero-panel')}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                ← Volver al Panel
              </button>
              <span className="text-gray-300">|</span>
              <h1 className="text-xl font-bold text-gray-900">
                Mis Liquidaciones
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Hola, <strong>{barberoNombre}</strong>
              </span>
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
        <BarberoLiquidacionesPanel barberoId={barberoId} />
      </main>
    </div>
  )
}
