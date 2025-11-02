import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react'
import Layout from '../components/Layout'
import toast, { Toaster } from 'react-hot-toast'

interface BarberoProfile {
  id: string
  nombre: string
  apellido: string
  email: string
  telefono: string
  instagram: string
  descripcion: string
  especialidad: string
  experiencia_anos: number
  imagen_url: string
}

interface PortfolioItem {
  id: string
  imagen_url: string
  titulo: string
  descripcion: string
  categoria: string
  aprobado: boolean
  activo: boolean
}

const BarberoPanelPage: React.FC = () => {
  const session = useSession()
  const supabase = useSupabaseClient()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<BarberoProfile | null>(null)
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([])
  const [activeTab, setActiveTab] = useState<'perfil' | 'portfolio'>('perfil')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!session) {
      router.push('/login')
      return
    }
    loadBarberoData()
  }, [session])

  const loadBarberoData = async () => {
    try {
      setLoading(true)
      
      // Obtener perfil del barbero
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('barbero_id, rol')
        .eq('id', session?.user?.id)
        .single()

      if (adminError || !adminUser || adminUser.rol !== 'barbero') {
        toast.error('No tienes permisos para acceder a este panel')
        router.push('/login')
        return
      }

      // Cargar datos del barbero
      const { data: barbero, error: barberoError } = await supabase
        .from('barberos')
        .select('*')
        .eq('id', adminUser.barbero_id)
        .single()

      if (barberoError) throw barberoError

      setProfile(barbero)

      // Cargar portfolio
      const { data: portfolioData, error: portfolioError } = await supabase
        .from('barbero_portfolio')
        .select('*')
        .eq('barbero_id', adminUser.barbero_id)
        .order('orden_display', { ascending: true })

      if (!portfolioError && portfolioData) {
        setPortfolio(portfolioData)
      }

    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error al cargar tus datos')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    try {
      setSaving(true)
      
      const { error } = await supabase
        .from('barberos')
        .update({
          telefono: profile.telefono,
          instagram: profile.instagram,
          descripcion: profile.descripcion,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)

      if (error) throw error

      toast.success('Perfil actualizado exitosamente')
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Error al actualizar el perfil')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <Layout title="Cargando...">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '60vh' 
        }}>
          <div className="spinner"></div>
        </div>
      </Layout>
    )
  }

  if (!profile) {
    return (
      <Layout title="Error">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '60vh',
          flexDirection: 'column',
          gap: '2rem'
        }}>
          <h2>No se pudo cargar tu perfil</h2>
          <button onClick={() => router.push('/login')} className="btn btn-primary">
            Volver al Login
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={`Panel de ${profile.nombre} - Chamos Barber`}>
      <Toaster position="top-right" />
      
      <div className="container" style={{ paddingTop: '6rem', paddingBottom: '4rem' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <h1 style={{ marginBottom: '0.5rem' }}>
              Mi Panel - {profile.nombre} {profile.apellido}
            </h1>
            <p style={{ opacity: 0.7 }}>
              Gestiona tu perfil y portfolio
            </p>
          </div>
          <button 
            onClick={handleLogout}
            className="btn btn-secondary"
            style={{ padding: '10px 20px' }}
          >
            <i className="fas fa-sign-out-alt"></i> Cerrar Sesión
          </button>
        </div>

        {/* Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '2rem',
          borderBottom: '2px solid var(--border-color)'
        }}>
          <button
            onClick={() => setActiveTab('perfil')}
            style={{
              padding: '1rem 2rem',
              background: 'none',
              border: 'none',
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
            onClick={() => setActiveTab('portfolio')}
            style={{
              padding: '1rem 2rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'portfolio' ? '3px solid var(--accent-color)' : 'none',
              color: activeTab === 'portfolio' ? 'var(--accent-color)' : 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '1rem',
              transition: 'all 0.3s'
            }}
          >
            <i className="fas fa-images"></i> Mi Portfolio ({portfolio.length})
          </button>
        </div>

        {/* Content */}
        {activeTab === 'perfil' && (
          <div style={{ 
            maxWidth: '800px', 
            margin: '0 auto',
            background: 'var(--bg-secondary)',
            padding: '2rem',
            borderRadius: 'var(--border-radius)',
            border: '1px solid var(--border-color)'
          }}>
            <h2 style={{ marginBottom: '2rem', color: 'var(--accent-color)' }}>
              <i className="fas fa-edit"></i> Actualizar Información
            </h2>
            
            <form onSubmit={handleUpdateProfile}>
              {/* Información no editable */}
              <div style={{ 
                marginBottom: '2rem',
                padding: '1rem',
                background: 'rgba(212, 175, 55, 0.1)',
                borderRadius: 'var(--border-radius)',
                border: '1px solid rgba(212, 175, 55, 0.3)'
              }}>
                <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  <strong>Nombre:</strong> {profile.nombre} {profile.apellido}
                </p>
                <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                  <strong>Email:</strong> {profile.email}
                </p>
                <p style={{ fontSize: '0.9rem', marginBottom: '0' }}>
                  <strong>Especialidad:</strong> {profile.especialidad}
                </p>
                <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', opacity: 0.7 }}>
                  <i className="fas fa-info-circle"></i> Contacta al administrador para cambiar estos datos
                </p>
              </div>

              {/* Campos editables */}
              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-phone"></i> Teléfono / WhatsApp
                </label>
                <input
                  type="tel"
                  className="form-input"
                  value={profile.telefono || ''}
                  onChange={(e) => setProfile({ ...profile, telefono: e.target.value })}
                  placeholder="+56 9 1234 5678"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <i className="fab fa-instagram"></i> Instagram
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={profile.instagram || ''}
                  onChange={(e) => setProfile({ ...profile, instagram: e.target.value })}
                  placeholder="@tu_instagram"
                />
                <small style={{ opacity: 0.7, fontSize: '0.85rem' }}>
                  Usa @ o la URL completa de tu perfil
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-align-left"></i> Descripción / Biografía
                </label>
                <textarea
                  className="form-input"
                  value={profile.descripcion || ''}
                  onChange={(e) => setProfile({ ...profile, descripcion: e.target.value })}
                  rows={5}
                  placeholder="Cuéntale a tus clientes sobre ti, tu experiencia y estilo..."
                  style={{ resize: 'vertical' }}
                />
                <small style={{ opacity: 0.7, fontSize: '0.85rem' }}>
                  {profile.descripcion?.length || 0} caracteres
                </small>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
                style={{ width: '100%', marginTop: '1rem' }}
              >
                {saving ? (
                  <>
                    <div className="spinner"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save"></i>
                    Guardar Cambios
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'portfolio' && (
          <div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '2rem',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <h2 style={{ color: 'var(--accent-color)', margin: 0 }}>
                <i className="fas fa-images"></i> Mi Portfolio
              </h2>
              <button
                className="btn btn-primary"
                onClick={() => toast('Función de subida en desarrollo', { icon: '🚧' })}
                style={{ padding: '10px 20px' }}
              >
                <i className="fas fa-plus"></i> Subir Nuevo Trabajo
              </button>
            </div>

            {portfolio.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '4rem 2rem',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--border-radius)',
                border: '1px solid var(--border-color)'
              }}>
                <i className="fas fa-images" style={{ 
                  fontSize: '4rem', 
                  color: 'var(--accent-color)', 
                  marginBottom: '1rem',
                  opacity: 0.5
                }}></i>
                <h3>No tienes trabajos en tu portfolio</h3>
                <p style={{ opacity: 0.7, marginBottom: '2rem' }}>
                  Comienza a subir fotos de tus mejores trabajos
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => toast('Función de subida en desarrollo', { icon: '🚧' })}
                >
                  <i className="fas fa-plus"></i> Subir Primer Trabajo
                </button>
              </div>
            ) : (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '1.5rem'
              }}>
                {portfolio.map((item) => (
                  <div 
                    key={item.id}
                    style={{
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--border-radius)',
                      overflow: 'hidden',
                      border: '1px solid var(--border-color)',
                      transition: 'transform 0.3s'
                    }}
                  >
                    <div style={{ 
                      width: '100%', 
                      height: '250px',
                      backgroundImage: `url(${item.imagen_url})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      position: 'relative'
                    }}>
                      {!item.aprobado && (
                        <div style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          background: 'rgba(255, 165, 0, 0.9)',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          fontWeight: '600'
                        }}>
                          <i className="fas fa-clock"></i> Pendiente
                        </div>
                      )}
                      {item.aprobado && (
                        <div style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          background: 'rgba(76, 175, 80, 0.9)',
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          fontWeight: '600'
                        }}>
                          <i className="fas fa-check"></i> Aprobado
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '1rem' }}>
                      <h4 style={{ marginBottom: '0.5rem' }}>{item.titulo || 'Sin título'}</h4>
                      <p style={{ 
                        fontSize: '0.9rem', 
                        opacity: 0.7,
                        marginBottom: '0.5rem'
                      }}>
                        {item.descripcion || 'Sin descripción'}
                      </p>
                      <div style={{ 
                        display: 'flex', 
                        gap: '0.5rem',
                        marginTop: '1rem'
                      }}>
                        <button 
                          className="btn btn-secondary"
                          style={{ flex: 1, padding: '8px', fontSize: '0.9rem' }}
                          onClick={() => toast('Función de edición en desarrollo', { icon: '🚧' })}
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button 
                          className="btn btn-secondary"
                          style={{ flex: 1, padding: '8px', fontSize: '0.9rem' }}
                          onClick={() => toast('Función de eliminación en desarrollo', { icon: '🚧' })}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {portfolio.length > 0 && (
              <div style={{ 
                marginTop: '2rem',
                padding: '1.5rem',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--border-radius)',
                border: '1px solid var(--border-color)'
              }}>
                <h4 style={{ color: 'var(--accent-color)', marginBottom: '1rem' }}>
                  <i className="fas fa-info-circle"></i> Información
                </h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  <li style={{ marginBottom: '0.5rem' }}>
                    <i className="fas fa-check" style={{ color: 'var(--accent-color)' }}></i> Total de trabajos: <strong>{portfolio.length}</strong>
                  </li>
                  <li style={{ marginBottom: '0.5rem' }}>
                    <i className="fas fa-check-circle" style={{ color: '#4CAF50' }}></i> Aprobados: <strong>{portfolio.filter(p => p.aprobado).length}</strong>
                  </li>
                  <li style={{ marginBottom: '0.5rem' }}>
                    <i className="fas fa-clock" style={{ color: '#FFA500' }}></i> Pendientes: <strong>{portfolio.filter(p => !p.aprobado).length}</strong>
                  </li>
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}

export default BarberoPanelPage
