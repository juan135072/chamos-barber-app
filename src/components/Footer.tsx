import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Share2, Camera, Music2, MapPin, Phone, Mail } from 'lucide-react'
import { Logo } from './shared/Logo'

const Footer: React.FC = () => {
  const [socialLinks, setSocialLinks] = useState({
    facebook: 'https://web.facebook.com/people/Chamos-Barberia/61553216854694/',
    instagram: 'https://www.instagram.com/chamosbarber_shop/?hl=es-la',
    twitter: '',
    youtube: '',
    tiktok: ''
  })

  useEffect(() => {
    // Cargar configuración de redes sociales
    const loadSocialLinks = async () => {
      try {
        const response = await fetch('/api/sitio-configuracion')
        if (response.ok) {
          const data = await response.json()
          if (data.length > 0) {
            setSocialLinks(data[0])
          }
        }
      } catch (error) {
        console.error('Error loading social links:', error)
      }
    }

    loadSocialLinks()
  }, [])

  return (
    <footer className="bg-charcoal pt-24 pb-12 border-t border-white/5">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-4 gap-12 mb-20">
          <div className="lg:col-span-2">
            <div className="mb-8">
              <Logo size="md" withText={true} />
            </div>
            <p className="text-white/30 max-w-sm mb-8 leading-relaxed text-xs uppercase tracking-wider">
              La mejor experiencia de barbería en San Fernando, Chile. Estilo, calidad y tradición en cada corte.
            </p>
            <div className="flex gap-4">
              {socialLinks.facebook && (
                <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-gold hover:border-gold transition-all">
                  <Share2 className="w-4 h-4" />
                </a>
              )}
              {socialLinks.instagram && (
                <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-gold hover:border-gold transition-all">
                  <Camera className="w-4 h-4" />
                </a>
              )}
              {socialLinks.tiktok && (
                <a href={socialLinks.tiktok} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-gold hover:border-gold transition-all">
                  <Music2 className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-[10px] tracking-ultra text-gold mb-8 uppercase">Contacto</h4>
            <ul className="space-y-4">
              <li>
                <div className="flex items-center gap-3 text-white/40 text-[10px] uppercase tracking-widest">
                  <MapPin className="w-4 h-4 text-gold" />
                  San Fernando, Chile
                </div>
              </li>
              <li>
                <div className="flex items-center gap-3 text-white/40 text-[10px] uppercase tracking-widest">
                  <Phone className="w-4 h-4 text-gold" />
                  +56 9 8358 8553
                </div>
              </li>
              <li>
                <div className="flex items-center gap-3 text-white/40 text-[10px] uppercase tracking-widest hover:text-gold transition-colors">
                  <Mail className="w-4 h-4 text-gold" />
                  <a href="mailto:contacto@chamosbarber.com">contacto@chamosbarber.com</a>
                </div>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] tracking-ultra text-gold mb-8 uppercase">Horarios del Estudio</h4>
            <ul className="space-y-4 text-[10px] tracking-widest uppercase font-bold">
              <li className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/20">Lun — Vie</span>
                <span className="text-white">10:00 — 20:30</span>
              </li>
              <li className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/20">Sábado</span>
                <span className="text-white">10:00 — 21:00</span>
              </li>
              <li className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/20">Domingo</span>
                <span className="text-gold italic">Cerrado</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-[9px] font-bold text-white/20 uppercase tracking-[0.2em]">
          <p>© 2025 Chamos Barber. Creado por Juan Díaz. Todos los derechos reservados.</p>
          <div className="flex gap-8">
            <Link href="/politicas-privacidad" passHref>
              <span className="hover:text-gold transition-colors cursor-pointer">Políticas de Privacidad</span>
            </Link>
            <Link href="/terminos-condiciones" passHref>
              <span className="hover:text-gold transition-colors cursor-pointer">Términos y Condiciones</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer