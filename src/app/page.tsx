'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import styles from './page.module.css'

interface Servicio {
  id: string
  nombre: string
  descripcion: string
  precio: number
  duracion: number
  icono: string
}

interface Barbero {
  id: string
  nombre: string
  especialidad: string
  experiencia: number
  descripcion: string
  foto_url: string
  instagram: string
  whatsapp: string
  activo: boolean
}

export default function Home() {
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [barberos, setBarberos] = useState<Barbero[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        // Cargar servicios
        const serviciosResponse = await fetch('/api/servicios')
        if (serviciosResponse.ok) {
          const serviciosData = await serviciosResponse.json()
          setServicios(serviciosData.data || [])
        }

        // Cargar barberos
        const barberosResponse = await fetch('/api/barberos')
        if (barberosResponse.ok) {
          const barberosData = await barberosResponse.json()
          setBarberos(barberosData.data.filter((b: Barbero) => b.activo) || [])
        }
      } catch (error) {
        console.error('Error cargando datos:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()

    // Animaciones de scroll
    const handleScroll = () => {
      const elements = document.querySelectorAll('.fade-in')
      elements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top
        const elementVisible = 150
        
        if (elementTop < window.innerHeight - elementVisible) {
          element.classList.add('visible')
        }
      })
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Ejecutar una vez al cargar

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      <Navigation />
      
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.heroContent}>
            <h1 className="fade-in">
              Bienvenidos a <span className="text-gold">Chamos Barber</span>
            </h1>
            <p className={`${styles.heroSubtitle} fade-in`}>
              Donde el estilo venezolano se encuentra con la elegancia chilena
            </p>
            <p className={`${styles.heroDescription} fade-in`}>
              Más que una barbería, somos una experiencia única que combina 
              la calidez y destreza venezolana con la sofisticación chilena.
            </p>
            <div className={`${styles.heroButtons} fade-in`}>
              <Link href="/reservar" className="btn">
                <i className="fas fa-calendar-alt"></i> Reservar Cita
              </Link>
              <Link href="/equipo" className="btn btn-secondary">
                <i className="fas fa-users"></i> Conocer Equipo
              </Link>
            </div>
          </div>
        </div>
        <div className={styles.heroVideo}>
          <video autoPlay muted loop playsInline>
            <source src="/videos/barbershop-hero.mp4" type="video/mp4" />
          </video>
          <div className={styles.heroOverlay}></div>
        </div>
      </section>

      {/* Servicios Section */}
      <section className="section">
        <div className="container">
          <div className="text-center fade-in">
            <h2>Nuestros <span className="text-gold">Servicios</span></h2>
            <p>Ofrecemos una gama completa de servicios de barbería premium</p>
          </div>
          
          {loading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Cargando servicios...</p>
            </div>
          ) : (
            <div className={styles.serviciosGrid}>
              {servicios.map((servicio) => (
                <div key={servicio.id} className={`${styles.servicioCard} fade-in`}>
                  <div className={styles.servicioIcon}>
                    <i className={servicio.icono === 'fa-razor' ? 'fas fa-crown' : servicio.icono}></i>
                  </div>
                  <h3>{servicio.nombre}</h3>
                  <p>{servicio.descripcion}</p>
                  <div className={styles.servicioMeta}>
                    <span className={styles.precio}>${servicio.precio.toLocaleString('es-CL')}</span>
                    <span className={styles.duracion}>{servicio.duracion} min</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Equipo Preview */}
      <section className={`section bg-dark ${styles.equipoPreview}`}>
        <div className="container">
          <div className="text-center fade-in">
            <h2>Nuestro <span className="text-gold">Equipo</span></h2>
            <p>Profesionales apasionados con años de experiencia</p>
          </div>
          
          {loading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Cargando equipo...</p>
            </div>
          ) : (
            <>
              <div className={styles.equipoGrid}>
                {barberos.slice(0, 3).map((barbero) => (
                  <div key={barbero.id} className={`${styles.barberoCard} fade-in`}>
                    <div className={styles.barberoFoto}>
                      <Image
                        src={barbero.foto_url || '/images/barbero-default.jpg'}
                        alt={barbero.nombre}
                        width={200}
                        height={200}
                      />
                    </div>
                    <h3>{barbero.nombre}</h3>
                    <p className={styles.especialidad}>{barbero.especialidad}</p>
                    <p className={styles.experiencia}>{barbero.experiencia} años de experiencia</p>
                  </div>
                ))}
              </div>
              
              <div className="text-center fade-in">
                <Link href="/equipo" className="btn">
                  <i className="fas fa-users"></i> Ver Todo el Equipo
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className={`section ${styles.ctaSection}`}>
        <div className="container text-center">
          <div className="fade-in">
            <h2>¿Listo para tu nueva imagen?</h2>
            <p>Reserva tu cita ahora y experimenta el mejor servicio de barbería</p>
            <Link href="/reservar" className="btn">
              <i className="fas fa-calendar-alt"></i> Reservar Ahora
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}