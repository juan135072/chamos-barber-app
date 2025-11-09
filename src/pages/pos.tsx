import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { usePermissions } from '@/hooks/usePermissions'
import { supabase } from '@/lib/supabase'
import CobrarForm from '@/components/pos/CobrarForm'
import ResumenDia from '@/components/pos/ResumenDia'
import ListaVentas from '@/components/pos/ListaVentas'

export default function POSPage() {
  const router = useRouter()
  const { usuario, cargando, puedeAccederPOS, esAdmin, esCajero } = usePermissions()
  const [recargarVentas, setRecargarVentas] = useState(0)

  useEffect(() => {
    if (cargando) return

    if (!usuario) {
      router.push('/login')
      return
    }

    if (!puedeAccederPOS()) {
      alert('No tienes permisos para acceder al punto de venta')
      router.push('/')
      return
    }
  }, [usuario, cargando, router])

  const handleCerrarSesion = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleVolverAdmin = () => {
    router.push('/admin')
  }

  const handleVentaCreada = () => {
    // Incrementar para recargar las ventas
    setRecargarVentas(prev => prev + 1)
  }

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!usuario || !puedeAccederPOS()) {
    return null
  }

  return (
    <>
      <Head>
        <title>Punto de Venta - Chamos Barber</title>
        <meta name="description" content="Sistema de punto de venta para Chamos Barber" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-full px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  🏪 CHAMOS BARBERÍA - POS
                </h1>
              </div>

              <div className="flex items-center space-x-4">
                {/* Fecha y hora */}
                <div className="text-sm text-gray-600">
                  📅 {new Date().toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>

                {/* Usuario */}
                <div className="flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-lg">
                  <span className="text-2xl">
                    {esCajero ? '💰' : esAdmin ? '👑' : '👤'}
                  </span>
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">{usuario.nombre}</div>
                    <div className="text-gray-500 capitalize">{usuario.rol}</div>
                  </div>
                </div>

                {/* Botones de navegación */}
                {esAdmin && (
                  <button
                    onClick={handleVolverAdmin}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    ← Admin Panel
                  </button>
                )}

                <button
                  onClick={handleCerrarSesion}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  🚪 Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Área principal (70%) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Formulario de cobro */}
              <CobrarForm 
                usuario={usuario} 
                onVentaCreada={handleVentaCreada}
              />

              {/* Lista de ventas */}
              <ListaVentas 
                usuario={usuario}
                recargar={recargarVentas}
              />
            </div>

            {/* Sidebar (30%) */}
            <div className="lg:col-span-1">
              <ResumenDia 
                usuario={usuario}
                recargar={recargarVentas}
              />
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
