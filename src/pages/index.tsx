import React, { useRef, useState, useEffect } from 'react'
import { GetServerSideProps } from 'next'
import Link from 'next/link'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import Layout from '../components/Layout'
import Preloader from '../components/Preloader'
import { chamosSupabase } from '@/lib/supabase-helpers'
import { getServiceImage } from '../lib/service-utils'
import dynamic from 'next/dynamic'

const SplineScene = dynamic(() => import('@splinetool/react-spline'), {
  ssr: false,
  loading: () => <div style={{ opacity: 0 }} />
})

gsap.registerPlugin(ScrollTrigger, SplitText)

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

const MARQUEE_ITEMS = ['CORTES DE CABELLO', 'BARBAS', 'TRATAMIENTOS', 'ESTILO', 'TRADICIÓN', 'ARTESANÍA', 'SAN FERNANDO']

const DEFAULT_SERVICES: Service[] = [
  { id: 'd1', nombre: 'Corte de Cabello', descripcion: 'Fade, undercut, texturizado y más. Cada corte adaptado a tu rostro y estilo personal.', precio: 0, categoria: 'cortes', imagen_url: null },
  { id: 'd2', nombre: 'Barba y Afeitado', descripcion: 'Perfilado de barba y afeitado clásico con toalla caliente. Una experiencia de barbería tradicional.', precio: 0, categoria: 'barbas', imagen_url: null },
  { id: 'd3', nombre: 'Tratamientos', descripcion: 'Limpieza facial y masajes capilares para una experiencia completa de cuidado premium.', precio: 0, categoria: 'tratamientos', imagen_url: null },
]

const HomePage: React.FC<HomePageProps> = ({ servicios }) => {
  const [showPreloader, setShowPreloader] = useState(true)
  const [isFirstVisit, setIsFirstVisit] = useState(true)

  const containerRef = useRef<HTMLDivElement>(null)
  const heroTitleRef = useRef<HTMLHeadingElement>(null)
  const heroEyebrowRef = useRef<HTMLDivElement>(null)
  const heroSubRef = useRef<HTMLParagraphElement>(null)
  const heroCtaRef = useRef<HTMLDivElement>(null)
  const heroLineRef = useRef<HTMLDivElement>(null)
  const ctaSectionRef = useRef<HTMLElement>(null)
  const scheduleSectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const hasVisited = sessionStorage.getItem('hasVisitedHome')
    if (hasVisited) {
      setShowPreloader(false)
      setIsFirstVisit(false)
    } else {
      sessionStorage.setItem('hasVisitedHome', 'true')
    }
  }, [])

  // Hero entrance animation
  useGSAP(() => {
    if (showPreloader) return

    const split = heroTitleRef.current ? new SplitText(heroTitleRef.current, { type: 'lines' }) : null

    const tl = gsap.timeline({ delay: 0.15 })

    if (heroEyebrowRef.current) {
      tl.fromTo(
        heroEyebrowRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }
      )
    }
    
    if (split) {
      tl.fromTo(
        split.lines,
        { opacity: 0, y: 48 },
        { opacity: 1, y: 0, duration: 1, stagger: 0.1, ease: 'expo.out' },
        '-=0.4'
      )
    }
    
    if (heroLineRef.current) {
      tl.fromTo(
        heroLineRef.current,
        { scaleX: 0 },
        { scaleX: 1, duration: 0.9, ease: 'expo.out', transformOrigin: 'left center' },
        '-=0.5'
      )
    }
    
    if (heroSubRef.current) {
      tl.fromTo(
        heroSubRef.current,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' },
        '-=0.5'
      )
    }
    
    if (heroCtaRef.current) {
      tl.fromTo(
        heroCtaRef.current,
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
        '-=0.45'
      )
    }

    return () => {
      if (split) split.revert()
    }
  }, { dependencies: [showPreloader], scope: containerRef })

  // Services scroll reveal
  useGSAP(() => {
    if (showPreloader) return

    gsap.utils.toArray<HTMLElement>('.service-row-card').forEach((card) => {
      gsap.fromTo(
        card,
        { opacity: 0, y: 56 },
        {
          opacity: 1, y: 0, duration: 0.95, ease: 'power3.out',
          scrollTrigger: { trigger: card, start: 'top 82%', toggleActions: 'play none none none' },
        }
      )
    })

    gsap.utils.toArray<HTMLElement>('.service-img-reveal').forEach((img) => {
      gsap.fromTo(
        img,
        { clipPath: 'inset(0 100% 0 0)' },
        {
          clipPath: 'inset(0 0% 0 0)', duration: 1.1, ease: 'expo.out',
          scrollTrigger: { trigger: img, start: 'top 78%' },
        }
      )
    })
  }, { dependencies: [showPreloader, servicios], scope: containerRef })

  // CTA word-by-word reveal
  useGSAP(() => {
    if (showPreloader) return
    const ctaTitle = ctaSectionRef.current?.querySelector<HTMLElement>('.cta-main-title')
    if (!ctaTitle) return
    const split = new SplitText(ctaTitle, { type: 'words' })
    gsap.fromTo(
      split.words,
      { opacity: 0, y: 28 },
      {
        opacity: 1, y: 0, duration: 0.75, stagger: 0.055, ease: 'power3.out',
        scrollTrigger: { trigger: ctaSectionRef.current, start: 'top 72%' },
      }
    )
    return () => split.revert()
  }, { dependencies: [showPreloader], scope: containerRef })

  // Schedule items stagger
  useGSAP(() => {
    if (showPreloader) return
    gsap.fromTo(
      '.schedule-v2-item',
      { opacity: 0, y: 36 },
      {
        opacity: 1, y: 0, duration: 0.65, stagger: 0.12, ease: 'power2.out',
        scrollTrigger: { trigger: scheduleSectionRef.current, start: 'top 75%' },
      }
    )
  }, { dependencies: [showPreloader], scope: containerRef })

  const handlePreloaderComplete = () => setShowPreloader(false)

  if (showPreloader && isFirstVisit) {
    return <Preloader onComplete={handlePreloaderComplete} duration={3000} />
  }

  const displayServices = servicios.length > 0 ? servicios.slice(0, 3) : DEFAULT_SERVICES

  return (
    <Layout
      title="Chamos Barber - Barbería en San Fernando, Chile"
      description="Tu barbería de confianza en San Fernando, Chile. Cortes modernos y clásicos con estilo profesional."
      transparentNav={true}
    >
      <div ref={containerRef}>

        {/* ── HERO ─────────────────────────────────────────────── */}
        <section className="hv2-hero">
          <div className="hv2-hero-noise" aria-hidden="true" />
          <div className="hv2-hero-gradient" aria-hidden="true" />
          
          <div className="hv2-hero-spline">
            <SplineScene 
              scene="https://prod.spline.design/p7YYyOhpFX9Wm2ZH/scene.splinecode" 
              onLoad={(spline: any) => {
                // Remove the Spline logo if it's injected inside the container
                setTimeout(() => {
                  try {
                    // 1. Shadow DOM check (Spline often uses this)
                    const splineWrapper = document.querySelector('.hv2-hero-spline > div');
                    if (splineWrapper && splineWrapper.shadowRoot) {
                      const logoContainer = splineWrapper.shadowRoot.querySelector('#logo') || splineWrapper.shadowRoot.querySelector('a');
                      if (logoContainer) (logoContainer as HTMLElement).style.display = 'none';
                    }

                    // 2. Regular DOM sibling check
                    const canvas = document.querySelector('.hv2-hero-spline canvas');
                    if (canvas && canvas.nextElementSibling) {
                      const logo = canvas.nextElementSibling as HTMLElement;
                      if (logo && logo.tagName === 'A') logo.style.display = 'none';
                    }
                    
                    // 3. Fallback global search
                    document.querySelectorAll('a').forEach(a => {
                      if (a.href && a.href.includes('spline.design')) {
                        a.style.display = 'none';
                      }
                    });
                  } catch(e) {}
                }, 100);
              }}
            />
          </div>

          {/* Contenido reposicionado para no solapar el 3D, manteniendo accesibilidad */}
          <div className="hv2-hero-content" style={{ pointerEvents: 'none', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: '15vh' }}>
            <h1 className="sr-only">Maestría en cada corte</h1>
            <p className="sr-only">Donde la tradición y el estilo convergen. Tu barbería de confianza desde el primer día.</p>

            <div ref={heroCtaRef} className="hv2-hero-cta" style={{ pointerEvents: 'auto', justifyContent: 'center' }}>
              <Link href="/reservar" className="hv2-btn-gold">
                Reservar Cita
              </Link>
              <Link href="/equipo" className="hv2-btn-outline">
                Nuestro Equipo
              </Link>
            </div>
          </div>

          <div className="hv2-scroll-hint" aria-hidden="true">
            <span>Scroll</span>
            <div className="hv2-scroll-bar" />
          </div>
        </section>

        {/* ── MARQUEE ──────────────────────────────────────────── */}
        <div className="hv2-marquee" aria-hidden="true">
          <div className="hv2-marquee-track">
            {[0, 1].map(n => (
              <div key={n} className="hv2-marquee-row">
                {MARQUEE_ITEMS.map(item => (
                  <React.Fragment key={item}>
                    <span className="hv2-marquee-item">{item}</span>
                    <span className="hv2-marquee-dot">·</span>
                  </React.Fragment>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ── SERVICES ─────────────────────────────────────────── */}
        <section className="hv2-services">
          <div className="hv2-section-header">
            <span className="hv2-label">01 — Servicios</span>
            <h2 className="hv2-section-title">
              Nuestros<br /><em>Servicios</em>
            </h2>
            <Link href="/servicios" className="hv2-header-link">
              Ver todos →
            </Link>
          </div>

          <div className="hv2-services-list">
            {displayServices.map((svc, i) => (
              <Link
                key={svc.id}
                href={`/reservar?servicio=${svc.id}`}
                className="service-row-card hv2-service-card"
              >
                <div className={`hv2-service-inner${i % 2 === 1 ? ' reversed' : ''}`}>
                  <div className="service-img-reveal hv2-service-img-wrap">
                    <img
                      src={svc.imagen_url || getServiceImage(svc.categoria, svc.nombre)}
                      alt={svc.nombre}
                      className="hv2-service-img"
                    />
                  </div>
                  <div className="hv2-service-text">
                    <span className="hv2-service-num">0{i + 1}</span>
                    <h3 className="hv2-service-name">{svc.nombre}</h3>
                    <p className="hv2-service-desc">
                      {svc.descripcion || 'Servicio profesional con la calidad garantizada de Chamos Barber.'}
                    </p>
                    <span className="hv2-service-action">Reservar este servicio →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── CTA BAND ─────────────────────────────────────────── */}
        <section ref={ctaSectionRef} className="hv2-cta-band">
          <div className="hv2-cta-bg-word" aria-hidden="true">CHAMOS</div>
          <div className="hv2-cta-inner">
            <h2 className="cta-main-title hv2-cta-title">
              ¿Listo para tu<br /><em>próximo look?</em>
            </h2>
            <p className="hv2-cta-sub">Reserva en línea y elige a tu barbero favorito.</p>
            <Link href="/reservar" className="hv2-btn-gold hv2-btn-gold--lg">
              Reservar Ahora
            </Link>
          </div>
        </section>

        {/* ── SCHEDULE ─────────────────────────────────────────── */}
        <section ref={scheduleSectionRef} className="hv2-schedule">
          <div className="hv2-schedule-inner">
            <div className="hv2-schedule-head">
              <span className="hv2-label">02 — Horarios</span>
              <h2 className="hv2-section-title">
                Cuándo<br /><em>Visitarnos</em>
              </h2>
            </div>
            <div className="hv2-schedule-grid">
              <div className="schedule-v2-item">
                <span className="sv2-day">Lun — Vie</span>
                <span className="sv2-divider" />
                <span className="sv2-time">10:00 – 20:30</span>
              </div>
              <div className="schedule-v2-item">
                <span className="sv2-day">Sábado</span>
                <span className="sv2-divider" />
                <span className="sv2-time">10:00 – 21:00</span>
              </div>
              <div className="schedule-v2-item sv2--closed">
                <span className="sv2-day">Domingo</span>
                <span className="sv2-divider" />
                <span className="sv2-time">Cerrado</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── LOCATION ─────────────────────────────────────────── */}
        <section className="hv2-location">
          <div className="hv2-location-head">
            <span className="hv2-label">03 — Ubicación</span>
            <h2 className="hv2-section-title">
              Encuéntranos en<br /><em>San Fernando</em>
            </h2>
            <p className="hv2-location-addr">Rancagua 759, San Fernando, Chile</p>
          </div>
          <div className="hv2-map-wrap">
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
        </section>

      </div>
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
