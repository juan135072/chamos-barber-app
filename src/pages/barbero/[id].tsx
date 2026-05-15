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

      // Portfolio deshabilitado - tabla barbero_portfolio fue eliminada
      // La sección se oculta automáticamente cuando portfolio.length === 0
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
      transparentNav={true}
    >
      <div className="relative min-h-screen bg-[#080808] overflow-hidden pt-32 pb-24">
        {/* Background Orbs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold/5 blur-[120px] rounded-full pointer-events-none z-0" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-white/5 blur-[120px] rounded-full pointer-events-none z-0" />

        <div className="relative z-10 mx-auto max-w-6xl px-6 lg:px-8">
          {/* Back button */}
          <Link 
            href="/equipo" 
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] text-white/80 transition-all mb-12 backdrop-blur-xl"
          >
            <i className="fas fa-arrow-left"></i>
            Volver al Equipo
          </Link>

          {/* Profile Header Card */}
          <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 md:p-12 backdrop-blur-2xl flex flex-col md:flex-row gap-12 items-start shadow-2xl">
            {/* Image */}
            <div className="w-full md:w-1/3 shrink-0">
              <div 
                className="w-full aspect-[3/4] rounded-2xl bg-cover bg-center border border-white/10 shadow-[0_0_30px_rgba(212,175,55,0.1)]"
                style={{ backgroundImage: `url(${getImageUrl(barbero.foto_url)})` }}
              />
            </div>
            
            {/* Details */}
            <div className="flex-1 w-full">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter text-white mb-4">
                {barbero.nombre}
              </h1>
              
              {barbero.experiencia_anos && (
                <div className="flex items-center gap-2 text-gold text-lg font-medium tracking-wide mb-8">
                  <i className="fas fa-star"></i> {barbero.experiencia_anos} años de experiencia
                </div>
              )}
              
              {barbero.especialidades && barbero.especialidades.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-white/50 uppercase tracking-widest text-sm mb-4">Especialidades:</h3>
                  <div className="flex flex-wrap gap-3">
                    {barbero.especialidades.map((especialidad, index) => (
                      <span 
                        key={index}
                        className="px-4 py-2 rounded-full bg-gold/10 border border-gold/20 text-gold text-sm font-medium tracking-wide"
                      >
                        {especialidad}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="text-white/70 text-lg leading-relaxed mb-10 font-medium">
                <p>{barbero.biografia}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 mt-6">
                {barbero.instagram && (
                  <a 
                    href={`https://instagram.com/${barbero.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-pink-500/10 border border-pink-500/20 hover:bg-pink-500/20 text-pink-400 font-medium transition-all"
                  >
                    <i className="fab fa-instagram"></i>
                    Instagram
                  </a>
                )}
                
                <Link 
                  href={`/reservar?barbero=${barbero.id}`} 
                  className="relative group inline-flex overflow-hidden rounded-xl bg-gradient-to-br from-gold to-[#a88647] p-[1px] shrink-0"
                >
                  <div className="relative bg-[#080808] px-8 py-3 rounded-xl transition-colors duration-300 group-hover:bg-transparent flex items-center gap-2">
                    <i className="fas fa-calendar-plus text-gold group-hover:text-[#080808] transition-colors"></i>
                    <span className="relative z-10 text-white font-black tracking-widest text-sm uppercase group-hover:text-[#080808] transition-colors">
                      Reservar Cita
                    </span>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Portfolio Section */}
          {portfolio.length > 0 && (
            <div className="mt-24">
              <div className="flex items-center gap-4 mb-10">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/10" />
                <h2 className="text-3xl font-black uppercase tracking-widest text-white text-center">Portfolio de Trabajos</h2>
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/10" />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {portfolio.map((item) => (
                  <div 
                    key={item.id}
                    className="group relative aspect-square rounded-2xl overflow-hidden bg-white/5 border border-white/10"
                    title={item.descripcion || 'Trabajo realizado'}
                  >
                    <div 
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                      style={{ backgroundImage: `url(${getPortfolioImageUrl(item.imagen_url)})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#080808]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default BarberoProfilePage