import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { usePermissions } from '@/hooks/usePermissions'
import { supabase } from '@/lib/supabase'
import CobrarForm from '@/components/pos/CobrarForm'
import ResumenDia from '@/components/pos/ResumenDia'
import ListaVentas from '@/components/pos/ListaVentas'
import Logo from '@/components/shared/Logo'
import { useCashRegister } from '@/hooks/useCashRegister'
import OpenRegisterModal from '@/components/pos/OpenRegisterModal'
import { formatCLP } from '@/lib/supabase-liquidaciones'

export default function POSPage() {
  const router = useRouter()
  const { usuario, cargando, puedeAccederPOS, esAdmin, esCajero } = usePermissions()
  const [recargarVentas, setRecargarVentas] = useState(0)
  const { sesion, loading: loadingCaja, abrirCaja, cerrarCaja, registrarVenta } = useCashRegister(usuario)

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
    try {
      // Limpiar datos locales preventivamente
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()

        // Limpiar cookies de sesión si es posible
        document.cookie.split(";").forEach((c) => {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
        })
      }

      await supabase.auth.signOut()
    } catch (error) {
      console.error('⚠️ Error durante signOut de Supabase:', error)
    } finally {
      router.push('/chamos-acceso')
    }
  }

  const handleVolverAdmin = () => {
    router.push('/admin')
  }

  const handleVentaCreada = () => {
    // Incrementar para recargar las ventas
    setRecargarVentas(prev => prev + 1)
  }

  if (cargando || (loadingCaja && usuario)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" style={{ borderColor: 'var(--accent-color)' }}></div>
          <p className="mt-4" style={{ color: 'var(--text-primary)' }}>Conectando con la caja...</p>
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
                    timeZone: 'America/Santiago',
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>

                {/* Estado de Caja */}
                <div className={`flex items-center space-x-3 px-4 py-2 rounded-lg border transition-all ${sesion ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
                  <div className={`w-3 h-3 rounded-full animate-pulse ${sesion ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <div className="text-sm">
                    <div className="font-bold flex items-center gap-2" style={{ color: sesion ? '#10b981' : '#ef4444' }}>
                      {sesion ? 'CAJA ABIERTA' : 'CAJA CERRADA'}
                      {sesion && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 font-medium">
                          Fondo: {formatCLP(sesion.monto_inicial)}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] opacity-60" style={{ color: 'var(--text-primary)' }}>
                      {sesion ? `Desde: ${new Date(sesion.fecha_apertura).toLocaleTimeString()}` : 'Sin turno activo'}
                    </div>
                  </div>
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

                {/* Botón Abrir Caja Manual */}
                <button
                  onClick={async () => {
                    try {
                      const controller = new AbortController()
                      const timeoutId = setTimeout(() => controller.abort(), 2000)

                      const response = await fetch('http://localhost:3001/open-drawer', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        signal: controller.signal
                      })
                      clearTimeout(timeoutId)

                      if (response.ok) {
                        alert('✅ Cajón abierto correctamente')
                      } else {
                        throw new Error('Error al abrir cajón')
                      }
                    } catch (e) {
                      alert('⚠️ No se pudo conectar con la impresora local para abrir el cajón.\n\nVerifica que el servicio de impresión esté ejecutándose en el puerto 3001.')
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-all"
                  style={{
                    color: 'var(--bg-primary)',
                    backgroundColor: 'var(--accent-color)',
                    border: '2px solid var(--accent-color)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#B8941F'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-color)'}
                  title="Abrir caja manualmente sin realizar un pago"
                >
                  <i className="fas fa-cash-register mr-2"></i>
                  Abrir Caja
                </button>

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
        <main className={`max-w-full px-4 sm:px-6 lg:px-8 py-6 transition-all ${!sesion ? 'blur-sm pointer-events-none grayscale' : ''}`}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Área principal (70%) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Formulario de cobro */}
              <CobrarForm
                usuario={usuario}
                onVentaCreada={handleVentaCreada}
                sesionCaja={sesion}
                registrarVentaCaja={registrarVenta}
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
                sesionCaja={sesion}
                onCerrarCaja={cerrarCaja}
              />
            </div>
          </div>
        </main>

        {/* Modal de Apertura Forzada */}
        {!sesion && !loadingCaja && (
          <OpenRegisterModal
            usuario={usuario}
            onOpen={abrirCaja}
          />
        )}
      </div>
    </>
  )
}

