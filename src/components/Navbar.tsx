import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { motion } from 'motion/react'
import { Menu, X } from 'lucide-react'
import { Logo } from './shared/Logo'

// motion.create(Link) — API moderna de Framer Motion para animar componentes externos
const MotionLink = motion.create(Link)

interface NavbarProps {
  transparent?: boolean
}

const Navbar: React.FC<NavbarProps> = ({ transparent = false }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { name: 'Inicio',        href: '/' },
    { name: 'Servicios',     href: '/servicios' },
    { name: 'Equipo',        href: '/equipo' },
    { name: 'Consultar Cita', href: '/consultar' },
  ]

  const navClasses = `fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
    scrolled ? 'py-4 glass-nav' : transparent ? 'py-8 bg-transparent' : 'py-8 bg-dark'
  }`

  return (
    <nav className={navClasses}>
      <div className="container mx-auto px-6 flex justify-between items-center">
        {/* Logo */}
        <MotionLink
          href="/"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="cursor-pointer"
        >
          <Logo size="sm" withText={true} />
        </MotionLink>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-12">
          {navLinks.map((link, i) => (
            <MotionLink
              key={link.name}
              href={link.href}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`text-white/40 hover-dynamic transition-colors text-[10px] tracking-ultra ${
                router.pathname === link.href ? 'active-dynamic' : ''
              }`}
            >
              {link.name}
            </MotionLink>
          ))}
          <MotionLink
            href="/reservar"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="border px-6 py-2 text-[10px] tracking-ultra transition-all active:scale-95 inline-block btn-reservar-dynamic"
          >
            Reservar
          </MotionLink>
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden text-white" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-0 w-full border-b border-white/5 p-8 flex flex-col gap-6 md:hidden"
          style={{ backgroundColor: 'var(--tenant-bg, #0a0a0a)' }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className={`text-xl font-bold tracking-widest uppercase ${
                router.pathname === link.href ? 'active-dynamic-mobile' : 'text-white'
              }`}
            >
              {link.name}
            </Link>
          ))}
          <Link
            href="/reservar"
            onClick={() => setIsOpen(false)}
            className="font-bold py-4 text-xs tracking-ultra text-center inline-block w-full"
            style={{ backgroundColor: 'var(--tenant-primary, #d4af37)', color: 'var(--tenant-bg, #0a0a0a)' }}
          >
            Reservar
          </Link>
        </motion.div>
      )}

      {/* Dynamic CSS styles for hovering and active states that depend on CSS variables */}
      <style jsx global>{`
        .hover-dynamic:hover {
          color: var(--tenant-primary, #d4af37) !important;
        }
        .active-dynamic {
          color: var(--tenant-primary, #d4af37) !important;
        }
        .active-dynamic-mobile {
          color: var(--tenant-primary, #d4af37) !important;
        }
        .btn-reservar-dynamic {
          border-color: var(--tenant-primary, #d4af37);
          color: var(--tenant-primary, #d4af37);
        }
        .btn-reservar-dynamic:hover {
          background-color: var(--tenant-primary, #d4af37);
          color: var(--tenant-bg, #0a0a0a);
        }
      `}</style>
    </nav>
  )
}

export default Navbar
