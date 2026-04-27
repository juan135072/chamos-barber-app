import { motion, useScroll, useTransform } from "motion/react";
import { Menu, X, Scissors } from "lucide-react";
import { useState, useEffect } from "react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Servicios", href: "#servicios" },
    { name: "Testimonios", href: "#testimonios" },
    { name: "Contacto", href: "#contacto" },
  ];

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${scrolled ? "py-4 glass-nav" : "py-8"}`}>
      <div className="container mx-auto px-6 flex justify-between items-center">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 group cursor-pointer"
        >
          <div className="w-10 h-10 bg-gold rounded flex items-center justify-center text-dark transform group-hover:rotate-12 transition-transform">
            <Scissors className="w-5 h-5" />
          </div>
          <span className="text-2xl font-black tracking-widest text-white">ELYSIAN<span className="text-gold">.</span></span>
        </motion.div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-16">
          {navLinks.map((link, i) => (
            <motion.a
              key={link.name}
              href={link.href}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="text-white/40 hover:text-gold transition-colors text-[10px] tracking-ultra"
            >
              {link.name}
            </motion.a>
          ))}
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="border border-gold text-gold hover:bg-gold hover:text-dark px-6 py-2 text-[10px] tracking-ultra transition-all active:scale-95"
          >
            Reservar
          </motion.button>
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
            <a key={link.name} href={link.href} onClick={() => setIsOpen(false)} className="text-xl font-bold tracking-widest uppercase">
              {link.name}
            </a>
          ))}
          <button className="bg-gold text-dark font-bold py-4 text-xs tracking-ultra">
            Reservar
          </button>
        </motion.div>
      )}
    </nav>
  );
}
