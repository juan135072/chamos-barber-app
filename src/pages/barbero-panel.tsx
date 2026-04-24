import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react'
import toast, { Toaster } from 'react-hot-toast'
import CitasSection from '../components/barbero/CitasSection'
import GananciasSection from '../components/barbero/GananciasSection'
import ChangePasswordSection from '../components/barbero/ChangePasswordSection'
import MarcarAsistencia from '../components/barbero/MarcarAsistencia'
import HistorialAsistencia from '../components/barbero/HistorialAsistencia'
import PerfilSection from '../components/barbero/PerfilSection'
import { Bell, BellOff } from 'lucide-react'
import DashboardSection from '../components/barbero/DashboardSection'
import { useOneSignal } from '../components/providers/OneSignalProvider'
import OneSignalResetButton from '../components/barbero/OneSignalResetButton'
import { BarberoProvider, type BarberoProfile } from '../context/BarberoContext'


const BarberoPanelPage: React.FC = () => {
  const session = useSession()
  const supabase = useSupabaseClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<BarberoProfile | null>(null)
  const [activeTab, setActiveTab] = useState<'perfil' | 'citas' | 'ganancias' | 'seguridad' | 'dashboard' | 'asistencia'>('dashboard')
  const [isStandalone, setIsStandalone] = useState(false)

  const { triggerPrompt, setExternalId } = useOneSignal()

  const loadBarberoData = useCallback(async () => {
    if (!session?.user?.id) return
    try {
      setLoading(true)
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('barbero_id, rol')
        .eq('id', session.user.id)
        .single()

      if (adminError || !adminUser || adminUser.rol !== 'barbero') {
        toast.error('No tienes permisos para acceder a este panel')
        router.push('/chamos-acceso')
        return
      }

      const { data: barbero, error: barberoError } = await supabase
        .from('barberos')
        .select('*')
        .eq('id', adminUser.barbero_id)
        .single()

      if (barberoError) throw barberoError

      setProfile(barbero)
      setExternalId(barbero.id)
      setTimeout(() => triggerPrompt(), 5000)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error al cargar tus datos')
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://')
      setIsStandalone(isPWA)
    }
    if (!session) {
      router.push('/chamos-acceso')
      return
    }
    loadBarberoData()
  }, [session])

  // Obtener estado de OneSignal
  const { permissionStatus, triggerPrompt: osTriggerPrompt, repairSubscription } = useOneSignal()

  // Icono dinámico según el estado de permisos
  const NotificationBell = () => {
    return (
      <button
        onClick={() => {
          console.log('🔔 Clic manual en campana')
          triggerPrompt()
        }}
        onDoubleClick={repairSubscription}
        style={{
          padding: '0.5rem',
          borderRadius: '50%',
          background: permissionStatus === 'granted' ? 'rgba(16, 185, 129, 0.1)' :
            permissionStatus === 'denied' ? 'rgba(239, 68, 68, 0.1)' :
              'rgba(212, 175, 55, 0.1)',
          color: permissionStatus === 'granted' ? '#10B981' :
            permissionStatus === 'denied' ? '#EF4444' :
              '#D4AF37',
          border: '1px solid currentColor',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          animation: permissionStatus === 'default' ? 'pulse 2s infinite' : 'none'
        }}
        title="Estado de notificaciones (Doble clic para reparar)"
      >
        {permissionStatus === 'granted' ? <Bell size={20} /> : <BellOff size={20} />}
      </button>
    )
  }


  const handleLogout = async () => {
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

      // Intentar cerrar sesión en Supabase
      await supabase.auth.signOut()
    } catch (error) {
      console.error('⚠️ Error durante signOut de Supabase (procediendo con redirección):', error)
    } finally {
      // Forzar redirección siempre
      router.push('/chamos-acceso')
    }
  }

  if (loading) {
    return (
      <>
        <Head>
          <title>Cargando... - Chamos Barber</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 mx-auto mb-4" style={{ borderBottom: '2px solid var(--accent-color)' }}></div>
            <p style={{ color: 'var(--text-primary)', opacity: 0.8 }}>Cargando tu panel...</p>
          </div>
        </div>
      </>
    )
  }

  if (!profile) {
    return (
      <>
        <Head>
          <title>Error - Chamos Barber</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '60vh',
            flexDirection: 'column',
            gap: '2rem'
          }}>
            <h2 style={{ color: 'var(--text-primary)' }}>No se pudo cargar tu perfil</h2>
            <button onClick={() => router.push('/chamos-acceso')} className="btn btn-primary">
              Volver al Login
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <BarberoProvider value={{ profile, barberoId: profile.id, refetchProfile: loadBarberoData, handleLogout }}>
    <>
      <Head>
        <title>{`Panel de ${profile.nombre} - Chamos Barber`}</title>
        <meta name="description" content="Panel de control para barberos" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <Toaster position="top-right" />

      {/* Estilos para animaciones */}
      <style jsx global>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Header - Solo visible en navegador normal */}
        {!isStandalone && (
          <header style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-4">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-color)' }}>
                    <i className="fas fa-scissors" style={{ color: 'var(--bg-primary)' }}></i>
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Panel de Barbero</h1>
                    <p className="text-sm" style={{ color: 'var(--accent-color)' }}>Chamos Barber</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{profile.nombre} {profile.apellido}</p>
                    <p className="text-xs" style={{ color: 'var(--accent-color)' }}>barbero</p>
                  </div>
                  <button
                    onClick={() => router.push('/barbero/liquidaciones')}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2"
                    style={{
                      backgroundColor: '#10B981',
                      color: 'white',
                      transition: 'var(--transition)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10B981'}
                  >
                    <i className="fas fa-money-bill-wave mr-2"></i>
                    Mis Liquidaciones
                  </button>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2"
                    style={{
                      backgroundColor: 'var(--accent-color)',
                      color: 'var(--bg-primary)',
                      transition: 'var(--transition)'
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
        )}

        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">

          {/* Header minimalista para PWA */}
          {isStandalone && profile && (
            <div style={{
              display: 'flex',
              justifyContent: 'between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              padding: '0.5rem',
              background: 'var(--bg-secondary)',
              borderRadius: '12px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-color)' }}>
                  <i className="fas fa-scissors" style={{ color: 'var(--bg-primary)', fontSize: '0.8rem' }}></i>
                </div>
                <div>
                  <h2 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>Chamos Barber</h2>
                  <p style={{ fontSize: '0.75rem', color: 'var(--accent-color)', margin: 0 }}>Panel de Barbero</p>
                </div>
              </div>
              <div style={{ flex: 1 }}></div>
              <NotificationBell />
            </div>
          )}

          {/* Tabs - Solo visibles en navegador normal */}
          {!isStandalone && (
            <div style={{
              display: 'flex',
              gap: '1rem',
              marginBottom: '2rem',
              borderBottom: '2px solid var(--border-color)',
              overflowX: 'auto',
              paddingBottom: '5px'
            }}>
              <button
                onClick={() => setActiveTab('dashboard')}
                style={{
                  padding: '1rem 2rem',
                  background: 'none',
                  border: 'none',
                  whiteSpace: 'nowrap',
                  borderBottom: activeTab === 'dashboard' ? '3px solid var(--accent-color)' : 'none',
                  color: activeTab === 'dashboard' ? 'var(--accent-color)' : 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  transition: 'all 0.3s'
                }}
              >
                <i className="fas fa-home"></i> Resumen
              </button>
              <button
                onClick={() => setActiveTab('perfil')}
                style={{
                  padding: '1rem 2rem',
                  background: 'none',
                  border: 'none',
                  whiteSpace: 'nowrap',
                  borderBottom: activeTab === 'perfil' ? '3px solid var(--accent-color)' : 'none',
                  color: activeTab === 'perfil' ? 'var(--accent-color)' : 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  transition: 'all 0.3s'
                }}
              >
                <i className="fas fa-user"></i> Mi Perfil
              </button>
              <button
                onClick={() => setActiveTab('citas')}
                style={{
                  padding: '1rem 2rem',
                  background: 'none',
                  border: 'none',
                  whiteSpace: 'nowrap',
                  borderBottom: activeTab === 'citas' ? '3px solid var(--accent-color)' : 'none',
                  color: activeTab === 'citas' ? 'var(--accent-color)' : 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  transition: 'all 0.3s'
                }}
              >
                <i className="fas fa-calendar-alt"></i> Mis Citas
              </button>
              <button
                onClick={() => setActiveTab('ganancias')}
                style={{
                  padding: '1rem 2rem',
                  background: 'none',
                  border: 'none',
                  whiteSpace: 'nowrap',
                  borderBottom: activeTab === 'ganancias' ? '3px solid var(--accent-color)' : 'none',
                  color: activeTab === 'ganancias' ? 'var(--accent-color)' : 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  transition: 'all 0.3s'
                }}
              >
                <i className="fas fa-chart-line"></i> Mis Ganancias
              </button>
              <button
                onClick={() => setActiveTab('seguridad')}
                style={{
                  padding: '1rem 2rem',
                  background: 'none',
                  border: 'none',
                  whiteSpace: 'nowrap',
                  borderBottom: activeTab === 'seguridad' ? '3px solid var(--accent-color)' : 'none',
                  color: activeTab === 'seguridad' ? 'var(--accent-color)' : 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  transition: 'all 0.3s'
                }}
              >
                <i className="fas fa-shield-alt"></i> Seguridad
              </button>
              <button
                onClick={() => setActiveTab('asistencia')}
                style={{
                  padding: '1rem 2rem',
                  background: 'none',
                  border: 'none',
                  whiteSpace: 'nowrap',
                  borderBottom: activeTab === 'asistencia' ? '3px solid var(--accent-color)' : 'none',
                  color: activeTab === 'asistencia' ? 'var(--accent-color)' : 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                  transition: 'all 0.3s'
                }}
              >
                <i className="fas fa-clock"></i> Asistencia
              </button>
            </div>
          )}

          {/* Content */}
          {activeTab === 'dashboard' && profile && (
            <DashboardSection barberoId={profile.id} nombreBarbero={profile.nombre} />
          )}

          {activeTab === 'citas' && profile && (
            <CitasSection barberoId={profile.id} />
          )}

          {activeTab === 'ganancias' && profile && (
            <GananciasSection barberoId={profile.id} />
          )}

          {activeTab === 'seguridad' && (
            <ChangePasswordSection />
          )}

          {activeTab === 'asistencia' && profile && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MarcarAsistencia barberoId={profile.id} />
              <HistorialAsistencia barberoId={profile.id} />
            </div>
          )}

          {activeTab === 'perfil' && <PerfilSection />}

        </div>

        {/* Bottom Navigation por Standalone Mode */}
        {isStandalone && (
          <nav style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'var(--bg-secondary)',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-around',
            paddingBottom: 'env(safe-area-inset-bottom)',
            zIndex: 1000
          }}>
            <button
              onClick={() => setActiveTab('dashboard')}
              style={{
                flex: 1,
                padding: '0.75rem 0',
                background: 'none',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                color: activeTab === 'dashboard' ? 'var(--accent-color)' : 'var(--text-primary)',
                opacity: activeTab === 'dashboard' ? 1 : 0.6,
                transition: 'all 0.2s'
              }}
            >
              <i className="fas fa-home" style={{ fontSize: '1.2rem' }}></i>
              <span style={{ fontSize: '0.75rem' }}>Inicio</span>
            </button>
            <button
              onClick={() => setActiveTab('citas')}
              style={{
                flex: 1,
                padding: '0.75rem 0',
                background: 'none',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                color: activeTab === 'citas' ? 'var(--accent-color)' : 'var(--text-primary)',
                opacity: activeTab === 'citas' ? 1 : 0.6,
                transition: 'all 0.2s'
              }}
            >
              <i className="fas fa-calendar-alt" style={{ fontSize: '1.2rem' }}></i>
              <span style={{ fontSize: '0.75rem' }}>Citas</span>
            </button>
            <button
              onClick={() => setActiveTab('ganancias')}
              style={{
                flex: 1,
                padding: '0.75rem 0',
                background: 'none',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                color: activeTab === 'ganancias' ? 'var(--accent-color)' : 'var(--text-primary)',
                opacity: activeTab === 'ganancias' ? 1 : 0.6,
                transition: 'all 0.2s'
              }}
            >
              <i className="fas fa-chart-line" style={{ fontSize: '1.2rem' }}></i>
              <span style={{ fontSize: '0.75rem' }}>Dinero</span>
            </button>
            <button
              onClick={() => setActiveTab('perfil')}
              style={{
                flex: 1,
                padding: '0.75rem 0',
                background: 'none',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                color: activeTab === 'perfil' ? 'var(--accent-color)' : 'var(--text-primary)',
                opacity: activeTab === 'perfil' ? 1 : 0.6,
                transition: 'all 0.2s'
              }}
            >
              <i className="fas fa-user-circle" style={{ fontSize: '1.2rem' }}></i>
              <span style={{ fontSize: '0.75rem' }}>Perfil</span>
            </button>
            <button
              onClick={() => setActiveTab('asistencia')}
              style={{
                flex: 1,
                padding: '0.75rem 0',
                background: 'none',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                color: activeTab === 'asistencia' ? 'var(--accent-color)' : 'var(--text-primary)',
                opacity: activeTab === 'asistencia' ? 1 : 0.6,
                transition: 'all 0.2s'
              }}
            >
              <i className="fas fa-clock" style={{ fontSize: '1.2rem' }}></i>
              <span style={{ fontSize: '0.75rem' }}>Asistencia</span>
            </button>
            <button
              onClick={() => router.push('/barbero/liquidaciones')}
              style={{
                flex: 1,
                padding: '0.75rem 0',
                background: 'none',
                border: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--text-primary)',
                opacity: 0.6
              }}
            >
              <i className="fas fa-wallet" style={{ fontSize: '1.2rem' }}></i>
              <span style={{ fontSize: '0.75rem' }}>Pagos</span>
            </button>
          </nav>
        )}

        {/* OneSignal Reset Button */}
        <OneSignalResetButton />
      </div>
    </>
    </BarberoProvider>
  )
}

export default BarberoPanelPage

