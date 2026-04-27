import React from 'react'
import Link from 'next/link'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { ArrowRight, PlayCircle } from 'lucide-react'

export default function Hero() {
  // Parallax/Tilt setup
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  // Smooth springs for mouse movement
  const mouseXSpring = useSpring(x, { stiffness: 100, damping: 30 })
  const mouseYSpring = useSpring(y, { stiffness: 100, damping: 30 })

  // 3D Rotations
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["15deg", "-15deg"])
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-15deg", "15deg"])
  
  // Z-axis parallax for depth
  const zGlow = useTransform(mouseXSpring, [-0.5, 0.5], [-20, 20])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const xPct = mouseX / width - 0.5
    const yPct = mouseY / height - 0.5
    x.set(xPct)
    y.set(yPct)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  return (
    <section className="relative min-h-[90vh] flex items-center pt-24 overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-gold/5 to-transparent pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-gold/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 mb-8"
            >
              <span className="text-gold text-sm font-bold tracking-[0.4em] uppercase">Est. 2021</span>
            </motion.div>
            
            <h1 className="text-7xl md:text-8xl font-black leading-[0.85] tracking-tighter uppercase mb-8">
              Maestría en<br/><span className="italic text-gold">Cortes</span><br/><span className="text-white/20">Bespoke</span>.
            </h1>
            
            <p className="text-white/40 text-sm max-w-md mb-12 leading-relaxed">
              Donde la tradición y el estilo convergen. Tu barbería de confianza desde el primer día, brindando excelencia en San Fernando.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6">
              <Link href="/reservar" passHref>
                <motion.a 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-gold text-dark px-10 py-4 font-black text-xs tracking-ultra hover:brightness-110 transition-all flex items-center justify-center gap-2 group cursor-pointer"
                >
                  Reservar Ahora
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </motion.a>
              </Link>
              
              <Link href="/equipo" passHref>
                <button className="flex items-center justify-center gap-3 text-white/40 hover:text-white transition-colors group px-6 py-4 text-[10px] tracking-ultra cursor-pointer">
                  <PlayCircle className="w-6 h-6 group-hover:text-gold transition-colors" />
                  <span>Nuestro Equipo</span>
                </button>
              </Link>
            </div>

            <div className="mt-16 flex items-center gap-12 border-t border-white/5 pt-12">
              {[
                { label: "Barberos Master", value: "3+" },
                { label: "Clientes Felices", value: "2K+" },
                { label: "Años de Exp.", value: "4+" }
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-xl font-black text-white">{stat.value}</div>
                  <div className="text-[9px] uppercase tracking-widest text-white/40 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right Immersive 3D Parallax Logo Section */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, rotateY: 20 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:flex relative aspect-square items-center justify-center perspective-[1200px]"
          >
            {/* The 3D Container tracking mouse */}
            <motion.div
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
              }}
              className="w-full h-full relative flex items-center justify-center group cursor-crosshair"
            >
              {/* Back glowing aura */}
              <motion.div 
                style={{ z: zGlow }}
                className="absolute inset-0 bg-gradient-to-br from-gold/20 to-transparent rounded-full blur-[80px] opacity-30 group-hover:opacity-60 transition-opacity duration-700" 
              />
              
              {/* Glassmorphic backdrop floating */}
              <motion.div 
                style={{ z: -30 }}
                className="absolute w-3/4 h-3/4 border border-white/5 rounded-full bg-gradient-to-tr from-neutral-900/60 to-black/20 backdrop-blur-sm overflow-hidden"
              >
                {/* Internal lighting effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-50" />
                
                {/* Animated light sweep */}
                <motion.div 
                  animate={{ 
                    rotate: [0, 360],
                  }}
                  transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
                  className="absolute -inset-1/2 bg-gradient-to-r from-transparent via-gold/10 to-transparent"
                />
              </motion.div>
              
              {/* Floating Logo Image */}
              <motion.div
                animate={{ y: [0, -15, 0] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                style={{ z: 80 }}
                className="relative w-[55%] h-[55%] z-20"
              >
                <img 
                  src="/chamos-logo.png" 
                  alt="Chamos Barber Logo" 
                  className="w-full h-full object-contain drop-shadow-[0_25px_35px_rgba(0,0,0,0.8)] filter brightness-110 contrast-125"
                />
              </motion.div>
              
              {/* Dynamic Particles floating around */}
              <motion.div style={{ z: 120 }} className="absolute top-[20%] right-[20%] w-3 h-3 rounded-full bg-gold/80 blur-[2px]" />
              <motion.div style={{ z: 60 }} className="absolute bottom-[25%] left-[25%] w-2 h-2 rounded-full bg-white/60 blur-[1px]" />
              <motion.div style={{ z: 150 }} className="absolute top-[60%] left-[15%] w-1.5 h-1.5 rounded-full bg-gold/90 blur-[1px]" />
              
              {/* Corner Accents - 3D offset */}
              <motion.div style={{ z: 40 }} className="absolute top-12 left-12 w-6 h-6 border-t-2 border-l-2 border-gold/40 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <motion.div style={{ z: 40 }} className="absolute top-12 right-12 w-6 h-6 border-t-2 border-r-2 border-gold/40 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <motion.div style={{ z: 40 }} className="absolute bottom-12 left-12 w-6 h-6 border-b-2 border-l-2 border-gold/40 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <motion.div style={{ z: 40 }} className="absolute bottom-12 right-12 w-6 h-6 border-b-2 border-r-2 border-gold/40 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </motion.div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
