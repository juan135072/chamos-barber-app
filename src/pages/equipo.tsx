import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Layout from '../components/Layout'

interface Barbero {
  id: string
  slug?: string
  nombre: string
  biografia: string
  foto_url: string
  especialidades: string[]
  experiencia_anos: number
  telefono?: string
  instagram?: string
}

const EquipoPage: React.FC = () => {
  const [barberos, setBarberos] = useState<Barbero[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBarberos()
  }, [])

  const loadBarberos = async () => {
    try {
      const response = await fetch('/api/barberos')
      if (response.ok) {
        const data = await response.json()
        setBarberos(data.data || [])
      } else {
        console.error('Error loading barberos')
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getImageUrl = (foto_url: string) => {
    if (!foto_url) return 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=300&q=80'
    if (foto_url.startsWith('http')) return foto_url
    return `/images/barberos/${foto_url}`
  }

  return (
    <Layout 
      title="Nuestro Equipo - Chamos Barber"
      description="Conoce a nuestro equipo de barberos venezolanos y chilenos. Experiencia, profesionalismo y pasión por el oficio."
    >
      {/* Page Header */}
      <section className="page-header">
        <div className="container">
          <h1 className="page-title">Nuestro Equipo</h1>
          <p className="page-subtitle">Conoce a nuestro equipo de barberos venezolanos y chilenos</p>
        </div>
      </section>

      {/* Equipo Section */}
      <section className="team-section">
        <div className="container">
          <div className="team-grid">
            {loading ? (
              <div style={{ textAlign: 'center', gridColumn: '1 / -1', padding: '4rem 0' }}>
                <div className="spinner"></div>
                <p>Cargando equipo...</p>
              </div>
            ) : barberos.length === 0 ? (
              <div style={{ textAlign: 'center', gridColumn: '1 / -1', padding: '4rem 0' }}>
                <p>No hay barberos registrados en este momento.</p>
              </div>
            ) : (
              barberos.map((barbero) => (
                <Link 
                  key={barbero.id} 
                  href={`/barbero/${barbero.slug || barbero.id}`} 
                  className="barber-card"
                >
                  <div 
                    className="barber-image"
                    style={{ backgroundImage: `url(${getImageUrl(barbero.foto_url)})` }}
                  >
                    <div className="barber-overlay">
                      <h3 className="barber-name">{barbero.nombre}</h3>
                      {barbero.especialidades && barbero.especialidades.length > 0 && (
                        <p style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                          {barbero.especialidades.slice(0, 2).join(' • ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="barber-info">
                    <div className="barber-name">{barbero.nombre}</div>
                    <p className="barber-bio">
                      {barbero.biografia.length > 120 
                        ? `${barbero.biografia.substring(0, 120)}...` 
                        : barbero.biografia
                      }
                    </p>
                    {barbero.experiencia_anos && (
                      <p style={{ 
                        color: 'var(--accent-color)', 
                        fontWeight: '600', 
                        marginTop: '1rem',
                        fontSize: '0.9rem'
                      }}>
                        <i className="fas fa-star"></i> {barbero.experiencia_anos} años de experiencia
                      </p>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Información adicional */}
      <section className="team-info" style={{ padding: '4rem 0', backgroundColor: 'var(--bg-secondary)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
            <h2 className="section-title">Experiencia y Profesionalismo</h2>
            <p style={{ 
              fontSize: '1.1rem', 
              lineHeight: '1.7', 
              marginBottom: '2rem', 
              opacity: '0.9' 
            }}>
              En Chamos Barber combinamos la calidez y técnica venezolana con la experiencia chilena. 
              Nuestro equipo multicultural aporta diversidad de estilos y técnicas, desde cortes clásicos 
              hasta las últimas tendencias urbanas. Cada barbero trae su propia especialidad y pasión por el oficio.
            </p>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '2rem', 
              marginTop: '3rem' 
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '2.5rem', 
                  color: 'var(--accent-color)', 
                  fontWeight: '700', 
                  marginBottom: '0.5rem' 
                }}>8+</div>
                <div style={{ fontWeight: '600' }}>Años en Chile</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '2.5rem', 
                  color: 'var(--accent-color)', 
                  fontWeight: '700', 
                  marginBottom: '0.5rem' 
                }}>800+</div>
                <div style={{ fontWeight: '600' }}>Clientes Fieles</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: '2.5rem', 
                  color: 'var(--accent-color)', 
                  fontWeight: '700', 
                  marginBottom: '0.5rem' 
                }}>100%</div>
                <div style={{ fontWeight: '600' }}>Profesionalismo</div>
              </div>
            </div>

            <div style={{ marginTop: '3rem' }}>
              <Link href="/reservar" className="btn btn-primary">
                <i className="fas fa-calendar-plus"></i>
                Reservar con Nuestro Equipo
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  )
}

export default EquipoPage