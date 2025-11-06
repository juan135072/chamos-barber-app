import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react'
import type { Database } from '../../lib/database.types'

interface NavbarProps {
  transparent?: boolean
}

const Navbar: React.FC<NavbarProps> = ({ transparent = false }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()
  const session = useSession()
  const supabase = useSupabaseClient<Database>()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Verificar si el usuario actual es admin
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!session?.user?.id) {
        setIsAdmin(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('admin_users')
          .select('rol')
          .eq('id', session.user.id)
          .single()

        if (!error && data && data.rol === 'admin') {
          setIsAdmin(true)
        } else {
          setIsAdmin(false)
        }
      } catch (error) {
        setIsAdmin(false)
      }
    }

    checkAdminRole()
  }, [session, supabase])

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
          {/* Solo mostrar Admin si el usuario tiene rol de admin */}
          {isAdmin && (
            <Link href="/admin" className={`nav-link ${isActive('/admin') ? 'active' : ''}`}>
              Admin
            </Link>
          )}
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