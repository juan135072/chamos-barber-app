import React, { useState, useEffect } from 'react'
import { GetServerSideProps } from 'next'
import Layout from '../components/Layout'
import Preloader from '../components/Preloader'
import { chamosSupabase } from '@/lib/supabase-helpers'
import Link from 'next/link'

// Import new Inspirar components
import Hero from '../components/Hero'
import LogoCarousel from '../components/LogoCarousel'
import ValueProp from '../components/ValueProp'
import ServicesSection from '../components/ServicesSection'
import Testimonials from '../components/Testimonials'

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
    const hasVisited = sessionStorage.getItem('hasVisitedHome')
    if (hasVisited) {
      setShowPreloader(false)
      setIsFirstVisit(false)
    } else {
      sessionStorage.setItem('hasVisitedHome', 'true')
    }
  }, [])

  const handlePreloaderComplete = () => setShowPreloader(false)

  if (showPreloader && isFirstVisit) {
    return <Preloader onComplete={handlePreloaderComplete} duration={3000} />
  }

  return (
    <Layout
      title="Chamos Barber - Barbería en San Fernando, Chile"
      description="Tu barbería de confianza en San Fernando, Chile. Cortes modernos y clásicos con estilo profesional."
      transparentNav={true}
    >
      <main>
        <Hero />
        <LogoCarousel />
        <ValueProp />
        <ServicesSection servicios={servicios} />
        
        {/* CTA Band */}
        <section className="py-24 bg-gold text-dark relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-black/5 pointer-events-none" />
          <div className="container mx-auto px-6 relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
            <div>
              <h2 className="text-5xl md:text-6xl font-black uppercase tracking-tighter mb-4">
                ¿Listo para tu <br/><span className="italic font-serif font-normal text-white">próximo look?</span>
              </h2>
              <p className="text-dark/70 max-w-md font-bold">Reserva en línea y elige a tu barbero favorito.</p>
            </div>
            <Link href="/reservar" passHref>
              <a className="bg-dark text-white px-10 py-5 font-black text-xs tracking-ultra hover:bg-zinc-800 transition-colors shrink-0">
                RESERVAR AHORA
              </a>
            </Link>
          </div>
        </section>

        <Testimonials />

        {/* Location Section */}
        <section className="py-24 bg-dark">
          <div className="container mx-auto px-6">
             <div className="flex flex-col items-center mb-16 text-center">
              <span className="text-gold text-[10px] tracking-ultra mb-4">Ubicación</span>
              <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">
                Encuéntranos en <span className="italic text-gold">San Fernando</span>
              </h2>
              <p className="text-white/40 mt-4">Rancagua 759, San Fernando, Chile</p>
            </div>
            <div className="w-full h-96 bg-white/5 border border-white/5 rounded-2xl overflow-hidden filter grayscale hover:grayscale-0 transition-all duration-700">
              <iframe
                width="100%"
                height="100%"
                style={{ border: 0, display: 'block' }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=Rancagua+759,San+Fernando,Chile&language=es&zoom=16`}
              />
            </div>
          </div>
        </section>
      </main>
    </Layout>
  )
}

export const getServerSideProps: GetServerSideProps = async () => {
  try {
    const servicios = await chamosSupabase.getServicios(true)
    const featured = (servicios || []).slice(0, 3)
    return { props: { servicios: JSON.parse(JSON.stringify(featured)) } }
  } catch (error) {
    console.error('Error fetching services for home:', error)
    return { props: { servicios: [] } }
  }
}

export default HomePage
