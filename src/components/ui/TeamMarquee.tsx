import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Marquee } from './Marquee'
import { CalendarPlus, Star } from 'lucide-react'

interface TeamMember {
  id: string
  slug?: string
  nombre: string
  especialidades?: string[] | null
  imagen_url?: string
  foto_url?: string
}

interface TeamMarqueeProps {
  members: TeamMember[]
  loading?: boolean
}

function getImageUrl(url?: string): string {
  if (!url) return 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&w=400&h=500&q=80'
  if (url.startsWith('http')) return url
  return `/images/barberos/${url}`
}

function getRole(member: TeamMember): string {
  const esp = member.especialidades
  if (esp && esp.length > 0) return esp.slice(0, 2).join(' · ')
  return 'Barbero Profesional'
}

export default function TeamMarquee({ members, loading = false }: TeamMarqueeProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 bg-[#080808]">
        <div className="h-12 w-12 rounded-full border-2 border-gold border-t-transparent animate-spin" />
      </div>
    )
  }

  // Fallback data shown while API loads or if no members yet
  const displayMembers: TeamMember[] = members.length > 0 ? members : [
    { id: '1', nombre: 'Nuestro Equipo', especialidades: ['Barberos Profesionales'] },
  ]

  return (
    <section className="relative w-full overflow-hidden bg-[#080808] py-16 md:py-28">
      {/* Liquid Glass Background Orbs */}
      <div className="absolute top-[20%] left-0 w-[400px] h-[400px] bg-gold/5 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-[20%] right-0 w-[400px] h-[400px] bg-white/5 blur-[120px] rounded-full pointer-events-none z-0" />

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Header */}
        <div className="mx-auto mb-20 flex max-w-4xl flex-col items-center px-6 text-center lg:px-0">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl mb-8">
            <Star className="w-3.5 h-3.5 text-gold fill-gold" />
            <span className="text-white/80 text-[10px] md:text-xs font-semibold tracking-[0.2em] uppercase">Conoce al equipo</span>
            <Star className="w-3.5 h-3.5 text-gold fill-gold" />
          </div>

          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-white mb-6">
            Nuestros <br className="md:hidden" />
            <span className="italic font-serif font-normal bg-gradient-to-r from-gold to-yellow-300 bg-clip-text text-transparent">Barberos</span>
          </h1>

          <p className="max-w-2xl text-white/60 text-lg md:text-xl font-medium tracking-wide">
            Barberos venezolanos y chilenos con pasión por el oficio. Cada uno aporta
            su estilo único para que salgas impecable.
          </p>
        </div>

        {/* Marquee */}
        <div className="relative w-full">
          {/* Fade-out edges - ajustado al bg #080808 */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 z-10 h-full w-24 md:w-40"
            style={{ background: 'linear-gradient(to right, #080808, transparent)' }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 right-0 z-10 h-full w-24 md:w-40"
            style={{ background: 'linear-gradient(to left, #080808, transparent)' }}
          />

          <Marquee className="[--gap:2rem] [--duration:35s]" pauseOnHover>
            {displayMembers.map((member) => (
              <Link
                href={`/barbero/${member.slug || member.id}`}
                key={member.id}
                className="group/card flex w-64 shrink-0 flex-col no-underline"
              >
                <div className="relative overflow-hidden rounded-[2rem] bg-white/[0.02] border border-white/5"
                  style={{ height: '380px' }}>
                  <Image
                    alt={member.nombre}
                    src={getImageUrl(member.imagen_url || member.foto_url)}
                    fill
                    className="object-cover grayscale transition-all duration-700 group-hover/card:grayscale-0 group-hover/card:scale-110"
                    sizes="256px"
                  />
                  {/* Info overlay at the bottom with Glassmorphism */}
                  <div
                    className="absolute bottom-0 w-full p-5 bg-gradient-to-t from-[#080808] via-[#080808]/80 to-transparent transition-transform duration-500"
                  >
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 transform translate-y-2 group-hover/card:translate-y-0 transition-transform duration-500">
                      <h3 className="font-black text-white text-lg tracking-wide uppercase">
                        {member.nombre}
                      </h3>
                      <p className="text-gold text-xs mt-1 tracking-widest uppercase font-bold">
                        {getRole(member)}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </Marquee>
        </div>

        {/* Bottom CTA */}
        <div className="mx-auto mt-24 max-w-3xl px-6 text-center lg:px-0">
          <p className="mb-10 text-lg md:text-xl text-white/70 leading-relaxed font-medium">
            Más de <strong className="text-gold font-black">8 años</strong> combinando técnica
            venezolana y experiencia chilena. Cada corte, una obra de arte.
          </p>
          
          <Link
            href="/reservar"
            className="relative group inline-flex overflow-hidden rounded-2xl bg-gradient-to-br from-gold to-[#a88647] p-[1px] shrink-0"
          >
            <div className="relative bg-[#080808] px-10 py-5 rounded-2xl transition-colors duration-300 group-hover:bg-transparent flex items-center gap-3">
              <CalendarPlus className="w-5 h-5 text-gold group-hover:text-dark transition-colors" />
              <span className="relative z-10 text-white font-black tracking-widest text-sm uppercase group-hover:text-dark transition-colors">
                Reservar con el Equipo
              </span>
            </div>
          </Link>
        </div>
      </div>
    </section>
  )
}
