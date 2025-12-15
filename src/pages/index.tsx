import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Layout from '../components/Layout'
import Preloader from '../components/Preloader'
import GoogleMap from '../components/GoogleMap'

const HomePage: React.FC = () => {
  const [showPreloader, setShowPreloader] = useState(true)
  const [isFirstVisit, setIsFirstVisit] = useState(true)

  useEffect(() => {
    // Verificar si es la primera visita en esta sesión
    const hasVisited = sessionStorage.getItem('hasVisitedHome')
    
    if (hasVisited) {
      setShowPreloader(false)
      setIsFirstVisit(false)
    } else {
      sessionStorage.setItem('hasVisitedHome', 'true')
    }
  }, [])

  const handlePreloaderComplete = () => {
    setShowPreloader(false)
  }

  // Mostrar solo el preloader mientras carga
  if (showPreloader && isFirstVisit) {
    return <Preloader onComplete={handlePreloaderComplete} duration={3000} />
  }

  return (
    <Layout 
      title="Chamos Barber - Barbería en San Fernando, Chile"
      description="Tu barbería de confianza en San Fernando, Chile. Cortes modernos y clásicos con estilo profesional."
      transparentNav={true}
    >
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1 className="hero-title">Bienvenido a Chamos Barber</h1>
          <p className="hero-subtitle">Tu barbería de confianza en San Fernando, Chile</p>
          <div className="hero-buttons">
            <Link href="/equipo" className="btn btn-primary">
              <i className="fas fa-users"></i>
              Conoce Nuestro Equipo
            </Link>
            <Link href="/reservar" className="btn btn-secondary">
              <i className="fab fa-whatsapp"></i>
              Reservar Cita
            </Link>
          </div>
        </div>
      </section>

      {/* Servicios Destacados */}
      <section className="services">
        <div className="container">
          <h2 className="section-title">Nuestros Servicios</h2>
          <div className="services-grid">
            <div className="service-card">
              <div className="service-icon">
                <i className="fas fa-cut"></i>
              </div>
              <h3>Cortes Clásicos</h3>
              <p>Cortes tradicionales ejecutados con precisión y estilo.</p>
            </div>
            <div className="service-card">
              <div className="service-icon">
                <i className="fas fa-crown"></i>
              </div>
              <h3>Afeitado Premium</h3>
              <p>Experiencia de afeitado con navaja y productos de alta calidad.</p>
            </div>
            <div className="service-card">
              <div className="service-icon">
                <i className="fas fa-user-tie"></i>
              </div>
              <h3>Estilo Moderno</h3>
              <p>Cortes contemporáneos siguiendo las últimas tendencias.</p>
            </div>
            <div className="service-card">
              <div className="service-icon">
                <i className="fas fa-spa"></i>
              </div>
              <h3>Tratamientos</h3>
              <p>Cuidados especiales para barba y cuidado facial.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Horarios y Ubicación */}
      <section className="schedule">
        <div className="container">
          <h2 className="section-title">Horarios de Atención</h2>
          <div className="schedule-grid">
            <div className="schedule-item">
              <span className="day">Lunes - Viernes</span>
              <span className="time">10:00 - 20:30</span>
            </div>
            <div className="schedule-item">
              <span className="day">Sábado</span>
              <span className="time">10:00 - 21:00</span>
            </div>
            <div className="schedule-item">
              <span className="day">Domingo</span>
              <span className="time">Cerrado</span>
            </div>
          </div>
          
          <div style={{ marginTop: '3rem' }}>
            <h2 className="section-title" style={{ textAlign: 'center' }}>Ubicación</h2>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '1.5rem',
              padding: '2rem',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--border-radius)',
              maxWidth: '900px',
              margin: '0 auto'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  <i className="fas fa-map-marker-alt" style={{ color: 'var(--accent-color)', marginRight: '0.5rem' }}></i>
                  <strong>Rancagua 759</strong>
                </div>
                <div style={{ fontSize: '1rem', color: 'var(--text-primary)', opacity: 0.9 }}>
                  San Fernando, O'Higgins, Chile
                </div>
              </div>
              
              {/* Mapa interactivo usando Google Maps JavaScript API */}
              <div style={{ 
                width: '100%', 
                position: 'relative',
                borderRadius: 'var(--border-radius)',
                overflow: 'hidden',
                border: '2px solid var(--accent-color)',
                boxShadow: '0 4px 12px rgba(212, 175, 55, 0.15)',
                height: '400px'
              }}>
                <GoogleMap
                  apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}
                  center={{ lat: -34.5885, lng: -70.9912 }}
                  zoom={16}
                  markerTitle="Chamos Barber - Rancagua 759, San Fernando"
                  style={{ width: '100%', height: '100%' }}
                />
                
                {/* Botón superpuesto para abrir en Google Maps */}
                <a 
                  href="https://www.google.com/maps/search/?api=1&query=Rancagua+759+San+Fernando+Chile" 
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    position: 'absolute',
                    bottom: '15px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'var(--accent-color)',
                    color: '#000',
                    padding: '14px 28px',
                    borderRadius: 'var(--border-radius)',
                    fontSize: '1.05rem',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: '0 4px 12px rgba(212, 175, 55, 0.5)',
                    transition: 'all 0.3s ease',
                    textDecoration: 'none',
                    zIndex: 1000
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(-50%) scale(1.05)'
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(212, 175, 55, 0.7)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(-50%) scale(1)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(212, 175, 55, 0.5)'
                  }}
                >
                  <i className="fas fa-directions"></i>
                  <span>Ver en Google Maps</span>
                  <i className="fas fa-external-link-alt" style={{ fontSize: '0.85rem' }}></i>
                </a>
              </div>

              <a 
                href="https://www.google.com/maps/search/?api=1&query=Rancagua+759+San+Fernando+Chile" 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                <i className="fas fa-directions"></i>
                Cómo Llegar
              </a>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  )
}

export default HomePage