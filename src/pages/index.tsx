import React from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Layout from '../components/Layout'

const HomePage: React.FC = () => {
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
              
              {/* Google Maps Embed */}
              <div style={{ 
                width: '100%', 
                height: '400px',
                borderRadius: 'var(--border-radius)',
                overflow: 'hidden',
                border: '2px solid var(--accent-color)'
              }}>
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3265.7234567890123!2d-70.9876543!3d-34.5876543!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzTCsDM1JzE1LjYiUyA3MMKwNTknMTUuNiJX!5e0!3m2!1ses!2scl!4v1234567890123!5m2!1ses!2scl&q=Rancagua+759,+San+Fernando,+Chile"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Ubicación Chamos Barber"
                ></iframe>
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