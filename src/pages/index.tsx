import React from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Layout from '../components/Layout'

const HomePage: React.FC = () => {
  return (
    <Layout 
      title="Chamos Barber - Barbería Venezolana y Chilena"
      description="Tu barbería de confianza en el corazón de Chile. Estilo auténtico venezolano con cortes modernos y clásicos."
      transparentNav={true}
    >
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1 className="hero-title">Bienvenido a Chamos Barber</h1>
          <p className="hero-subtitle">Tu barbería de confianza en el corazón de Chile</p>
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

      {/* Horarios */}
      <section className="schedule">
        <div className="container">
          <h2 className="section-title">Horarios de Atención</h2>
          <div className="schedule-grid">
            <div className="schedule-item">
              <span className="day">Lunes - Viernes</span>
              <span className="time">8:00 AM - 8:00 PM</span>
            </div>
            <div className="schedule-item">
              <span className="day">Sábados</span>
              <span className="time">8:00 AM - 6:00 PM</span>
            </div>
            <div className="schedule-item">
              <span className="day">Domingos</span>
              <span className="time">10:00 AM - 4:00 PM</span>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  )
}

export default HomePage