import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Share2, MapPin, Phone, Mail } from 'lucide-react'
import { Logo } from './shared/Logo'
import { chamosSupabase } from '@/lib/supabase-helpers'
import { useTenant } from '@/context/TenantContext'

// SVG brand icons (lucide-react no incluye iconos de marcas registradas)
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
    <path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.883v2.271h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
  </svg>
)

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
  </svg>
)

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.31 6.31 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.18 8.18 0 004.78 1.52V6.82a4.85 4.85 0 01-1.01-.13z"/>
  </svg>
)

interface Horarios {
  semana: string
  sabado: string
  domingo: string
}

const SOCIAL_LINK_CLASS = "w-10 h-10 rounded bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:border-[var(--tenant-primary)] transition-all"

const Footer: React.FC = () => {
  const { tenant } = useTenant()
  const [socialLinks, setSocialLinks] = useState({
    facebook: 'https://web.facebook.com/people/Chamos-Barberia/61553216854694/',
    instagram: 'https://www.instagram.com/chamosbarber_shop/?hl=es-la',
    tiktok: '',
    whatsapp: '',
  })
  const [horarios, setHorarios] = useState<Horarios>({
    semana: '10:00 — 20:30',
    sabado: '10:00 — 21:00',
    domingo: '',
  })

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const data = await chamosSupabase.getConfiguracion()
        if (!Array.isArray(data)) return

        const cfg: Record<string, string> = {}
        data.forEach((item: any) => { cfg[item.clave] = item.valor || '' })

        setSocialLinks(prev => ({
          facebook:  cfg.facebook_url       || prev.facebook,
          instagram: cfg.instagram_url      || prev.instagram,
          tiktok:    cfg.tiktok_url         || prev.tiktok,
          whatsapp:  cfg.whatsapp_numero    || prev.whatsapp,
        }))

        const apertura = cfg.horario_apertura         || '10:00'
        const cierre   = cfg.horario_cierre           || '20:30'
        const sabAper  = cfg.horario_sabado_apertura  || apertura
        const sabCier  = cfg.horario_sabado_cierre    || cierre
        const domingo  = cfg.horario_domingo          || ''

        setHorarios({
          semana: `${apertura} — ${cierre}`,
          sabado: `${sabAper} — ${sabCier}`,
          domingo,
        })
      } catch (error) {
        console.error('Error loading footer config:', error)
      }
    }

    loadConfig()
  }, [])

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: tenant?.nombre || 'Chamos Barber',
          text: tenant?.descripcion || 'La mejor barbería.',
          url: window.location.origin,
        })
      } catch {
        // usuario canceló
      }
    } else {
      await navigator.clipboard.writeText(window.location.origin)
    }
  }

  return (
    <footer className="bg-charcoal pt-24 pb-12 border-t border-white/5">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-4 gap-12 mb-20">
          <div className="lg:col-span-2">
            <div className="mb-8">
              <Logo size="md" withText={true} />
            </div>
            <p className="text-white/30 max-w-sm mb-8 leading-relaxed text-xs uppercase tracking-wider">
              {tenant?.descripcion || 'La mejor experiencia de barbería en San Fernando, Chile. Estilo, calidad y tradición en cada corte.'}
            </p>
            <div className="flex gap-4 group-icons">
              <style jsx>{`
                .group-icons a:hover, .group-icons button:hover {
                  color: var(--tenant-primary, #d4af37);
                }
              `}</style>
              {socialLinks.facebook && (
                <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className={SOCIAL_LINK_CLASS} title="Facebook">
                  <FacebookIcon />
                </a>
              )}
              {socialLinks.instagram && (
                <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className={SOCIAL_LINK_CLASS} title="Instagram">
                  <InstagramIcon />
                </a>
              )}
              {socialLinks.tiktok && (
                <a href={socialLinks.tiktok} target="_blank" rel="noopener noreferrer" className={SOCIAL_LINK_CLASS} title="TikTok">
                  <TikTokIcon />
                </a>
              )}
              <button onClick={handleShare} className={SOCIAL_LINK_CLASS} title="Compartir">
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <h4 className="text-[10px] tracking-ultra mb-8 uppercase" style={{ color: 'var(--tenant-primary, #d4af37)' }}>Contacto</h4>
            <ul className="space-y-4">
              <li>
                <div className="flex items-center gap-3 text-white/40 text-[10px] uppercase tracking-widest">
                  <MapPin className="w-4 h-4" style={{ color: 'var(--tenant-primary, #d4af37)' }} />
                  {tenant?.direccion || 'San Fernando, Chile'}
                </div>
              </li>
              <li>
                <div className="flex items-center gap-3 text-white/40 text-[10px] uppercase tracking-widest">
                  <Phone className="w-4 h-4" style={{ color: 'var(--tenant-primary, #d4af37)' }} />
                  +56 9 8358 8553
                </div>
              </li>
              <li>
                <div className="flex items-center gap-3 text-white/40 text-[10px] uppercase tracking-widest hover-email transition-colors">
                  <style jsx>{`
                    .hover-email:hover {
                      color: var(--tenant-primary, #d4af37);
                    }
                  `}</style>
                  <Mail className="w-4 h-4" style={{ color: 'var(--tenant-primary, #d4af37)' }} />
                  <a href="mailto:contacto@chamosbarber.com">contacto@chamosbarber.com</a>
                </div>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] tracking-ultra mb-8 uppercase" style={{ color: 'var(--tenant-primary, #d4af37)' }}>Horarios del Estudio</h4>
            <ul className="space-y-4 text-[10px] tracking-widest uppercase font-bold">
              <li className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/20">Lun — Vie</span>
                <span className="text-white">{horarios.semana}</span>
              </li>
              <li className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/20">Sábado</span>
                <span className="text-white">{horarios.sabado}</span>
              </li>
              <li className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/20">Domingo</span>
                {horarios.domingo
                  ? <span className="text-white">{horarios.domingo}</span>
                  : <span className="italic" style={{ color: 'var(--tenant-primary, #d4af37)' }}>Cerrado</span>
                }
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-[9px] font-bold text-white/20 uppercase tracking-[0.2em]">
          <p>© {new Date().getFullYear()} {tenant?.nombre || 'Chamos Barber'}. Creado por Juan Díaz. Todos los derechos reservados.</p>
          <div className="flex gap-8 hover-links">
            <style jsx>{`
              .hover-links a:hover {
                color: var(--tenant-primary, #d4af37);
              }
            `}</style>
            <Link href="/politicas-privacidad" className="transition-colors">
              Políticas de Privacidad
            </Link>
            <Link href="/terminos-condiciones" className="transition-colors">
              Términos y Condiciones
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer