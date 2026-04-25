import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Layout from '../components/Layout'
import TeamMarquee from '../components/ui/TeamMarquee'

interface Barbero {
  id: string
  slug?: string
  nombre: string
  biografia: string
  foto_url: string
  imagen_url?: string
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


  return (
    <Layout
      title="Nuestro Equipo - Chamos Barber"
      description="Conoce a nuestro equipo de barberos venezolanos y chilenos. Experiencia, profesionalismo y pasión por el oficio."
    >
      {/* ── Marquee Team Section ── */}
      <TeamMarquee members={barberos} loading={loading} />

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