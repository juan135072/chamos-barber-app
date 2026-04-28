import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Layout from '../components/Layout'
import TeamMarquee from '../components/ui/TeamMarquee'
import { CalendarPlus, MapPin, Users, Award } from 'lucide-react'

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

      {/* Información adicional - Liquid Glass Design */}
      <section className="relative overflow-hidden bg-[#080808] py-24 md:py-32">
        {/* Decorative Orbs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold/5 blur-[120px] rounded-full pointer-events-none z-0" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-white/5 blur-[120px] rounded-full pointer-events-none z-0" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white mb-6">
              Experiencia y <br className="md:hidden" />
              <span className="italic font-serif font-normal bg-gradient-to-r from-gold to-yellow-300 bg-clip-text text-transparent">Profesionalismo</span>
            </h2>
            <p className="text-lg text-white/60 leading-relaxed font-medium">
              En Chamos Barber combinamos la calidez y técnica venezolana con la experiencia chilena. 
              Nuestro equipo multicultural aporta diversidad de estilos y técnicas, desde cortes clásicos 
              hasta las últimas tendencias urbanas. Cada barbero trae su propia especialidad y pasión por el oficio.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Stats Cards - Glassmorphism */}
            <div className="group bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 text-center backdrop-blur-xl hover:bg-white/[0.04] transition-all duration-500">
              <div className="mx-auto w-16 h-16 bg-gold/10 rounded-2xl flex items-center justify-center mb-6 text-gold group-hover:scale-110 transition-transform duration-500">
                <MapPin className="w-8 h-8" />
              </div>
              <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-gold to-yellow-500 mb-2">
                8+
              </div>
              <div className="text-white/60 font-semibold uppercase tracking-widest text-sm">
                Años en Chile
              </div>
            </div>

            <div className="group bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 text-center backdrop-blur-xl hover:bg-white/[0.04] transition-all duration-500">
              <div className="mx-auto w-16 h-16 bg-gold/10 rounded-2xl flex items-center justify-center mb-6 text-gold group-hover:scale-110 transition-transform duration-500">
                <Users className="w-8 h-8" />
              </div>
              <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-gold to-yellow-500 mb-2">
                800+
              </div>
              <div className="text-white/60 font-semibold uppercase tracking-widest text-sm">
                Clientes Fieles
              </div>
            </div>

            <div className="group bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 text-center backdrop-blur-xl hover:bg-white/[0.04] transition-all duration-500">
              <div className="mx-auto w-16 h-16 bg-gold/10 rounded-2xl flex items-center justify-center mb-6 text-gold group-hover:scale-110 transition-transform duration-500">
                <Award className="w-8 h-8" />
              </div>
              <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-gold to-yellow-500 mb-2">
                100%
              </div>
              <div className="text-white/60 font-semibold uppercase tracking-widest text-sm">
                Profesionalismo
              </div>
            </div>
          </div>

          <div className="mt-20 text-center">
            <Link
              href="/reservar"
              className="relative group inline-flex overflow-hidden rounded-2xl bg-gradient-to-br from-gold to-[#a88647] p-[1px] shrink-0"
            >
              <div className="relative bg-[#080808] px-10 py-5 rounded-2xl transition-colors duration-300 group-hover:bg-transparent flex items-center gap-3">
                <CalendarPlus className="w-5 h-5 text-gold group-hover:text-dark transition-colors" />
                <span className="relative z-10 text-white font-black tracking-widest text-sm uppercase group-hover:text-dark transition-colors">
                  Reservar con Nuestro Equipo
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  )
}

export default EquipoPage