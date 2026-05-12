import { lazy, Suspense, useEffect, useState } from 'react'
import { useSession, useSupabaseClient } from '@/lib/insforge-react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { chamosSupabase } from '@/lib/supabase-helpers'
import type { Database } from '@/lib/database.types'
import { useTenant } from '@/context/TenantContext'
import Logo from '../components/shared/Logo'

// Tabs cargadas bajo demanda — solo se descarga el bundle cuando la tab está activa
const BarberosTab = lazy(() => import('../components/admin/tabs/BarberosTab'))
const ServiciosTab = lazy(() => import('../components/admin/tabs/ServiciosTab'))
const HorariosTab = lazy(() => import('../components/admin/tabs/HorariosTab'))
const ConfiguracionTab = lazy(() => import('../components/admin/tabs/ConfiguracionTab'))
const CitasTab = lazy(() => import('../components/admin/tabs/CitasTab'))
const SolicitudesTab = lazy(() => import('../components/admin/tabs/SolicitudesTab'))
const CategoriasTab = lazy(() => import('../components/admin/tabs/CategoriasTab'))
const ClientesTab = lazy(() => import('../components/admin/tabs/ClientesTab'))
const ComisionesTab = lazy(() => import('../components/admin/tabs/ComisionesTab'))
const GananciasTab = lazy(() => import('../components/admin/tabs/GananciasTab'))
const InventarioTab = lazy(() => import('../components/admin/tabs/InventarioTab'))
const CalendarView = lazy(() => import('../components/admin/dashboard/CalendarView'))
const WalkInClientsPanel = lazy(() => import('../components/walkin/WalkInClientsPanel'))
const GestionUbicaciones = lazy(() => import('../components/admin/GestionUbicaciones'))
const GeneradorClave = lazy(() => import('../components/admin/GeneradorClave'))
const AsistenciaHoyPanel = lazy(() => import('../components/admin/AsistenciaHoyPanel'))
const ConfiguradorHorarios = lazy(() => import('../components/admin/ConfiguradorHorarios'))

type AdminUser = Database['public']['Tables']['admin_users']['Row']
type Barbero = Database['public']['Tables']['barberos']['Row']
type Servicio = Database['public']['Tables']['servicios']['Row']
type Cita = Database['public']['Tables']['citas']['Row'] & {
  barberos?: { nombre: string; apellido: string }
  servicios?: { nombre: string; precio: number; duracion_minutos: number }
}

