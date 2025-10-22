'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import styles from './Navigation.module.css'

interface SocialLink {
  plataforma: string
  url: string
  activo: boolean
}

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([])

  useEffect(() => {
    // Cargar enlaces sociales
    const loadSocialLinks = async () => {
      try {
        const response = await fetch('/api/configuracion/social')
        if (response.ok) {
          const data = await response.json()
          setSocialLinks(data.data || [])
        }
      } catch (error) {
        console.error('Error cargando enlaces sociales:', error)
      }
    }

    loadSocialLinks()

    // Scroll handler
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const getSocialIcon = (plataforma: string) => {
    const icons: { [key: string]: string } = {
      'instagram': 'fab fa-instagram',
      'facebook': 'fab fa-facebook-f',
      'whatsapp': 'fab fa-whatsapp',
      'tiktok': 'fab fa-tiktok',
      'youtube': 'fab fa-youtube',
      'twitter': 'fab fa-twitter'
    }
    return icons[plataforma.toLowerCase()] || 'fas fa-link'
  }

  return (
    <>
      <nav className={`${styles.nav} ${isScrolled ? styles.scrolled : ''}`}>
        <div className="container">
          <div className={styles.navContent}>
            {/* Logo */}
            <Link href="/" className={styles.logo}>
              <Image
                src="/images/logo.png"
                alt="Chamos Barber"
                width={40}
                height={40}
                priority
              />
              <span>Chamos Barber</span>
            </Link>

            {/* Navigation Links - Desktop */}
            <div className={styles.navLinks}>
              <Link href="/" className={styles.navLink}>
                <i className="fas fa-home"></i> Inicio
              </Link>
              <Link href="/servicios" className={styles.navLink}>
                <i className="fas fa-cut"></i> Servicios
              </Link>
              <Link href="/equipo" className={styles.navLink}>
                <i className="fas fa-users"></i> Equipo
              </Link>
              <Link href="/portfolio" className={styles.navLink}>
                <i className="fas fa-images"></i> Portafolio
              </Link>
              <Link href="/reservar" className={`${styles.navLink} ${styles.reservarBtn}`}>
                <i className="fas fa-calendar-alt"></i> Reservar
              </Link>
            </div>

            {/* Social Links - Desktop */}
            <div className={styles.socialLinks}>
              {socialLinks
                .filter(link => link.activo)
                .slice(0, 3)
                .map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.socialLink}
                  title={link.plataforma}
                >
                  <i className={getSocialIcon(link.plataforma)}></i>
                </a>
              ))}
            </div>

            {/* Mobile Menu Button */}
            <button
              className={styles.mobileMenuButton}
              onClick={toggleMobileMenu}
              aria-label="Abrir menú"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`${styles.mobileMenu} ${isMobileMenuOpen ? styles.open : ''}`}>
        <div className={styles.mobileMenuHeader}>
          <Link href="/" className={styles.mobileLogo} onClick={() => setIsMobileMenuOpen(false)}>
            <Image
              src="/images/logo.png"
              alt="Chamos Barber"
              width={30}
              height={30}
            />
            <span>Chamos Barber</span>
          </Link>
          <button
            className={styles.closeButton}
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Cerrar menú"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className={styles.mobileMenuContent}>
          <Link 
            href="/" 
            className={styles.mobileNavLink}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <i className="fas fa-home"></i> Inicio
          </Link>
          <Link 
            href="/servicios" 
            className={styles.mobileNavLink}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <i className="fas fa-cut"></i> Servicios
          </Link>
          <Link 
            href="/equipo" 
            className={styles.mobileNavLink}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <i className="fas fa-users"></i> Equipo
          </Link>
          <Link 
            href="/portfolio" 
            className={styles.mobileNavLink}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <i className="fas fa-images"></i> Portafolio
          </Link>
          <Link 
            href="/reservar" 
            className={`${styles.mobileNavLink} ${styles.mobileReservarBtn}`}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <i className="fas fa-calendar-alt"></i> Reservar Cita
          </Link>

          {/* Social Links Mobile */}
          <div className={styles.mobileSocialLinks}>
            <h4>Síguenos</h4>
            <div className={styles.mobileSocialGrid}>
              {socialLinks
                .filter(link => link.activo)
                .map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.mobileSocialLink}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <i className={getSocialIcon(link.plataforma)}></i>
                  <span>{link.plataforma}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className={styles.mobileMenuOverlay}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  )
}