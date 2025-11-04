import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Head from 'next/head'
import Layout from '../../components/Layout'

// =====================================================
// INTERFACES
// =====================================================

interface Barbero {
  id: string
  slug?: string
  nombre: string
  apellido?: string
  nombre_completo?: string
  biografia: string
  foto_url: string
  especialidad: string
  especialidades?: string[]
  experiencia_anos: number
  telefono?: string
  whatsapp?: string
  instagram?: string
  facebook?: string
  twitter?: string
  tiktok?: string
  email?: string
  promedio_calificacion?: number
  total_resenas?: number
  total_clientes?: number
  total_cortes?: number
  certificaciones?: any[]
  idiomas?: string[]
  horario_preferido?: string
  disponible_fines_semana?: boolean
}

interface Resena {
  id: string
  cliente_nombre: string
  calificacion: number
  comentario: string
  servicio_recibido?: string
  foto_antes_url?: string
  foto_despues_url?: string
  fecha_cita?: string
  created_at: string
  destacada?: boolean
}

interface PortfolioItem {
  id: string
  imagen_url: string
  descripcion: string
  categoria?: string
  likes?: number
  destacada?: boolean
  fecha_creacion: string
}

interface Certificacion {
  id: string
  nombre: string
  institucion: string
  fecha_obtencion: string
  numero_certificado?: string
}

interface EstadisticaMensual {
  mes: number
  anio: number
  total_citas: number
  total_ingresos: number
  promedio_calificacion: number
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

const BarberoProfilePage: React.FC = () => {
  const router = useRouter()
  const { id } = router.query
  
  const [barbero, setBarbero] = useState<Barbero | null>(null)
  const [resenas, setResenas] = useState<Resena[]>([])
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([])
  const [certificaciones, setCertificaciones] = useState<Certificacion[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'portfolio' | 'resenas' | 'certificaciones'>('portfolio')

  useEffect(() => {
    if (id) {
      loadBarberoData()
    }
  }, [id])

  const loadBarberoData = async () => {
    try {
      // Cargar datos del barbero
      const barberoResponse = await fetch(`/api/barberos/${id}`)
      if (barberoResponse.ok) {
        const barberoData = await barberoResponse.json()
        setBarbero(barberoData)
      }

      // Cargar reseñas aprobadas
      const resenasResponse = await fetch(`/api/barbero-resenas?barbero_id=${id}&aprobado=true&limit=10`)
      if (resenasResponse.ok) {
        const resenasData = await resenasResponse.json()
        setResenas(resenasData.data || [])
      }

      // Cargar portfolio del barbero
      const portfolioResponse = await fetch(`/api/barbero-portfolio?barbero_id=${id}&aprobado=true`)
      if (portfolioResponse.ok) {
        const portfolioData = await portfolioResponse.json()
        setPortfolio(portfolioData.data || [])
      }

      // Cargar certificaciones
      const certificacionesResponse = await fetch(`/api/barbero-certificaciones?barbero_id=${id}&verificado=true`)
      if (certificacionesResponse.ok) {
        const certificacionesData = await certificacionesResponse.json()
        setCertificaciones(certificacionesData.data || [])
      }
    } catch (error) {
      console.error('Error loading barbero data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getImageUrl = (foto_url: string) => {
    if (!foto_url) return 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400&q=80'
    if (foto_url.startsWith('http')) return foto_url
    return `/images/barberos/${foto_url}`
  }

  const getPortfolioImageUrl = (imagen_url: string) => {
    if (!imagen_url) return 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80'
    if (imagen_url.startsWith('http')) return imagen_url
    return `/images/portfolio/${imagen_url}`
  }

  const renderStars = (rating: number) => {
    return (
      <div style={{ display: 'flex', gap: '2px' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <i
            key={star}
            className={star <= rating ? 'fas fa-star' : 'far fa-star'}
            style={{ color: 'var(--accent-color)', fontSize: '1rem' }}
          ></i>
        ))}
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  if (loading) {
    return (
      <Layout title="Cargando...">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '60vh',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div className="spinner"></div>
          <p>Cargando perfil del barbero...</p>
        </div>
      </Layout>
    )
  }

  if (!barbero) {
    return (
      <Layout title="Barbero no encontrado">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '60vh',
          flexDirection: 'column',
          gap: '2rem',
          textAlign: 'center'
        }}>
          <h2>Barbero no encontrado</h2>
          <p>El barbero que buscas no existe o ha sido removido.</p>
          <Link href="/equipo" className="btn btn-primary">
            <i className="fas fa-arrow-left"></i>
            Volver al Equipo
          </Link>
        </div>
      </Layout>
    )
  }

  const nombreCompleto = barbero.nombre_completo || `${barbero.nombre}${barbero.apellido ? ' ' + barbero.apellido : ''}`

  return (
    <>
      <Head>
        <title>{nombreCompleto} - Barbero Profesional | Chamos Barber</title>
        <meta name="description" content={`Conoce a ${nombreCompleto}, barbero profesional con ${barbero.experiencia_anos} años de experiencia en ${barbero.especialidad}. ${barbero.biografia.substring(0, 150)}...`} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh' }}>
        {/* Header con Navbar */}
        <div className="navbar">
          <div className="nav-container">
            <Link href="/" className="nav-brand">
              <i className="fas fa-cut"></i>
              Chamos Barber
            </Link>
            <Link href="/equipo" className="nav-link">
              <i className="fas fa-arrow-left"></i>
              Volver al Equipo
            </Link>
          </div>
        </div>

        {/* Hero Section - Profile Header */}
        <section style={{ 
          paddingTop: '6rem', 
          paddingBottom: '4rem',
          background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)'
        }}>
          <div className="container">
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr', 
              gap: '3rem',
              alignItems: 'start'
            }}>
              {/* Sección Izquierda - Foto y Info Básica */}
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: '2rem',
                alignItems: 'start'
              }}>
                <div style={{ 
                  width: '200px', 
                  height: '200px', 
                  borderRadius: '16px',
                  backgroundImage: `url(${getImageUrl(barbero.foto_url)})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: '4px solid var(--accent-color)',
                  boxShadow: '0 10px 40px rgba(212, 175, 55, 0.3)'
                }}></div>

                <div>
                  <h1 style={{ 
                    fontSize: '3rem', 
                    fontWeight: '800', 
                    marginBottom: '0.5rem',
                    color: 'var(--text-primary)'
                  }}>
                    {nombreCompleto}
                  </h1>
                  
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem', 
                    marginBottom: '1rem',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{ 
                      color: 'var(--accent-color)', 
                      fontSize: '1.3rem', 
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <i className="fas fa-star"></i>
                      {barbero.experiencia_anos} años de experiencia
                    </span>
                    
                    {barbero.promedio_calificacion && (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        padding: '6px 12px',
                        background: 'var(--bg-secondary)',
                        borderRadius: '20px',
                        border: '1px solid var(--border-color)'
                      }}>
                        {renderStars(Math.round(barbero.promedio_calificacion))}
                        <span style={{ fontWeight: '600', marginLeft: '4px' }}>
                          {barbero.promedio_calificacion.toFixed(1)}
                        </span>
                        <span style={{ opacity: '0.7', fontSize: '0.9rem' }}>
                          ({barbero.total_resenas || 0} reseñas)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Especialidades */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: '0.5rem' 
                    }}>
                      {(barbero.especialidades || [barbero.especialidad]).filter(Boolean).map((esp, index) => (
                        <span 
                          key={index}
                          style={{
                            background: 'var(--accent-color)',
                            color: 'var(--bg-primary)',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <i className="fas fa-scissors"></i>
                          {esp}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Biografía */}
                  <p style={{ 
                    fontSize: '1.1rem', 
                    lineHeight: '1.7', 
                    opacity: '0.9',
                    marginBottom: '2rem'
                  }}>
                    {barbero.biografia}
                  </p>

                  {/* Botones de Contacto */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '1rem', 
                    flexWrap: 'wrap' 
                  }}>
                    <Link href="/reservar" className="btn btn-primary">
                      <i className="fas fa-calendar-plus"></i>
                      Reservar Cita
                    </Link>
                    
                    {(barbero.telefono || barbero.whatsapp) && (
                      <a 
                        href={`https://wa.me/${(barbero.whatsapp || barbero.telefono)!.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                      >
                        <i className="fab fa-whatsapp"></i>
                        WhatsApp
                      </a>
                    )}
                    
                    {barbero.instagram && (
                      <a 
                        href={`https://instagram.com/${barbero.instagram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                      >
                        <i className="fab fa-instagram"></i>
                        Instagram
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Estadísticas Rápidas */}
        <section style={{ padding: '3rem 0', backgroundColor: 'var(--bg-secondary)' }}>
          <div className="container">
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '2rem' 
            }}>
              <div className="service-card" style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '3rem', 
                  color: 'var(--accent-color)', 
                  fontWeight: '800',
                  marginBottom: '0.5rem'
                }}>
                  {barbero.total_clientes || '500+'}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: '600', opacity: '0.9' }}>
                  Clientes Atendidos
                </div>
              </div>

              <div className="service-card" style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '3rem', 
                  color: 'var(--accent-color)', 
                  fontWeight: '800',
                  marginBottom: '0.5rem'
                }}>
                  {barbero.total_cortes || '1500+'}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: '600', opacity: '0.9' }}>
                  Cortes Realizados
                </div>
              </div>

              <div className="service-card" style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '3rem', 
                  color: 'var(--accent-color)', 
                  fontWeight: '800',
                  marginBottom: '0.5rem'
                }}>
                  {barbero.experiencia_anos}+
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: '600', opacity: '0.9' }}>
                  Años de Experiencia
                </div>
              </div>

              <div className="service-card" style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '3rem', 
                  color: 'var(--accent-color)', 
                  fontWeight: '800',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  {barbero.promedio_calificacion?.toFixed(1) || '5.0'}
                  <i className="fas fa-star" style={{ fontSize: '2rem' }}></i>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: '600', opacity: '0.9' }}>
                  Calificación Promedio
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tabs de Contenido */}
        <section style={{ padding: '4rem 0' }}>
          <div className="container">
            {/* Tab Navigation */}
            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              marginBottom: '3rem',
              borderBottom: '2px solid var(--border-color)',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => setActiveTab('portfolio')}
                style={{
                  padding: '1rem 2rem',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'portfolio' ? '3px solid var(--accent-color)' : '3px solid transparent',
                  color: activeTab === 'portfolio' ? 'var(--accent-color)' : 'var(--text-primary)',
                  fontWeight: '700',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  transition: 'var(--transition)',
                  opacity: activeTab === 'portfolio' ? 1 : 0.6
                }}
              >
                <i className="fas fa-images"></i> Portfolio ({portfolio.length})
              </button>
              
              <button
                onClick={() => setActiveTab('resenas')}
                style={{
                  padding: '1rem 2rem',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === 'resenas' ? '3px solid var(--accent-color)' : '3px solid transparent',
                  color: activeTab === 'resenas' ? 'var(--accent-color)' : 'var(--text-primary)',
                  fontWeight: '700',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  transition: 'var(--transition)',
                  opacity: activeTab === 'resenas' ? 1 : 0.6
                }}
              >
                <i className="fas fa-star"></i> Reseñas ({resenas.length})
              </button>

              {certificaciones.length > 0 && (
                <button
                  onClick={() => setActiveTab('certificaciones')}
                  style={{
                    padding: '1rem 2rem',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === 'certificaciones' ? '3px solid var(--accent-color)' : '3px solid transparent',
                    color: activeTab === 'certificaciones' ? 'var(--accent-color)' : 'var(--text-primary)',
                    fontWeight: '700',
                    fontSize: '1.1rem',
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                    opacity: activeTab === 'certificaciones' ? 1 : 0.6
                  }}
                >
                  <i className="fas fa-certificate"></i> Certificaciones ({certificaciones.length})
                </button>
              )}
            </div>

            {/* Portfolio Tab */}
            {activeTab === 'portfolio' && (
              <div>
                {portfolio.length > 0 ? (
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                    gap: '2rem' 
                  }}>
                    {portfolio.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedImage(getPortfolioImageUrl(item.imagen_url))}
                        style={{
                          position: 'relative',
                          aspectRatio: '1',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          transition: 'var(--transition)',
                          border: '2px solid var(--border-color)'
                        }}
                        className="service-card"
                      >
                        <div 
                          style={{ 
                            width: '100%',
                            height: '100%',
                            backgroundImage: `url(${getPortfolioImageUrl(item.imagen_url)})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            transition: 'var(--transition)'
                          }}
                        ></div>
                        {item.destacada && (
                          <div style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            background: 'var(--accent-color)',
                            color: 'var(--bg-primary)',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '0.85rem',
                            fontWeight: '700'
                          }}>
                            <i className="fas fa-star"></i> Destacado
                          </div>
                        )}
                        {item.descripcion && (
                          <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
                            padding: '3rem 1rem 1rem',
                            color: 'white',
                            fontSize: '0.95rem'
                          }}>
                            {item.descripcion}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '4rem 0', opacity: 0.6 }}>
                    <i className="fas fa-images" style={{ fontSize: '4rem', marginBottom: '1rem' }}></i>
                    <p style={{ fontSize: '1.2rem' }}>No hay trabajos en el portfolio aún</p>
                  </div>
                )}
              </div>
            )}

            {/* Reseñas Tab */}
            {activeTab === 'resenas' && (
              <div>
                {resenas.length > 0 ? (
                  <div style={{ display: 'grid', gap: '2rem' }}>
                    {resenas.map((resena) => (
                      <div 
                        key={resena.id}
                        className="service-card"
                        style={{ padding: '2rem' }}
                      >
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'start',
                          marginBottom: '1rem',
                          flexWrap: 'wrap',
                          gap: '1rem'
                        }}>
                          <div>
                            <h3 style={{ 
                              fontSize: '1.3rem', 
                              fontWeight: '700', 
                              marginBottom: '0.5rem',
                              color: 'var(--accent-color)'
                            }}>
                              {resena.cliente_nombre}
                            </h3>
                            {renderStars(resena.calificacion)}
                          </div>
                          <div style={{ textAlign: 'right', opacity: 0.7, fontSize: '0.9rem' }}>
                            {formatDate(resena.created_at)}
                          </div>
                        </div>
                        
                        {resena.servicio_recibido && (
                          <div style={{ 
                            display: 'inline-block',
                            background: 'var(--bg-secondary)',
                            padding: '4px 12px',
                            borderRadius: '6px',
                            fontSize: '0.9rem',
                            marginBottom: '1rem',
                            border: '1px solid var(--border-color)'
                          }}>
                            <i className="fas fa-cut"></i> {resena.servicio_recibido}
                          </div>
                        )}
                        
                        <p style={{ 
                          fontSize: '1.05rem', 
                          lineHeight: '1.7',
                          opacity: 0.9
                        }}>
                          {resena.comentario}
                        </p>

                        {resena.destacada && (
                          <div style={{
                            marginTop: '1rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: 'var(--accent-color)',
                            color: 'var(--bg-primary)',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            fontWeight: '700'
                          }}>
                            <i className="fas fa-trophy"></i>
                            Reseña Destacada
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '4rem 0', opacity: 0.6 }}>
                    <i className="fas fa-star" style={{ fontSize: '4rem', marginBottom: '1rem' }}></i>
                    <p style={{ fontSize: '1.2rem' }}>No hay reseñas disponibles aún</p>
                  </div>
                )}
              </div>
            )}

            {/* Certificaciones Tab */}
            {activeTab === 'certificaciones' && certificaciones.length > 0 && (
              <div>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                  gap: '2rem' 
                }}>
                  {certificaciones.map((cert) => (
                    <div 
                      key={cert.id}
                      className="service-card"
                      style={{ padding: '2rem' }}
                    >
                      <div style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        marginBottom: '1rem'
                      }}>
                        <div style={{
                          width: '60px',
                          height: '60px',
                          background: 'var(--accent-color)',
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--bg-primary)',
                          fontSize: '1.8rem'
                        }}>
                          <i className="fas fa-certificate"></i>
                        </div>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ 
                            fontSize: '1.2rem', 
                            fontWeight: '700',
                            marginBottom: '0.25rem',
                            color: 'var(--accent-color)'
                          }}>
                            {cert.nombre}
                          </h3>
                          <p style={{ opacity: 0.8, fontSize: '0.95rem' }}>
                            {cert.institucion}
                          </p>
                        </div>
                      </div>
                      <div style={{ 
                        padding: '1rem 0',
                        borderTop: '1px solid var(--border-color)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.9rem',
                        opacity: 0.8
                      }}>
                        <span>
                          <i className="fas fa-calendar"></i>{' '}
                          {formatDate(cert.fecha_obtencion)}
                        </span>
                        {cert.numero_certificado && (
                          <span>
                            #{cert.numero_certificado}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* CTA Final */}
        <section style={{ 
          padding: '4rem 0', 
          backgroundColor: 'var(--bg-secondary)',
          textAlign: 'center'
        }}>
          <div className="container">
            <h2 style={{ 
              fontSize: '2.5rem', 
              fontWeight: '800', 
              marginBottom: '1rem',
              color: 'var(--accent-color)'
            }}>
              ¿Listo para tu nuevo look?
            </h2>
            <p style={{ 
              fontSize: '1.2rem', 
              marginBottom: '2rem',
              opacity: 0.9
            }}>
              Reserva tu cita con {nombreCompleto} y experimenta el mejor servicio
            </p>
            <Link href="/reservar" className="btn btn-primary" style={{ padding: '1rem 3rem', fontSize: '1.1rem' }}>
              <i className="fas fa-calendar-plus"></i>
              Reservar Cita Ahora
            </Link>
          </div>
        </section>

        {/* Lightbox Modal */}
        {selectedImage && (
          <div
            onClick={() => setSelectedImage(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.95)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem',
              cursor: 'pointer'
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                setSelectedImage(null)
              }}
              style={{
                position: 'absolute',
                top: '2rem',
                right: '2rem',
                background: 'var(--accent-color)',
                border: 'none',
                color: 'var(--bg-primary)',
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                fontSize: '1.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                zIndex: 10000
              }}
            >
              ×
            </button>
            <img
              src={selectedImage}
              alt="Portfolio"
              style={{
                maxWidth: '90%',
                maxHeight: '90%',
                objectFit: 'contain',
                borderRadius: '12px'
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* Footer */}
        <footer style={{ 
          padding: '2rem 0', 
          backgroundColor: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-color)',
          textAlign: 'center'
        }}>
          <div className="container">
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                fontSize: '1.2rem'
              }}>
                <span>🇻🇪</span>
                <i className="fas fa-heart" style={{ color: '#ff4444', fontSize: '1rem' }}></i>
                <span>🇨🇱</span>
              </div>
            </div>
            <p style={{ opacity: 0.7, fontSize: '0.95rem' }}>
              Hecho con ❤️ por venezolanos en Chile
            </p>
          </div>
        </footer>
      </div>
    </>
  )
}

export default BarberoProfilePage
