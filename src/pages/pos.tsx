import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { usePermissions } from '@/hooks/usePermissions'
import { supabase } from '@/lib/supabase'
import CobrarForm from '@/components/pos/CobrarForm'
import ResumenDia from '@/components/pos/ResumenDia'
import ListaVentas from '@/components/pos/ListaVentas'
import Logo from '@/components/shared/Logo'

export default function POSPage() {
  const router = useRouter()
  const { usuario, cargando, puedeAccederPOS, esAdmin, esCajero } = usePermissions()
  const [recargarVentas, setRecargarVentas] = useState(0)

  useEffect(() => {
    if (cargando) return

    if (!usuario) {
      router.push('/chamos-acceso')
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
    router.push('/chamos-acceso')
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
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Header */}
        <header style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
          <div className="max-w-full px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Logo size="md" withText={false} />
                <h1 className="text-2xl font-bold" style={{ color: 'var(--accent-color)' }}>
                  <i className="fas fa-cash-register mr-2"></i>
                  CHAMOS BARBERÍA - POS
                </h1>
              </div>

              <div className="flex items-center space-x-4">
                {/* Fecha y hora */}
                <div className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
                  <i className="fas fa-calendar-alt mr-2"></i>
                  {new Date().toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>

                {/* Usuario */}
                <div className="flex items-center space-x-2 px-4 py-2 rounded-lg" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                  <span className="text-2xl">
                    {esCajero ? '💰' : esAdmin ? '👑' : '👤'}
                  </span>
                  <div className="text-sm">
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{usuario.nombre}</div>
                    <div className="capitalize" style={{ color: 'var(--accent-color)' }}>{usuario.rol}</div>
                  </div>
                </div>

                {/* Botones de navegación */}
                {esAdmin && (
                  <button
                    onClick={handleVolverAdmin}
                    className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
                    style={{
                      color: 'var(--text-primary)',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-color)'
                      e.currentTarget.style.color = 'var(--accent-color)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)'
                      e.currentTarget.style.color = 'var(--text-primary)'
                    }}
                  >
                    <i className="fas fa-arrow-left mr-2"></i>
                    Admin Panel
                  </button>
                )}

                <button
                  onClick={handleCerrarSesion}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
                  style={{
                    color: 'var(--bg-primary)',
                    backgroundColor: 'var(--accent-color)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#B8941F'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-color)'}
                >
                  <i className="fas fa-sign-out-alt mr-2"></i>
                  Cerrar Sesión
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

