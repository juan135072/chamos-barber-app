import React, { useState, useEffect } from 'react'
import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import Layout from '../components/Layout'
import Preloader from '../components/Preloader'
import { chamosSupabase } from '../../lib/supabase-helpers'
import { getServiceImage } from '../lib/service-utils'

interface Service {
  id: string
  nombre: string
  descripcion: string | null
  precio: number
  categoria: string
  imagen_url?: string | null
}

interface HomePageProps {
  servicios: Service[]
}

const HomePage: React.FC<HomePageProps> = ({ servicios }) => {
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
            <h2 className="section-title" style={{ margin: 0 }}>Nuestros Servicios</h2>
            <Link href="/servicios" className="btn btn-secondary">
              Ver Todos <i className="fas fa-arrow-right" style={{ marginLeft: '10px' }}></i>
            </Link>
          </div>
          <div className="services-grid">
            {servicios.length > 0 ? (
              servicios.map((servicio) => (
                <div key={servicio.id} className="service-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ height: '200px', overflow: 'hidden' }}>
                    <img
                      src={servicio.imagen_url || getServiceImage(servicio.categoria, servicio.nombre)}
                      alt={servicio.nombre}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div style={{ padding: '2rem' }}>
                    <h3>{servicio.nombre}</h3>
                    <p>{servicio.descripcion || 'Servicio profesional con la calidad garantizada de Chamos Barber.'}</p>
                  </div>
                </div>
              ))
            ) : (
              // Fallback estático si por alguna razón no hay servicios en la DB
              <>
                <div className="service-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ height: '200px', overflow: 'hidden' }}>
                    <img src={getServiceImage('cortes')} alt="Corte" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ padding: '2rem' }}>
                    <h3>Corte de Cabello</h3>
                    <p>Cortes clásicos y modernos adaptados a tu estilo personal.</p>
                  </div>
                </div>
                <div className="service-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ height: '200px', overflow: 'hidden' }}>
                    <img src={getServiceImage('barbas')} alt="Barba" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ padding: '2rem' }}>
                    <h3>Barba y Afeitado</h3>
                    <p>Perfilado de barba y afeitado tradicional con toalla caliente.</p>
                  </div>
                </div>
                <div className="service-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ height: '200px', overflow: 'hidden' }}>
                    <img src={getServiceImage('tratamientos')} alt="Tratamiento" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ padding: '2rem' }}>
                    <h3>Tratamientos</h3>
                    <p>Limpieza facial y masajes capilares para una experiencia completa.</p>
                  </div>
                </div>
              </>
            )}
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
              {/* Mapa de Google Maps */}
              <div style={{
                width: '100%',
                height: '600px',
                borderRadius: 'var(--border-radius)',
                overflow: 'hidden',
                border: '1px solid var(--border-color)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}>
                <iframe
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=Rancagua+759,San+Fernando,Chile&language=es&zoom=16`}
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  )
}

export const getServerSideProps: GetServerSideProps = async () => {
  try {
    const servicios = await chamosSupabase.getServicios(true)
    // Limitar a 3 para la home
    const featured = (servicios || []).slice(0, 3)

    return {
      props: {
        servicios: JSON.parse(JSON.stringify(featured))
      }
    }
  } catch (error) {
    console.error('Error fetching services for home:', error)
    return {
      props: {
        servicios: []
      }
    }
  }
}

export default HomePage