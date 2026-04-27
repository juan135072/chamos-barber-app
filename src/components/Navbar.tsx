import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { motion } from 'motion/react'
import { Menu, X } from 'lucide-react'
import { Logo } from './shared/Logo'

interface NavbarProps {
  transparent?: boolean
}

const Navbar: React.FC<NavbarProps> = ({ transparent = false }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { name: 'Inicio', href: '/' },
    { name: 'Servicios', href: '/servicios' },
    { name: 'Equipo', href: '/equipo' },
    { name: 'Consultar Cita', href: '/consultar' },
  ]

  const navClasses = `fixed top-0 left-0 w-full z-50 transition-all duration-300 ${scrolled ? 'py-4 glass-nav' : (transparent ? 'py-8 bg-transparent' : 'py-8 bg-dark')}`

  return (
    <nav className={navClasses}>
      <div className="container mx-auto px-6 flex justify-between items-center">
        <Link href="/" passHref>
          <motion.a 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="cursor-pointer"
          >
            <Logo size="sm" withText={true} />
          </motion.a>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-12">
          {navLinks.map((link, i) => (
            <Link key={link.name} href={link.href} passHref>
              <motion.a
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`text-white/40 hover:text-gold transition-colors text-[10px] tracking-ultra ${router.pathname === link.href ? 'text-gold' : ''}`}
              >
                {link.name}
              </motion.a>
            </Link>
          ))}
          <Link href="/reservar" passHref>
            <motion.a
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="border border-gold text-gold hover:bg-gold hover:text-dark px-6 py-2 text-[10px] tracking-ultra transition-all active:scale-95 inline-block"
            >
              Reservar
            </motion.a>
          </Link>
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
          className="absolute top-full left-0 w-full bg-dark border-b border-white/5 p-8 flex flex-col gap-6 md:hidden"
        >
          {navLinks.map((link) => (
            <Link key={link.name} href={link.href} passHref>
              <a onClick={() => setIsOpen(false)} className={`text-xl font-bold tracking-widest uppercase ${router.pathname === link.href ? 'text-gold' : 'text-white'}`}>
                {link.name}
              </a>
            </Link>
          ))}
          <Link href="/reservar" passHref>
            <a className="bg-gold text-dark font-bold py-4 text-xs tracking-ultra text-center inline-block w-full">
              Reservar
            </a>
          </Link>
        </motion.div>
      )}
    </nav>
  )
}

export default Navbar