export default function AdminPage() {
  const session = useSession()
  const supabase = useSupabaseClient<Database>()
  const router = useRouter()

  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { tenant } = useTenant()



  // Cerrar sidebar en móvil al cambiar de tab
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    // En móvil, cerrar sidebar después de seleccionar
    if (window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }

  // Ajustar sidebar inicial según tamaño de pantalla
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }

    // Ejecutar al montar
    handleResize()

    // Escuchar cambios de tamaño
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Estados para datos
  const [barberos, setBarberos] = useState<Barbero[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [citas, setCitas] = useState<Cita[]>([])
  const [stats, setStats] = useState({
    totalCitas: 0,
    citasHoy: 0,
    citasPendientes: 0,
    ingresosMes: 0
  })

  useEffect(() => {
    if (!session?.user) {
      router.push('/chamos-acceso')
      return
    }

    checkAdminAccess()
  }, [session])

  const checkAdminAccess = async () => {
    if (!session?.user?.email) return

    try {
      if (process.env.NODE_ENV !== 'production') console.log('[Admin] Verificando acceso para email:', session.user.email)
      const adminData = await chamosSupabase.getAdminUser(session.user.email)
      if (process.env.NODE_ENV !== 'production') console.log('[Admin] Datos obtenidos:', { email: adminData?.email, rol: adminData?.rol })

      if (!adminData || adminData.rol !== 'admin') {
        console.error('[Admin] ACCESO DENEGADO')
        await supabase.auth.signOut()
        router.push('/chamos-acceso')
        return
      }

      if (process.env.NODE_ENV !== 'production') console.log('[Admin] ✅ ACCESO CONCEDIDO')
      setAdminUser(adminData)
      setLoading(false)


      // Si el acceso es correcto, cargar el resto de datos
      loadDashboardData()
    } catch (error) {
      console.error('[Admin] Error checking admin access:', error)
      await supabase.auth.signOut()
      router.push('/chamos-acceso')
    } finally {
      setLoading(false)
    }
  }

  const loadDashboardData = async () => {
    try {
      const [barberosData, serviciosData, citasData] = await Promise.all([
        chamosSupabase.getBarberos(),
        chamosSupabase.getServicios(),
        chamosSupabase.getCitas(),
      ])

      setBarberos(barberosData)
      setServicios(serviciosData)

      const citasArray = (citasData || []) as Cita[]
      setCitas(citasArray)

      const today = new Date().toISOString().split('T')[0]
      setStats({
        totalCitas: citasArray.length,
        citasHoy: citasArray.filter((c: Cita) => c.fecha === today).length,
        citasPendientes: citasArray.filter((c: Cita) => c.estado === 'pendiente').length,
        ingresosMes: 0
      })
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/chamos-acceso')
  }

  const menuItems = [
    { id: 'dashboard', icon: 'fas fa-th-large', label: 'Dashboard' },
    { id: 'citas', icon: 'fas fa-calendar-alt', label: 'Citas' },
    { id: 'asistencia', icon: 'fas fa-clipboard-check', label: 'Asistencia' },
    { id: 'clientes', icon: 'fas fa-users', label: 'Clientes' },
    { id: 'walkin', icon: 'fas fa-walking', label: 'Walk-In' },
    { id: 'barberos', icon: 'fas fa-user-tie', label: 'Barberos' },
    { id: 'horarios', icon: 'fas fa-clock', label: 'Horarios' },
    { id: 'servicios', icon: 'fas fa-scissors', label: 'Servicios' },
    { id: 'categorias', icon: 'fas fa-tags', label: 'Categorías' },
    { id: 'inventario', icon: 'fas fa-boxes-stacked', label: 'Inventario' },
    { id: 'ubicaciones', icon: 'fas fa-map-marker-alt', label: 'Ubicaciones GPS' },
    { id: 'comisiones', icon: 'fas fa-percentage', label: 'Comisiones' },
    { id: 'ganancias', icon: 'fas fa-chart-line', label: 'Ganancias' },
    { id: 'configuracion', icon: 'fas fa-cog', label: 'Configuración' },
    { id: 'solicitudes', icon: 'fas fa-user-plus', label: 'Solicitudes' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0A0A0A' }}>
        <div className="text-center">
          <div
            className="w-12 h-12 mx-auto mb-4 rounded-full animate-spin"
            style={{
              border: '2px solid var(--tenant-primary, rgba(212, 175, 55, 0.2))',
              borderTopColor: 'var(--tenant-primary, #D4AF37)'
            }}
          />
          <p style={{ color: '#888', fontSize: '14px' }}>Cargando...</p>
        </div>
      </div>
    )
  }

  if (!adminUser) {
    return null
  }

  return (
    <>
      <Head>
        <title>Admin - {tenant?.nombre || 'Chamos Barber'}</title>
        <meta name="description" content={`Panel de administración ${tenant?.nombre || 'Chamos Barber'}`} />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen relative overflow-hidden text-white" style={{ backgroundColor: 'var(--tenant-bg, #0a0a0a)' }}>
        {/* Background Effects */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] blur-[120px] pointer-events-none rounded-full" style={{ backgroundColor: 'var(--tenant-primary, #D4AF37)', opacity: 0.05 }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] blur-[100px] pointer-events-none rounded-full" style={{ backgroundColor: 'var(--tenant-secondary, #ffffff)', opacity: 0.05 }} />

        {/* Sidebar */}
        <aside
          className={`fixed left-0 top-0 h-screen transition-all duration-300 z-30 flex flex-col ${sidebarOpen ? 'w-[240px]' : 'w-[72px]'} bg-white/[0.02] border-r border-white/10 backdrop-blur-2xl`}
        >
          {/* Logo */}
          <div
            className="h-16 flex items-center justify-between px-4 border-b border-white/10"
          >
            {sidebarOpen ? (
              <Logo size="sm" withText={true} />
            ) : (
              <Logo size="sm" withText={false} />
            )}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hidden lg:block p-2 rounded-xl hover:bg-white/5 transition-all text-white/50 hover:text-white"
              >
                <i className={`fas fa-${sidebarOpen ? 'angles-left' : 'angles-right'}`}></i>
              </button>
            </div>

            {/* Navigation */}
            <nav className="py-4 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {menuItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`w-full flex items-center px-4 py-3 transition-all relative ${
                    activeTab === item.id 
                      ? 'active-tab text-white before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1' 
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                  style={activeTab === item.id ? { 
                    backgroundColor: 'color-mix(in srgb, var(--tenant-primary, #d4af37) 10%, transparent)',
                    color: 'var(--tenant-primary, #d4af37)' 
                  } : {}}
                >
                  {activeTab === item.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: 'var(--tenant-primary, #d4af37)' }} />
                  )}
                  <i
                    className={`${item.icon} ${sidebarOpen ? 'w-5' : 'w-full text-center'} text-lg`}
                  />
                  {sidebarOpen && (
                    <span className="ml-3 text-sm font-medium tracking-wide">{item.label}</span>
                  )}
                </button>
              ))}
            </nav>

            {/* Special Admin Actions */}
            <div className="py-2 border-t border-white/10">
              <button
                onClick={() => router.push('/pos')}
                className="w-full flex items-center px-4 py-3 transition-all hover:bg-white/5 text-emerald-400 hover:text-emerald-300"
              >
                <i className={`fas fa-cash-register ${sidebarOpen ? 'w-5' : 'w-full text-center'}`} />
                {sidebarOpen && <span className="ml-3 text-sm font-medium tracking-wide">POS (Caja)</span>}
              </button>
              <button
                onClick={() => router.push('/admin/gastos')}
                className="w-full flex items-center px-4 py-3 transition-all hover:bg-white/5 text-amber-400 hover:text-amber-300"
              >
                <i className={`fas fa-file-invoice-dollar ${sidebarOpen ? 'w-5' : 'w-full text-center'}`} />
                {sidebarOpen && <span className="ml-3 text-sm font-medium tracking-wide">Gastos</span>}
              </button>
              <button
                onClick={() => router.push('/admin/liquidaciones')}
                className="w-full flex items-center px-4 py-3 transition-all hover:bg-white/5 text-purple-400 hover:text-purple-300"
              >
                <i className={`fas fa-money-bill-wave ${sidebarOpen ? 'w-5' : 'w-full text-center'}`} />
                {sidebarOpen && <span className="ml-3 text-sm font-medium tracking-wide">Liquidaciones</span>}
              </button>
            </div>

            {/* Bottom Logout Actions */}
            <div className="mt-auto border-t border-white/10">
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-4 py-4 transition-all hover:bg-red-500/10 text-red-400 hover:text-red-300"
              >
                <i className={`fas fa-sign-out-alt ${sidebarOpen ? 'w-5' : 'w-full text-center'}`} />
                {sidebarOpen && <span className="ml-3 text-sm font-medium tracking-wide">Cerrar Sesión</span>}
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <main
            className="transition-all duration-300 relative z-10"
            style={{
              marginLeft: sidebarOpen ? '240px' : '72px',
              minHeight: '100vh',
            }}
          >
            {/* Top Bar */}
            <header
              className="h-16 flex items-center justify-between px-6 lg:px-8 sticky top-0 z-20 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/10"
            >
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--tenant-primary, #d4af37) 10%, transparent)' }}>
                    <i className={`${menuItems.find(m => m.id === activeTab)?.icon} text-sm`} style={{ color: 'var(--tenant-primary, #d4af37)' }}></i>
                  </div>
                  {menuItems.find(m => m.id === activeTab)?.label || 'Dashboard'}
                </h1>
              </div>

              <div className="flex items-center gap-4">
                {/* User Menu */}
                <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/[0.02] border border-white/10 backdrop-blur-md hidden sm:flex">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shadow-lg" style={{ 
                    background: 'linear-gradient(to top right, var(--tenant-primary, #d4af37), var(--tenant-secondary, #a88647))',
                    boxShadow: '0 0 10px color-mix(in srgb, var(--tenant-primary, #d4af37) 30%, transparent)' 
                  }}>
                    <i className="fas fa-shield-alt text-[10px] text-dark font-black"></i>
                  </div>
                  <div className="text-right flex flex-col justify-center">
                    <p className="text-sm font-bold text-white leading-none mb-0.5">
                      {adminUser.nombre}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest leading-none" style={{ color: 'var(--tenant-primary, #d4af37)' }}>
                      {adminUser.rol}
                    </p>
                  </div>
                </div>
              </div>
          </header >

          {/* Content Area */}
          <div className="p-6 lg:p-8">
          <Suspense fallback={
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 rounded-full animate-spin" style={{ border: '2px solid var(--tenant-primary, rgba(212,175,55,0.2))', borderTopColor: 'var(--tenant-primary, #D4AF37)' }} />
            </div>
          }>
            {/* Dashboard */}
            {
              activeTab === 'dashboard' && (
                <div className="space-y-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      {
                        label: 'Total Citas',
                        value: stats.totalCitas,
                        icon: 'fa-calendar-check',
                        color: '#D4AF37'
                      },
                      {
                        label: 'Citas Hoy',
                        value: stats.citasHoy,
                        icon: 'fa-clock',
                        color: '#3B82F6'
                      },
                      {
                        label: 'Pendientes',
                        value: stats.citasPendientes,
                        icon: 'fa-hourglass-half',
                        color: '#F59E0B'
                      },
                      {
                        label: 'Barberos',
                        value: barberos.length,
                        icon: 'fa-users',
                        color: '#10B981'
                      },
                    ].map((stat, idx) => (
                      <div
                        key={idx}
                        className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl transition-all hover:bg-white/[0.04] hover:scale-[1.02] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] hover:border-white/20 group relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-white/10 transition-colors pointer-events-none" />
                        <div className="flex items-center justify-between mb-4 relative z-10">
                          <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/5"
                            style={{
                              backgroundColor: `${stat.color}15`,
                              color: stat.color,
                              boxShadow: `0 0 20px ${stat.color}20`
                            }}
                          >
                            <i className={`fas ${stat.icon} text-lg`}></i>
                          </div>
                        </div>
                        <div className="text-4xl font-black mb-1 tracking-tight text-white relative z-10">
                          {stat.value}
                        </div>
                        <div className="text-xs font-bold tracking-widest uppercase text-white/50 relative z-10">
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Calendar View - Reservas por Barbero */}
                  <div
                    className="rounded-3xl p-6 bg-white/[0.02] border border-white/10 backdrop-blur-xl"
                  >
                    <CalendarView
                      barberos={barberos}
                      onDateSelect={(date) => {
                        // Opcionalmente abrir el tab de Citas con la fecha seleccionada
                        if (process.env.NODE_ENV !== 'production') console.log('Fecha seleccionada:', date)
                      }}
                    />
                  </div>
                </div>
              )
            }

            {/* Other Tabs */}
            {activeTab === 'clientes' && <ClientesTab />}
            {activeTab === 'walkin' && <WalkInClientsPanel />}
            {activeTab === 'barberos' && <BarberosTab />}
            {activeTab === 'comisiones' && <ComisionesTab />}
            {activeTab === 'ganancias' && <GananciasTab />}
            {activeTab === 'servicios' && <ServiciosTab />}
            {activeTab === 'categorias' && <CategoriasTab />}
            {activeTab === 'inventario' && <InventarioTab />}
            {activeTab === 'horarios' && <HorariosTab />}
            {activeTab === 'citas' && <CitasTab />}
            {activeTab === 'configuracion' && <ConfiguracionTab />}
            {activeTab === 'solicitudes' && <SolicitudesTab />}

            {/* Asistencia Tab */}
            {activeTab === 'asistencia' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <GeneradorClave />
                  </div>
                  <div>
                    <AsistenciaHoyPanel />
                  </div>
                </div>

                {/* Configuración de Horarios */}
                <div>
                  <ConfiguradorHorarios />
                </div>
              </div>
            )}

            {/* Ubicaciones GPS Tab */}
            {activeTab === 'ubicaciones' && <GestionUbicaciones />}
          </Suspense>
          </div>
        </main >

        {/* Mobile Sidebar Overlay */}
        {
          sidebarOpen && (
            <div
              className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-20"
              onClick={() => setSidebarOpen(false)}
            />
          )
        }

        {/* Mobile Sidebar Toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center z-50 transition-transform hover:scale-110 active:scale-95"
          style={{
            background: 'linear-gradient(to right, var(--tenant-primary, #d4af37), var(--tenant-secondary, #a88647))',
            boxShadow: '0 0 30px color-mix(in srgb, var(--tenant-primary, #d4af37) 40%, transparent)',
            color: 'var(--tenant-bg, #0a0a0a)'
          }}
        >
          <i className={`fas fa-${sidebarOpen ? 'times' : 'bars'} text-xl`}></i>
        </button>
      </div>
    </>
  )
}

