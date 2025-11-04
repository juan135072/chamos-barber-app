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

      <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Header */}
        <header className="navbar" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <div className="nav-container">
            <div className="nav-brand">
              <i className="fas fa-cut"></i>
              <div>
                <span style={{ display: 'block', fontSize: '1.25rem', fontWeight: '700' }}>Panel de Administración</span>
                <span style={{ display: 'block', fontSize: '0.75rem', opacity: '0.8' }}>Chamos Barber</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)' }}>{adminUser.nombre}</p>
                <p style={{ fontSize: '0.75rem', opacity: '0.7', color: 'var(--accent-color)' }}>{adminUser.rol}</p>
              </div>
              <button
                onClick={handleLogout}
                className="btn btn-primary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
              >
                <i className="fas fa-sign-out-alt"></i>
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </header>

        <div className="container" style={{ paddingTop: '100px', paddingBottom: '3rem' }}>
          {/* Navigation Tabs */}
          <div style={{ borderBottom: '1px solid var(--border-color)', marginBottom: '2rem' }}>
            <nav style={{ display: 'flex', gap: '2rem', marginBottom: '-1px', overflowX: 'auto' }}>
              {[
                { id: 'dashboard', name: 'Dashboard', icon: 'fas fa-chart-pie' },
                { id: 'citas', name: 'Citas', icon: 'fas fa-calendar-alt' },
                { id: 'barberos', name: 'Barberos', icon: 'fas fa-users' },
                { id: 'servicios', name: 'Servicios', icon: 'fas fa-cut' },
                { id: 'solicitudes', name: 'Solicitudes', icon: 'fas fa-user-plus' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '1rem 0.25rem',
                    borderBottom: activeTab === tab.id ? '2px solid var(--accent-color)' : '2px solid transparent',
                    color: activeTab === tab.id ? 'var(--accent-color)' : 'var(--text-primary)',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    background: 'none',
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                    opacity: activeTab === tab.id ? '1' : '0.7',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = activeTab === tab.id ? '1' : '0.7'}
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
              <h2 className="section-title" style={{ textAlign: 'left', marginBottom: '2rem' }}>Dashboard</h2>
              
              {/* Stats Grid */}
              <div className="services-grid" style={{ marginBottom: '3rem' }}>
                <div className="service-card">
                  <div className="service-icon">
                    <i className="fas fa-calendar-check"></i>
                  </div>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', opacity: '0.8' }}>Total Citas</h3>
                  <p style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--accent-color)' }}>{stats.totalCitas}</p>
                </div>

                <div className="service-card">
                  <div className="service-icon" style={{ color: '#3b82f6' }}>
                    <i className="fas fa-clock"></i>
                  </div>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', opacity: '0.8' }}>Citas Hoy</h3>
                  <p style={{ fontSize: '2rem', fontWeight: '700', color: '#3b82f6' }}>{stats.citasHoy}</p>
                </div>

                <div className="service-card">
                  <div className="service-icon" style={{ color: '#eab308' }}>
                    <i className="fas fa-hourglass-half"></i>
                  </div>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', opacity: '0.8' }}>Pendientes</h3>
                  <p style={{ fontSize: '2rem', fontWeight: '700', color: '#eab308' }}>{stats.citasPendientes}</p>
                </div>

                <div className="service-card">
                  <div className="service-icon" style={{ color: '#10b981' }}>
                    <i className="fas fa-users"></i>
                  </div>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', opacity: '0.8' }}>Barberos</h3>
                  <p style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981' }}>{barberos.length}</p>
                </div>
              </div>

              {/* Recent Citas */}
              <div className="booking-form">
                <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--accent-color)', marginBottom: '1.5rem' }}>
                  Citas Recientes
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                        <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: 'var(--accent-color)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cliente</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: 'var(--accent-color)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Barbero</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: 'var(--accent-color)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Servicio</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: 'var(--accent-color)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fecha</th>
                        <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: 'var(--accent-color)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {citas.slice(0, 5).map((cita) => (
                        <tr key={cita.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '600' }}>
                            {cita.cliente_nombre}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem', opacity: '0.8' }}>
                            {cita.barberos ? `${cita.barberos.nombre} ${cita.barberos.apellido}` : 'N/A'}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem', opacity: '0.8' }}>
                            {cita.servicios?.nombre || 'N/A'}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem', opacity: '0.8' }}>
                            {new Date(cita.fecha + 'T' + cita.hora).toLocaleDateString('es-ES')}
                          </td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{
                              display: 'inline-flex',
                              padding: '0.25rem 0.75rem',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              borderRadius: '9999px',
                              backgroundColor: cita.estado === 'confirmada' ? 'rgba(16, 185, 129, 0.1)' :
                                              cita.estado === 'pendiente' ? 'rgba(234, 179, 8, 0.1)' :
                                              cita.estado === 'cancelada' ? 'rgba(239, 68, 68, 0.1)' :
                                              'rgba(156, 163, 175, 0.1)',
                              color: cita.estado === 'confirmada' ? '#10b981' :
                                     cita.estado === 'pendiente' ? '#eab308' :
                                     cita.estado === 'cancelada' ? '#ef4444' :
                                     '#9ca3af',
                              border: `1px solid ${cita.estado === 'confirmada' ? 'rgba(16, 185, 129, 0.3)' :
                                                   cita.estado === 'pendiente' ? 'rgba(234, 179, 8, 0.3)' :
                                                   cita.estado === 'cancelada' ? 'rgba(239, 68, 68, 0.3)' :
                                                   'rgba(156, 163, 175, 0.3)'}`
                            }}>
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
          )}

          {/* Barberos Tab */}
          {activeTab === 'barberos' && <BarberosTab />}

          {/* Servicios Tab */}
          {activeTab === 'servicios' && <ServiciosTab />}

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
            <div className="booking-form" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                backgroundColor: 'rgba(212, 175, 55, 0.1)', 
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                border: '2px solid var(--accent-color)'
              }}>
                <i className="fas fa-user-shield" style={{ fontSize: '2.5rem', color: 'var(--accent-color)' }}></i>
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--accent-color)', marginBottom: '0.5rem' }}>Gestión de Usuarios</h3>
              <p style={{ opacity: '0.8' }}>Creación de cuentas de barberos en desarrollo.</p>
            </div>
          )}

          {/* Portfolio Tab (placeholder) */}
          {activeTab === 'portfolio' && (
            <div className="booking-form" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                backgroundColor: 'rgba(212, 175, 55, 0.1)', 
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
                border: '2px solid var(--accent-color)'
              }}>
                <i className="fas fa-images" style={{ fontSize: '2.5rem', color: 'var(--accent-color)' }}></i>
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--accent-color)', marginBottom: '0.5rem' }}>Gestión de Portfolio</h3>
              <p style={{ opacity: '0.8' }}>Upload de trabajos en desarrollo.</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}iv>
    </>
  )
}