import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

interface NavbarProps {
  transparent?: boolean
}

const Navbar: React.FC<NavbarProps> = ({ transparent = false }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isActive = (path: string) => {
    return router.pathname === path
  }

  const navbarClass = transparent && !scrolled 
    ? 'navbar transparent' 
    : 'navbar'

  return (
    <nav className={navbarClass}>
      <div className="nav-container">
        <Link href="/" className="nav-brand">
          <i className="fas fa-cut"></i>
          <span>Chamos Barber</span>
        </Link>

        <div className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
          <Link href="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
            Inicio
          </Link>
          <Link href="/equipo" className={`nav-link ${isActive('/equipo') ? 'active' : ''}`}>
            Equipo
          </Link>
          <Link href="/reservar" className={`nav-link ${isActive('/reservar') ? 'active' : ''}`}>
            Reservar
          </Link>
          <Link href="/consultar" className={`nav-link ${isActive('/consultar') ? 'active' : ''}`}>
            Consultar Cita
          </Link>
          <Link href="/admin" className={`nav-link ${isActive('/admin') ? 'active' : ''}`}>
            Admin
          </Link>
        </div>

        <div 
          className="hamburger"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </nav>
  )
}

export default Navbar