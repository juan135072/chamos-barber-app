import React, { useState, useEffect } from 'react'
import Link from 'next/link'

const Footer: React.FC = () => {
  const [socialLinks, setSocialLinks] = useState({
    facebook: '',
    instagram: '',
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
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>Chamos Barber</h3>
            <p>La mejor experiencia de barbería en Venezuela y Chile</p>
            <p>Estilo, calidad y tradición en cada corte</p>
          </div>

          <div className="footer-section">
            <h3>Contacto</h3>
            <p><i className="fas fa-map-marker-alt"></i> Caracas, Venezuela</p>
            <p><i className="fas fa-phone"></i> +56 9 8358 8553</p>
            <p><i className="fas fa-envelope"></i> info@chamosbarber.com</p>
          </div>

          <div className="footer-section">
            <h3>Horarios</h3>
            <p>Lunes - Viernes: 9:00 AM - 7:00 PM</p>
            <p>Sábados: 8:00 AM - 6:00 PM</p>
            <p>Domingos: 10:00 AM - 4:00 PM</p>
          </div>

          <div className="footer-section">
            <h3>Síguenos</h3>
            <div className="social-links">
              {socialLinks.facebook && (
                <a 
                  href={socialLinks.facebook} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                >
                  <i className="fab fa-facebook-f"></i>
                </a>
              )}
              {socialLinks.instagram && (
                <a 
                  href={socialLinks.instagram} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                >
                  <i className="fab fa-instagram"></i>
                </a>
              )}
              {socialLinks.twitter && (
                <a 
                  href={socialLinks.twitter} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="Twitter"
                >
                  <i className="fab fa-twitter"></i>
                </a>
              )}
              {socialLinks.youtube && (
                <a 
                  href={socialLinks.youtube} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                >
                  <i className="fab fa-youtube"></i>
                </a>
              )}
              {socialLinks.tiktok && (
                <a 
                  href={socialLinks.tiktok} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                >
                  <i className="fab fa-tiktok"></i>
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2024 Chamos Barber. Todos los derechos reservados.</p>
          <div className="footer-links">
            <Link href="/politicas-privacidad">Políticas de Privacidad</Link>
            <span className="separator">•</span>
            <Link href="/terminos-condiciones">Términos y Condiciones</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer