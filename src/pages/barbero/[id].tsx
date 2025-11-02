import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Layout from '../../components/Layout'

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

interface PortfolioItem {
  id: string
  imagen_url: string
  descripcion: string
  fecha_creacion: string
}

const BarberoProfilePage: React.FC = () => {
  const router = useRouter()
  const { id } = router.query
  const [barbero, setBarbero] = useState<Barbero | null>(null)
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)

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

      // Cargar portfolio del barbero
      const portfolioResponse = await fetch(`/api/barbero-portfolio?barbero_id=${id}&aprobado=true`)
      if (portfolioResponse.ok) {
        const portfolioData = await portfolioResponse.json()
        setPortfolio(portfolioData.data || [])
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

  return (
    <Layout 
      title={`${barbero.nombre} - Chamos Barber`}
      description={`Conoce a ${barbero.nombre}, ${barbero.biografia.substring(0, 150)}...`}
    >
      <div className="container" style={{ paddingTop: '6rem' }}>
        {/* Botón volver */}
        <div style={{ marginBottom: '2rem' }}>
          <Link href="/equipo" className="btn btn-secondary" style={{ padding: '10px 20px' }}>
            <i className="fas fa-arrow-left"></i>
            Volver al Equipo
          </Link>
        </div>

        {/* Profile Header */}
        <section className="barber-profile">
          <div className="profile-header">
            <div 
              className="profile-image"
              style={{ backgroundImage: `url(${getImageUrl(barbero.foto_url)})` }}
            ></div>
            
            <div className="profile-details">
              <h1>{barbero.nombre}</h1>
              {barbero.experiencia_anos && (
                <p style={{ 
                  color: 'var(--accent-color)', 
                  fontSize: '1.2rem', 
                  fontWeight: '600', 
                  marginBottom: '1rem' 
                }}>
                  <i className="fas fa-star"></i> {barbero.experiencia_anos} años de experiencia
                </p>
              )}
              
              {barbero.especialidades && barbero.especialidades.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ 
                    color: 'var(--accent-color)', 
                    marginBottom: '0.5rem',
                    fontSize: '1.1rem'
                  }}>
                    Especialidades:
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {barbero.especialidades.map((especialidad, index) => (
                      <span 
                        key={index}
                        style={{
                          background: 'var(--accent-color)',
                          color: 'var(--bg-primary)',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '0.9rem',
                          fontWeight: '500'
                        }}
                      >
                        {especialidad}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="profile-bio">
                <p>{barbero.biografia}</p>
              </div>

              {/* Contact Info */}
              <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                marginTop: '2rem',
                flexWrap: 'wrap'
              }}>
                {barbero.telefono && (
                  <a 
                    href={`https://wa.me/${barbero.telefono.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{ padding: '10px 20px' }}
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
                    style={{ padding: '10px 20px' }}
                  >
                    <i className="fab fa-instagram"></i>
                    Instagram
                  </a>
                )}
                <Link 
                  href="/reservar" 
                  className="btn btn-primary"
                  style={{ padding: '10px 20px' }}
                >
                  <i className="fas fa-calendar-plus"></i>
                  Reservar Cita
                </Link>
              </div>
            </div>
          </div>

          {/* Portfolio Section */}
          {portfolio.length > 0 && (
            <div className="portfolio-section">
              <h2>Portfolio de Trabajos</h2>
              <div className="portfolio-grid">
                {portfolio.map((item) => (
                  <div 
                    key={item.id}
                    className="portfolio-item"
                    style={{ backgroundImage: `url(${getPortfolioImageUrl(item.imagen_url)})` }}
                    title={item.descripcion || 'Trabajo realizado'}
                  ></div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </Layout>
  )
}

export default BarberoProfilePage