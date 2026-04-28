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
        <section className="py-24 relative overflow-hidden bg-[#080808] mt-12">
          {/* Liquid glowing background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-full bg-gold/10 blur-[120px] pointer-events-none rounded-full" />
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
          <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

          <div className="container mx-auto px-6 relative z-10 flex flex-col md:flex-row items-center justify-between gap-12 bg-white/[0.02] border border-white/5 backdrop-blur-3xl p-12 md:p-16 rounded-[2rem] shadow-2xl">
            <div>
              <h2 className="text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter text-white mb-4 leading-none">
                ¿Listo para tu <br/>
                <span className="italic font-serif font-normal bg-gradient-to-r from-gold to-yellow-300 bg-clip-text text-transparent">próximo look?</span>
              </h2>
              <p className="text-white/60 max-w-md font-medium text-lg">Reserva en línea en segundos y asegura tu espacio con los mejores.</p>
            </div>
            <Link href="/reservar" className="relative group overflow-hidden rounded-2xl bg-gradient-to-br from-gold to-[#a88647] p-[1px] shrink-0">
              <div className="relative bg-[#080808] px-12 py-6 rounded-2xl transition-colors duration-300 group-hover:bg-transparent">
                <span className="relative z-10 text-white font-black tracking-widest text-sm uppercase group-hover:text-dark transition-colors">Agendar Cita</span>
              </div>
            </Link>
          </div>
        </section>

        <Testimonials />

        {/* Location Section */}
        <section className="py-32 relative bg-[#080808] overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold/5 blur-[150px] rounded-full pointer-events-none" />
          
          <div className="container mx-auto px-6 relative z-10">
             <div className="flex flex-col items-center mb-20 text-center">
              <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-xl mb-6">
                <span className="text-gold text-[10px] tracking-[0.2em] font-bold uppercase">Nuestra Casa</span>
              </div>
              <h2 className="text-5xl md:text-6xl font-black uppercase tracking-tighter text-white">
                El centro de <span className="italic font-serif font-normal bg-gradient-to-r from-gold to-yellow-300 bg-clip-text text-transparent">San Fernando</span>
              </h2>
              <p className="text-white/50 mt-6 text-lg max-w-lg">Rancagua 759, San Fernando, Chile. <br/> Ven a vivir la experiencia Chamos.</p>
            </div>
            
            <div className="relative w-full h-[500px] rounded-[2rem] overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-transparent to-transparent z-10 pointer-events-none" />
              <div className="absolute inset-0 border border-white/10 rounded-[2rem] z-20 pointer-events-none" />
              <iframe
                width="100%"
                height="100%"
                style={{ border: 0, display: 'block' }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                className="filter grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000 ease-in-out"
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
