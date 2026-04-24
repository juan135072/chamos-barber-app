import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Marquee } from './Marquee'

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
      <div className="flex items-center justify-center py-24">
        <div className="h-12 w-12 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin" />
      </div>
    )
  }

  // Fallback data shown while API loads or if no members yet
  const displayMembers: TeamMember[] = members.length > 0 ? members : [
    { id: '1', nombre: 'Nuestro Equipo', especialidades: ['Barberos Profesionales'] },
  ]

  return (
    <section className="relative w-full overflow-hidden bg-[#121212] py-12 md:py-24">
      {/* Decorative SVG bottom-right — recoloreado al tono dorado */}
      <svg
        aria-hidden="true"
        className="absolute right-0 bottom-0 text-[#2C2C2C] pointer-events-none"
        fill="none"
        height="154"
        viewBox="0 0 460 154"
        width="460"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g clipPath="url(#clip-team-deco)">
          <path
            d="M-87.463 458.432C-102.118 348.092 -77.3418 238.841 -15.0744 188.274C57.4129 129.408 180.708 150.071 351.748 341.128C278.246 -374.233 633.954 380.602 548.123 42.7707"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="40"
          />
        </g>
        <defs>
          <clipPath id="clip-team-deco">
            <rect fill="white" height="154" width="460" />
          </clipPath>
        </defs>
      </svg>

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Header */}
        <div className="mx-auto mb-16 flex max-w-5xl flex-col items-center px-6 text-center lg:px-0">
          {/* Ícono con acento dorado */}
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl text-[#121212]"
            style={{ backgroundColor: '#D4AF37' }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16.051 12.616a1 1 0 0 1 1.909.024l.737 1.452a1 1 0 0 0 .737.535l1.634.256a1 1 0 0 1 .588 1.806l-1.172 1.168a1 1 0 0 0-.282.866l.259 1.613a1 1 0 0 1-1.541 1.134l-1.465-.75a1 1 0 0 0-.912 0l-1.465.75a1 1 0 0 1-1.539-1.133l.258-1.613a1 1 0 0 0-.282-.866l-1.156-1.153a1 1 0 0 1 .572-1.822l1.633-.256a1 1 0 0 0 .737-.535z" />
              <path d="M8 15H7a4 4 0 0 0-4 4v2" />
              <circle cx="10" cy="7" r="4" />
            </svg>
          </div>

          <h2 className="relative mb-4 font-bold text-4xl tracking-tight sm:text-5xl text-[#EAEAEA]">
            Nuestros Barberos
            {/* Decorative zigzag behind the title */}
            <svg
              aria-hidden="true"
              className="absolute -top-2 -right-8 -z-10 w-24 text-[#2C2C2C]"
              fill="currentColor"
              height="86"
              viewBox="0 0 108 86"
              width="108"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M38.8484 16.236L15 43.5793L78.2688 15L18.1218 71L93 34.1172L70.2047 65.2739"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="28"
              />
            </svg>
          </h2>

          <p className="max-w-2xl text-[#EAEAEA]/70">
            Barberos venezolanos y chilenos con pasión por el oficio. Cada uno aporta
            su estilo único para que salgas impecable.
          </p>
        </div>

        {/* Marquee */}
        <div className="relative w-full">
          {/* Fade-out edges — usando el color de fondo del sitio */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 z-10 h-full w-32"
            style={{ background: 'linear-gradient(to right, #121212, transparent)' }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 right-0 z-10 h-full w-32"
            style={{ background: 'linear-gradient(to left, #121212, transparent)' }}
          />

          <Marquee className="[--gap:1.5rem] [--duration:35s]" pauseOnHover>
            {displayMembers.map((member) => (
              <Link
                href={`/barbero/${member.slug || member.id}`}
                key={member.id}
                className="group flex w-56 shrink-0 flex-col no-underline"
              >
                <div className="relative overflow-hidden rounded-2xl bg-[#1A1A1A]"
                  style={{ height: '336px' }}>
                  <Image
                    alt={member.nombre}
                    src={getImageUrl(member.imagen_url || member.foto_url)}
                    fill
                    className="object-cover grayscale transition-all duration-500 group-hover:grayscale-0 group-hover:scale-105"
                    sizes="224px"
                  />
                  {/* Info overlay at the bottom */}
                  <div
                    className="absolute bottom-0 w-full rounded-b-2xl p-3"
                    style={{ background: 'rgba(18,18,18,0.88)' }}
                  >
                    <h3 className="font-semibold text-[#EAEAEA] leading-tight">
                      {member.nombre}
                    </h3>
                    <p className="text-[#D4AF37] text-xs mt-0.5 leading-snug">
                      {getRole(member)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </Marquee>
        </div>

        {/* Bottom CTA */}
        <div className="mx-auto mt-16 max-w-2xl px-6 text-center lg:px-0">
          <p className="mb-8 text-lg text-[#EAEAEA]/80 leading-relaxed">
            Más de <strong className="text-[#D4AF37]">8 años</strong> combinando técnica
            venezolana y experiencia chilena. Cada corte, una obra de arte.
          </p>
          <Link
            href="/reservar"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-lg font-semibold text-[#121212] transition-all hover:-translate-y-0.5 hover:brightness-90"
            style={{ backgroundColor: '#D4AF37' }}
          >
            <i className="fas fa-calendar-plus" />
            Reservar con el Equipo
          </Link>
        </div>
      </div>
    </section>
  )
}
