import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { useSession, useSupabaseClient } from '@/lib/insforge-react'
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
    // Wait for useSession() to finish its async check (returns undefined while
    // loading). Without this guard we'd redirect during the loading window.
    if (session === undefined) return
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

      <div className="min-h-screen bg-[#080808] relative">
        {/* Background Orbs */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 pb-24">
          {/* Header - Solo visible en navegador normal */}
          {!isStandalone && (
            <header className="bg-white/[0.02] border-b border-white/5 backdrop-blur-md sticky top-0 z-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gold to-[#a88647] p-[1px]">
                      <div className="w-full h-full rounded-xl bg-[#080808] flex items-center justify-center">
                        <i className="fas fa-scissors text-gold"></i>
                      </div>
                    </div>
                    <div>
                      <h1 className="text-lg font-black text-white uppercase tracking-wider m-0 leading-tight">Panel de Barbero</h1>
                      <p className="text-xs text-gold tracking-widest m-0 uppercase">Chamos Barber</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right mr-2">
                      <p className="text-sm font-bold text-white m-0">{profile.nombre} {profile.apellido}</p>
                      <p className="text-xs text-gold uppercase tracking-widest m-0">barbero</p>
                    </div>
                    
                    <button
                      onClick={() => router.push('/barbero/liquidaciones')}
                      className="relative group inline-flex overflow-hidden rounded-xl bg-green-500/20 p-[1px] shrink-0"
                    >
                      <div className="relative bg-[#080808] px-4 py-2 rounded-xl transition-colors duration-300 group-hover:bg-green-500/10 flex items-center gap-2">
                        <i className="fas fa-money-bill-wave text-green-400 group-hover:text-green-300 transition-colors"></i>
                        <span className="relative z-10 text-white font-bold text-sm">Mis Liquidaciones</span>
                      </div>
                    </button>

                    <button
                      onClick={handleLogout}
                      className="relative group inline-flex overflow-hidden rounded-xl bg-gradient-to-br from-red-500 to-red-800 p-[1px] shrink-0"
                    >
                      <div className="relative bg-[#080808] px-4 py-2 rounded-xl transition-colors duration-300 group-hover:bg-transparent flex items-center gap-2">
                        <i className="fas fa-sign-out-alt text-red-400 group-hover:text-white transition-colors"></i>
                        <span className="relative z-10 text-white font-bold text-sm">Cerrar Sesión</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </header>
          )}

          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">

            {/* Header minimalista para PWA */}
            {isStandalone && profile && (
              <div className="flex justify-between items-center mb-6 p-4 bg-white/[0.02] border border-white/10 rounded-2xl backdrop-blur-xl shadow-xl shadow-black/50">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-gold to-[#a88647] p-[1px]">
                    <div className="w-full h-full rounded-xl bg-[#080808] flex items-center justify-center">
                      <i className="fas fa-scissors text-gold text-lg"></i>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white uppercase tracking-wider m-0">Chamos Barber</h2>
                    <p className="text-xs text-gold tracking-widest m-0 uppercase">Panel de Barbero</p>
                  </div>
                </div>
                <div style={{ flex: 1 }}></div>
                <NotificationBell />
              </div>
            )}

            {/* Tabs - Solo visibles en navegador normal */}
            {!isStandalone && (
              <div className="flex gap-2 mb-8 border-b border-white/10 overflow-x-auto pb-2 scrollbar-hide">
                {[
                  { id: 'dashboard', icon: 'fa-home', label: 'Resumen' },
                  { id: 'perfil', icon: 'fa-user', label: 'Mi Perfil' },
                  { id: 'citas', icon: 'fa-calendar-alt', label: 'Mis Citas' },
                  { id: 'ganancias', icon: 'fa-chart-line', label: 'Mis Ganancias' },
                  { id: 'seguridad', icon: 'fa-shield-alt', label: 'Seguridad' },
                  { id: 'asistencia', icon: 'fa-clock', label: 'Asistencia' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`whitespace-nowrap px-6 py-3 rounded-t-xl font-bold transition-all border-b-2 flex items-center gap-2 ${
                      activeTab === tab.id
                        ? 'border-gold text-gold bg-gold/5'
                        : 'border-transparent text-white/50 hover:text-white/80 hover:bg-white/[0.02]'
                    }`}
                  >
                    <i className={`fas ${tab.icon}`}></i> {tab.label}
                  </button>
                ))}
              </div>
            )}

            {/* Content */}
            <div className="space-y-6">
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

          </div>

          {/* Bottom Navigation por Standalone Mode */}
          {isStandalone && (
            <nav className="fixed bottom-0 left-0 right-0 bg-[#080808]/90 backdrop-blur-xl border-t border-white/10 flex justify-around pb-safe pt-2 z-50">
              {[
                { id: 'dashboard', icon: 'fa-home', label: 'Inicio' },
                { id: 'citas', icon: 'fa-calendar-alt', label: 'Citas' },
                { id: 'ganancias', icon: 'fa-chart-line', label: 'Dinero' },
                { id: 'perfil', icon: 'fa-user-circle', label: 'Perfil' },
                { id: 'asistencia', icon: 'fa-clock', label: 'Asist' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 transition-all ${
                    activeTab === tab.id ? 'text-gold' : 'text-white/40'
                  }`}
                >
                  <i className={`fas ${tab.icon} text-xl`}></i>
                  <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
                </button>
              ))}
              <button
                onClick={() => router.push('/barbero/liquidaciones')}
                className="flex-1 flex flex-col items-center gap-1 py-2 text-white/40 transition-all"
              >
                <i className="fas fa-wallet text-xl"></i>
                <span className="text-[10px] font-bold uppercase tracking-wider">Pagos</span>
              </button>
            </nav>
          )}

          {/* OneSignal Reset Button */}
          <OneSignalResetButton />
        </div>
      </div>
    </>
    </BarberoProvider>
  )
}

export default BarberoPanelPage

