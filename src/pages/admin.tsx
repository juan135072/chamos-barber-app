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
      const adminData = await chamosSupabase.getAdminUser(session.user.email)
      setAdminUser(adminData)
      
      // Cargar datos iniciales
      loadDashboardData()
    } catch (error) {
      console.error('Error checking admin access:', error)
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
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando acceso de administrador...</p>
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

      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <img
                  src="/images/logo.png"
                  alt="Chamos Barber"
                  className="h-8 w-8 rounded-full"
                />
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">Panel de Administración</h1>
                  <p className="text-sm text-gray-500">Chamos Barber</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{adminUser.nombre}</p>
                  <p className="text-xs text-gray-500">{adminUser.rol}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                >
                  <i className="fas fa-sign-out-alt mr-2"></i>
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Navigation Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'dashboard', name: 'Dashboard', icon: 'fas fa-chart-pie' },
                { id: 'citas', name: 'Citas', icon: 'fas fa-calendar-alt' },
                { id: 'barberos', name: 'Barberos', icon: 'fas fa-users' },
                { id: 'servicios', name: 'Servicios', icon: 'fas fa-cut' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-amber-500 text-amber-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                >
                  <i className={tab.icon}></i>
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Dashboard Content */}
          {activeTab === 'dashboard' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <i className="fas fa-calendar-check text-2xl text-amber-600"></i>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Total Citas</dt>
                          <dd className="text-lg font-medium text-gray-900">{stats.totalCitas}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <i className="fas fa-clock text-2xl text-blue-600"></i>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Citas Hoy</dt>
                          <dd className="text-lg font-medium text-gray-900">{stats.citasHoy}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <i className="fas fa-hourglass-half text-2xl text-yellow-600"></i>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Pendientes</dt>
                          <dd className="text-lg font-medium text-gray-900">{stats.citasPendientes}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <i className="fas fa-users text-2xl text-green-600"></i>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Barberos</dt>
                          <dd className="text-lg font-medium text-gray-900">{barberos.length}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Citas */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Citas Recientes
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barbero</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Servicio</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {citas.slice(0, 5).map((cita) => (
                          <tr key={cita.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {cita.cliente_nombre}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {cita.barberos ? `${cita.barberos.nombre} ${cita.barberos.apellido}` : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {cita.servicios?.nombre || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
                </div>
              </div>
            </div>
          )}

          {/* Barberos Tab */}
          {activeTab === 'barberos' && <BarberosTab />}

          {/* Servicios Tab */}
          {activeTab === 'servicios' && <ServiciosTab />}

          {/* Horarios Tab */}
          {activeTab === 'horarios' && <HorariosTab />}

          {/* Configuración Tab */}
          {activeTab === 'configuracion' && <ConfiguracionTab />}

          {/* Citas Tab (placeholder) */}
          {activeTab === 'citas' && (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <i className="fas fa-calendar-alt text-6xl text-gray-400 mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Gestión de Citas</h3>
              <p className="text-gray-500">Vista de citas en desarrollo. Por ahora usa /consultar</p>
            </div>
          )}

          {/* Usuarios Tab (placeholder) */}
          {activeTab === 'usuarios' && (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <i className="fas fa-user-shield text-6xl text-gray-400 mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Gestión de Usuarios</h3>
              <p className="text-gray-500">Creación de cuentas de barberos en desarrollo.</p>
            </div>
          )}

          {/* Portfolio Tab (placeholder) */}
          {activeTab === 'portfolio' && (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <i className="fas fa-images text-6xl text-gray-400 mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Gestión de Portfolio</h3>
              <p className="text-gray-500">Upload de trabajos en desarrollo.</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}