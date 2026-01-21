import { useEffect, useState } from 'react'
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { chamosSupabase } from '../../lib/supabase-helpers'
import type { Database } from '../../lib/database.types'
import Logo from '../components/shared/Logo'
import BarberosTab from '../components/admin/tabs/BarberosTab'
import ServiciosTab from '../components/admin/tabs/ServiciosTab'
import HorariosTab from '../components/admin/tabs/HorariosTab'
import ConfiguracionTab from '../components/admin/tabs/ConfiguracionTab'
import CitasTab from '../components/admin/tabs/CitasTab'
import SolicitudesTab from '../components/admin/tabs/SolicitudesTab'
import CategoriasTab from '../components/admin/tabs/CategoriasTab'
import ClientesTab from '../components/admin/tabs/ClientesTab'
import ComisionesTab from '../components/admin/tabs/ComisionesTab'
import GananciasTab from '../components/admin/tabs/GananciasTab'
import CalendarView from '../components/admin/dashboard/CalendarView'
import WalkInClientsPanel from '../components/walkin/WalkInClientsPanel'
import { useOneSignal } from '../components/providers/OneSignalProvider'

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

  const { triggerPrompt, setExternalId } = useOneSignal()

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
      console.log('[Admin] Verificando acceso para email:', session.user.email)
      const adminData = await chamosSupabase.getAdminUser(session.user.email)
      console.log('[Admin] Datos obtenidos:', { email: adminData?.email, rol: adminData?.rol, activo: adminData?.activo })

      if (!adminData || adminData.rol !== 'admin') {
        console.error('[Admin] ❌ ACCESO DENEGADO - Rol:', adminData?.rol)
        await supabase.auth.signOut()
        router.push('/chamos-acceso')
        return
      }

      console.log('[Admin] ✅ ACCESO CONCEDIDO')
      setAdminUser(adminData)
      setLoading(false)

      // 🔔 OneSignal: Vincular ID y mostrar prompt
      setExternalId(adminData.id)
      setTimeout(() => {
        triggerPrompt()
      }, 3000)

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
      const barberosData = await chamosSupabase.getBarberos()
      setBarberos(barberosData)

      const serviciosData = await chamosSupabase.getServicios()
      setServicios(serviciosData)

      const citasData = await chamosSupabase.getCitas()
      const citasArray = (citasData || []) as Cita[]
      setCitas(citasArray)

      const today = new Date().toISOString().split('T')[0]
      const citasHoy = citasArray.filter((c: Cita) => c.fecha === today).length || 0
      const citasPendientes = citasArray.filter((c: Cita) => c.estado === 'pendiente').length || 0

      setStats({
        totalCitas: citasArray.length || 0,
        citasHoy,
        citasPendientes,
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
    { id: 'clientes', icon: 'fas fa-users', label: 'Clientes' },
    { id: 'walkin', icon: 'fas fa-walking', label: 'Walk-In' },
    { id: 'barberos', icon: 'fas fa-user-tie', label: 'Barberos' },
    { id: 'horarios', icon: 'fas fa-clock', label: 'Horarios' },
    { id: 'servicios', icon: 'fas fa-scissors', label: 'Servicios' },
    { id: 'categorias', icon: 'fas fa-tags', label: 'Categorías' },
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
              border: '2px solid rgba(212, 175, 55, 0.2)',
              borderTopColor: '#D4AF37'
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
        <title>Admin - Chamos Barber</title>
        <meta name="description" content="Panel de administración Chamos Barber" />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen" style={{ backgroundColor: '#0A0A0A' }}>
        {/* Sidebar */}
        <aside
          className={`fixed left-0 top-0 h-screen transition-all duration-300 z-30 ${sidebarOpen ? 'sidebar-open' : ''
            }`}
          style={{
            width: sidebarOpen ? '240px' : '72px',
            backgroundColor: '#111',
            borderRight: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Logo */}
          <div
            className="h-16 flex items-center justify-between px-4"
            style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}
          >
            {sidebarOpen ? (
              <Logo size="sm" withText={true} />
            ) : (
              <Logo size="sm" withText={false} />
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:block p-2 rounded hover:bg-white hover:bg-opacity-5 transition-all"
              style={{ color: '#666' }}
            >
              <i className={`fas fa-${sidebarOpen ? 'angles-left' : 'angles-right'}`}></i>
            </button>
          </div>

          {/* Navigation */}
          <nav className="py-4 overflow-y-auto flex-1">
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className="w-full flex items-center px-4 py-3 transition-all group"
                style={{
                  backgroundColor: activeTab === item.id ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                  borderLeft: activeTab === item.id ? '3px solid #D4AF37' : '3px solid transparent',
                  color: activeTab === item.id ? '#D4AF37' : '#666'
                }}
              >
                <i
                  className={`${item.icon} ${sidebarOpen ? 'w-5' : 'w-full text-center'}`}
                  style={{ fontSize: '18px' }}
                />
                {sidebarOpen && (
                  <span className="ml-3 text-sm font-medium">{item.label}</span>
                )}
              </button>
            ))}
          </nav>
          {/* Bottom Logout Actions */}
          <div
            className="mt-auto"
            style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}
          >
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-3 transition-all hover:bg-red-500 hover:bg-opacity-10"
              style={{ color: '#EF4444' }}
            >
              <i className={`fas fa-sign-out-alt ${sidebarOpen ? 'w-5' : 'w-full text-center'}`} />
              {sidebarOpen && <span className="ml-3 text-sm font-medium">Cerrar Sesión</span>}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main
          className="transition-all duration-300"
          style={{
            marginLeft: sidebarOpen ? '240px' : '72px',
            minHeight: '100vh',
            position: 'relative'
          }}
        >
          {/* Top Bar */}
          <header
            className="h-16 flex items-center justify-between px-6 lg:px-8 sticky top-0 z-20"
            style={{
              backgroundColor: '#0A0A0A',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
            }}
          >
            <div>
              <h1
                className="text-lg font-semibold"
                style={{ color: '#FFF', letterSpacing: '-0.02em' }}
              >
                {menuItems.find(m => m.id === activeTab)?.label || 'Dashboard'}
              </h1>
            </div>

            <div className="flex items-center gap-4">
              {/* User Menu */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium" style={{ color: '#FFF' }}>
                    {adminUser.nombre}
                  </p>
                  <p className="text-xs" style={{ color: '#666' }}>
                    {adminUser.rol}
                  </p>
                </div>
              </div>
            </div>
          </header >

          {/* Content Area */}
          < div className="p-6 lg:p-8" >
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
                        className="p-6 rounded-xl transition-all hover:scale-105"
                        style={{
                          backgroundColor: '#111',
                          border: '1px solid rgba(255, 255, 255, 0.05)'
                        }}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{
                              backgroundColor: `${stat.color}20`,
                              color: stat.color
                            }}
                          >
                            <i className={`fas ${stat.icon}`}></i>
                          </div>
                        </div>
                        <div className="text-3xl font-bold mb-1" style={{ color: '#FFF' }}>
                          {stat.value}
                        </div>
                        <div className="text-sm" style={{ color: '#666' }}>
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Calendar View - Reservas por Barbero */}
                  <div
                    className="rounded-xl p-6"
                    style={{
                      backgroundColor: '#111',
                      border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}
                  >
                    <CalendarView
                      barberos={barberos}
                      onDateSelect={(date) => {
                        // Opcionalmente abrir el tab de Citas con la fecha seleccionada
                        console.log('Fecha seleccionada:', date)
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
            {activeTab === 'horarios' && <HorariosTab />}
            {activeTab === 'citas' && <CitasTab />}
            {activeTab === 'configuracion' && <ConfiguracionTab />}
            {activeTab === 'solicitudes' && <SolicitudesTab />}
          </div >
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
          className="lg:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center z-50 shadow-lg"
          style={{ backgroundColor: '#D4AF37', color: '#000' }}
        >
          <i className={`fas fa-${sidebarOpen ? 'times' : 'bars'}`}></i>
        </button>
      </div >
    </>
  )
}

