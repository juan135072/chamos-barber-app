import { useEffect, useState } from 'react'
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { chamosSupabase } from '../../lib/supabase-helpers'
import type { Database } from '../../lib/database.types'
import BarberosTab from '../components/admin/tabs/BarberosTab'
import ServiciosTab from '../components/admin/tabs/ServiciosTab'
import HorariosTab from '../components/admin/tabs/HorariosTab'
import ConfiguracionTab from '../components/admin/tabs/ConfiguracionTab'
import CitasTab from '../components/admin/tabs/CitasTab'
import SolicitudesTab from '../components/admin/tabs/SolicitudesTab'
import CategoriasTab from '../components/admin/tabs/CategoriasTab'
import ClientesTab from '../components/admin/tabs/ClientesTab'

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
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
      router.push('/login')
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
      
      // IMPORTANTE: Verificar explícitamente que el rol sea 'admin'
      if (!adminData || adminData.rol !== 'admin') {
        console.error('[Admin] ❌ ACCESO DENEGADO - Rol:', adminData?.rol)
        await supabase.auth.signOut()
        router.push('/login')
        return
      }
      
      console.log('[Admin] ✅ Acceso autorizado - Usuario es admin')
      setAdminUser(adminData)
      
      // Cargar datos iniciales
      loadDashboardData()
    } catch (error) {
      console.error('[Admin] Error checking admin access:', error)
      await supabase.auth.signOut()
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const loadDashboardData = async () => {
    try {
      // Cargar barberos
      const barberosData = await chamosSupabase.getBarberos()
      setBarberos(barberosData)

      // Cargar servicios
      const serviciosData = await chamosSupabase.getServicios()
      setServicios(serviciosData)

      // Cargar citas
      const citasData = await chamosSupabase.getCitas()
      const citasArray = (citasData || []) as Cita[]
      setCitas(citasArray)

      // Calcular estadísticas
      const today = new Date().toISOString().split('T')[0]
      const citasHoy = citasArray.filter((c: Cita) => c.fecha === today).length || 0
      const citasPendientes = citasArray.filter((c: Cita) => c.estado === 'pendiente').length || 0
      
      setStats({
        totalCitas: citasArray.length || 0,
        citasHoy,
        citasPendientes,
        ingresosMes: 0 // Se puede calcular basado en citas confirmadas
      })
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 mx-auto mb-4" style={{ borderBottom: '2px solid var(--accent-color)' }}></div>
          <p style={{ color: 'var(--text-primary)', opacity: 0.8 }}>Verificando acceso de administrador...</p>
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
        <title>Panel de Administración - Chamos Barber</title>
        <meta name="description" content="Panel de administración Chamos Barber" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Header */}
        <header style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo y título */}
              <div className="flex items-center space-x-2 sm:space-x-4">
                <div className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--accent-color)' }}>
                  <i className="fas fa-cut" style={{ color: 'var(--bg-primary)' }}></i>
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Panel de Administración</h1>
                  <p className="text-sm" style={{ color: 'var(--accent-color)' }}>Chamos Barber</p>
                </div>
                <div className="sm:hidden">
                  <h1 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Admin</h1>
                </div>
              </div>

              {/* Desktop menu */}
              <div className="hidden md:flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{adminUser.nombre}</p>
                  <p className="text-xs" style={{ color: 'var(--accent-color)' }}>{adminUser.rol}</p>
                </div>
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

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden inline-flex items-center justify-center p-2 rounded-md"
                style={{ color: 'var(--text-primary)' }}
              >
                <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'} text-xl`}></i>
              </button>
            </div>

            {/* Mobile menu */}
            {mobileMenuOpen && (
              <div className="md:hidden pb-4 pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
                <div className="flex flex-col space-y-3">
                  <div className="px-3 py-2 rounded" style={{ backgroundColor: 'var(--bg-primary)' }}>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{adminUser.nombre}</p>
                    <p className="text-xs" style={{ color: 'var(--accent-color)' }}>{adminUser.rol}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md w-full"
                    style={{ 
                      backgroundColor: 'var(--accent-color)', 
                      color: 'var(--bg-primary)',
                      transition: 'var(--transition)'
                    }}
                  >
                    <i className="fas fa-sign-out-alt mr-2"></i>
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Navigation Tabs */}
          <div className="mb-6 -mx-4 sm:mx-0" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto px-4 sm:px-0 scrollbar-hide">
              {[
                { id: 'dashboard', name: 'Dashboard', icon: 'fas fa-chart-pie', shortName: 'Home' },
                { id: 'citas', name: 'Citas', icon: 'fas fa-calendar-alt', shortName: 'Citas' },
                { id: 'clientes', name: 'Clientes', icon: 'fas fa-user-friends', shortName: 'Clientes' },
                { id: 'barberos', name: 'Barberos', icon: 'fas fa-users', shortName: 'Barberos' },
                { id: 'servicios', name: 'Servicios', icon: 'fas fa-cut', shortName: 'Servicios' },
                { id: 'categorias', name: 'Categorías', icon: 'fas fa-tags', shortName: 'Categorías' },
                { id: 'solicitudes', name: 'Solicitudes', icon: 'fas fa-user-plus', shortName: 'Solicitudes' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-1 sm:space-x-2 flex-shrink-0"
                  style={{
                    borderColor: activeTab === tab.id ? 'var(--accent-color)' : 'transparent',
                    color: activeTab === tab.id ? 'var(--accent-color)' : 'var(--text-primary)',
                    opacity: activeTab === tab.id ? 1 : 0.7,
                    transition: 'var(--transition)'
                  }}
                >
                  <i className={tab.icon}></i>
                  <span className="hidden sm:inline">{tab.name}</span>
                  <span className="sm:hidden">{tab.shortName}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Dashboard Content */}
          {activeTab === 'dashboard' && (
            <div>
              <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--accent-color)' }}>Dashboard</h2>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-8">
                <div className="overflow-hidden rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
                  <div className="p-3 sm:p-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center">
                      <div className="flex-shrink-0 mb-2 sm:mb-0">
                        <i className="fas fa-calendar-check text-xl sm:text-2xl" style={{ color: 'var(--accent-color)' }}></i>
                      </div>
                      <div className="sm:ml-5 w-full sm:w-0 sm:flex-1">
                        <dl>
                          <dt className="text-xs sm:text-sm font-medium truncate" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Total Citas</dt>
                          <dd className="text-base sm:text-lg font-medium" style={{ color: 'var(--text-primary)' }}>{stats.totalCitas}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
                  <div className="p-3 sm:p-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center">
                      <div className="flex-shrink-0 mb-2 sm:mb-0">
                        <i className="fas fa-clock text-xl sm:text-2xl text-blue-400"></i>
                      </div>
                      <div className="sm:ml-5 w-full sm:w-0 sm:flex-1">
                        <dl>
                          <dt className="text-xs sm:text-sm font-medium truncate" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Citas Hoy</dt>
                          <dd className="text-base sm:text-lg font-medium" style={{ color: 'var(--text-primary)' }}>{stats.citasHoy}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
                  <div className="p-3 sm:p-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center">
                      <div className="flex-shrink-0 mb-2 sm:mb-0">
                        <i className="fas fa-hourglass-half text-xl sm:text-2xl text-yellow-400"></i>
                      </div>
                      <div className="sm:ml-5 w-full sm:w-0 sm:flex-1">
                        <dl>
                          <dt className="text-xs sm:text-sm font-medium truncate" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Pendientes</dt>
                          <dd className="text-base sm:text-lg font-medium" style={{ color: 'var(--text-primary)' }}>{stats.citasPendientes}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow)' }}>
                  <div className="p-3 sm:p-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center">
                      <div className="flex-shrink-0 mb-2 sm:mb-0">
                        <i className="fas fa-users text-xl sm:text-2xl text-green-400"></i>
                      </div>
                      <div className="sm:ml-5 w-full sm:w-0 sm:flex-1">
                        <dl>
                          <dt className="text-xs sm:text-sm font-medium truncate" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Barberos</dt>
                          <dd className="text-base sm:text-lg font-medium" style={{ color: 'var(--text-primary)' }}>{barberos.length}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Citas */}
              <div className="shadow rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                <div className="px-3 sm:px-4 py-4 sm:py-5">
                  <h3 className="text-base sm:text-lg leading-6 font-medium mb-3 sm:mb-4" style={{ color: 'var(--accent-color)' }}>
                    Citas Recientes
                  </h3>
                  
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full" style={{ borderTop: '1px solid var(--border-color)' }}>
                      <thead style={{ backgroundColor: 'var(--bg-primary)' }}>
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Cliente</th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Barbero</th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Servicio</th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Fecha</th>
                          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {citas.slice(0, 5).map((cita, index) => (
                          <tr key={cita.id} style={{ borderTop: index > 0 ? '1px solid var(--border-color)' : 'none' }}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                              {cita.cliente_nombre}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
                              {cita.barberos ? `${cita.barberos.nombre} ${cita.barberos.apellido}` : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
                              {cita.servicios?.nombre || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
                              {new Date(cita.fecha + 'T' + cita.hora).toLocaleDateString('es-ES')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                cita.estado === 'confirmada' ? 'bg-green-100 text-green-800' :
                                cita.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                                cita.estado === 'cancelada' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {cita.estado}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden space-y-3">
                    {citas.slice(0, 5).map((cita) => (
                      <div key={cita.id} className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{cita.cliente_nombre}</p>
                            <p className="text-xs" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                              {cita.barberos ? `${cita.barberos.nombre} ${cita.barberos.apellido}` : 'N/A'}
                            </p>
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            cita.estado === 'confirmada' ? 'bg-green-100 text-green-800' :
                            cita.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                            cita.estado === 'cancelada' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {cita.estado}
                          </span>
                        </div>
                        <div className="text-xs space-y-1" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                          <p><i className="fas fa-cut mr-1" style={{ color: 'var(--accent-color)' }}></i> {cita.servicios?.nombre || 'N/A'}</p>
                          <p><i className="fas fa-calendar mr-1" style={{ color: 'var(--accent-color)' }}></i> {new Date(cita.fecha + 'T' + cita.hora).toLocaleDateString('es-ES')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Clientes Tab */}
          {activeTab === 'clientes' && <ClientesTab />}

          {/* Barberos Tab */}
          {activeTab === 'barberos' && <BarberosTab />}

          {/* Servicios Tab */}
          {activeTab === 'servicios' && <ServiciosTab />}

          {/* Categorías Tab */}
          {activeTab === 'categorias' && <CategoriasTab />}

          {/* Horarios Tab */}
          {activeTab === 'horarios' && <HorariosTab />}

          {/* Configuración Tab */}
          {activeTab === 'configuracion' && <ConfiguracionTab />}

          {/* Citas Tab */}
          {activeTab === 'citas' && <CitasTab />}

          {/* Solicitudes Tab */}
          {activeTab === 'solicitudes' && <SolicitudesTab />}

          {/* Usuarios Tab (placeholder) */}
          {activeTab === 'usuarios' && (
            <div className="text-center py-12 rounded-lg shadow" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <i className="fas fa-user-shield text-6xl mb-4" style={{ color: 'var(--accent-color)', opacity: 0.5 }}></i>
              <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Gestión de Usuarios</h3>
              <p style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Creación de cuentas de barberos en desarrollo.</p>
            </div>
          )}

          {/* Portfolio Tab (placeholder) */}
          {activeTab === 'portfolio' && (
            <div className="text-center py-12 rounded-lg shadow" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <i className="fas fa-images text-6xl mb-4" style={{ color: 'var(--accent-color)', opacity: 0.5 }}></i>
              <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Gestión de Portfolio</h3>
              <p style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Upload de trabajos en desarrollo.</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}