import { useEffect, useState } from 'react'
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { chamosSupabase } from '../../lib/supabase-helpers'
import type { Database } from '../../lib/database.types'
import BarberosTab from '../components/admin/tabs/BarberosTab'

type AdminUser = Database['public']['Tables']['admin_users']['Row']

export default function AdminPage() {
  const session = useSession()
  const supabase = useSupabaseClient<Database>()
  const router = useRouter()
  
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  
  const [stats, setStats] = useState({
    totalCitas: 0,
    citasHoy: 0,
    citasPendientes: 0,
    totalBarberos: 0
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
      const [citasData, barberosData] = await Promise.all([
        chamosSupabase.getCitas(),
        chamosSupabase.getBarberos()
      ])

      const today = new Date().toISOString().split('T')[0]
      const citasHoy = citasData.filter((c: any) => c.fecha === today).length
      const citasPendientes = citasData.filter((c: any) => c.estado === 'pendiente').length
      
      setStats({
        totalCitas: citasData.length,
        citasHoy,
        citasPendientes,
        totalBarberos: barberosData.length
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
        <header className="bg-white shadow-sm border-b sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <i className="fas fa-cut text-2xl text-amber-600"></i>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">Panel de Administración</h1>
                  <p className="text-sm text-gray-500">Chamos Barber</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{adminUser.nombre}</p>
                  <p className="text-xs text-gray-500 capitalize">{adminUser.rol}</p>
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
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {[
                { id: 'dashboard', name: 'Dashboard', icon: 'fas fa-chart-pie' },
                { id: 'citas', name: 'Citas', icon: 'fas fa-calendar-alt' },
                { id: 'barberos', name: 'Barberos', icon: 'fas fa-users' },
                { id: 'servicios', name: 'Servicios', icon: 'fas fa-cut' },
                { id: 'horarios', name: 'Horarios', icon: 'fas fa-clock' },
                { id: 'configuracion', name: 'Configuración', icon: 'fas fa-cog' },
                { id: 'usuarios', name: 'Usuarios', icon: 'fas fa-user-shield' },
                { id: 'portfolio', name: 'Portfolio', icon: 'fas fa-images' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-amber-500 text-amber-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
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
                          <dd className="text-lg font-medium text-gray-900">{stats.totalBarberos}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Accesos Rápidos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setActiveTab('citas')}
                    className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <i className="fas fa-plus mr-2"></i>
                    Nueva Cita
                  </button>
                  <button
                    onClick={() => setActiveTab('barberos')}
                    className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <i className="fas fa-user-plus mr-2"></i>
                    Nuevo Barbero
                  </button>
                  <button
                    onClick={() => setActiveTab('servicios')}
                    className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <i className="fas fa-plus-circle mr-2"></i>
                    Nuevo Servicio
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Barberos Tab */}
          {activeTab === 'barberos' && <BarberosTab />}

          {/* Otras pestañas (placeholder por ahora) */}
          {['citas', 'servicios', 'horarios', 'configuracion', 'usuarios', 'portfolio'].includes(activeTab) && (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <i className="fas fa-tools text-6xl text-gray-400 mb-4"></i>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Sección en desarrollo</h3>
              <p className="text-gray-500">
                La funcionalidad de {activeTab} se está implementando.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
