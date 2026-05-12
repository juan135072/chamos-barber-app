import { useRef } from 'react'
import Link from 'next/link'
import { motion, useScroll, useTransform } from 'motion/react'
import { ArrowRight, PlayCircle, Star } from 'lucide-react'
import { useTenant } from '@/context/TenantContext'

const MotionLink = motion.create(Link)

export default function Hero() {
  const { tenant } = useTenant()
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -150]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  return (
    <section 
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#080808] pt-32 pb-24"
    >
      {/* Immersive Background */}
      <motion.div 
        style={{ y: y1, scale: 1.05 }}
        className="absolute inset-0 z-0"
      >
        <img 
          src="https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&q=80&w=2000" 
          alt="Luxury Barbershop" 
          className="w-full h-full object-cover opacity-20 filter contrast-125 grayscale"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#080808] via-transparent to-[#080808]" />
      </motion.div>

      {/* Liquid Glass Dynamic Orbs */}
      <motion.div 
        animate={{ 
          rotate: [0, 90, 180, 270, 360],
          scale: [1, 1.2, 1, 0.8, 1],
          borderRadius: ["20%", "50%", "30%", "50%", "20%"]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-[15%] right-[10%] w-[350px] md:w-[500px] h-[350px] md:h-[500px] blur-[80px] md:blur-[120px] pointer-events-none z-1"
        style={{ backgroundColor: 'var(--tenant-primary, #d4af37)', opacity: 0.1 }}
      />
      <motion.div 
        animate={{ 
          rotate: [360, 270, 180, 90, 0],
          scale: [1, 0.8, 1.1, 0.9, 1],
          borderRadius: ["50%", "30%", "50%", "20%", "50%"]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-[10%] left-[5%] w-[300px] md:w-[450px] h-[300px] md:h-[450px] bg-white/5 blur-[80px] md:blur-[100px] pointer-events-none z-1" 
      />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          style={{ opacity, scale }}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-4xl mx-auto flex flex-col items-center text-center"
        >
          {/* Badge */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-2xl mb-8"
          >
            <Star className="w-3.5 h-3.5" style={{ color: 'var(--tenant-primary, #d4af37)', fill: 'var(--tenant-primary, #d4af37)' }} />
            <span className="text-white/80 text-[10px] md:text-xs font-semibold tracking-[0.2em] uppercase">Establecido en 2019</span>
            <Star className="w-3.5 h-3.5" style={{ color: 'var(--tenant-primary, #d4af37)', fill: 'var(--tenant-primary, #d4af37)' }} />
          </motion.div>
          
          {/* Main Title with Liquid Text Effect */}
          <h1 className="text-5xl md:text-[85px] lg:text-[100px] font-black leading-[0.95] tracking-tighter text-white mb-8">
            FORJANDO TU <br/>
            <span className="relative inline-block mt-2">
              <span className="relative z-10 bg-clip-text text-transparent italic font-serif pr-2" style={{ backgroundImage: 'linear-gradient(to right, var(--tenant-primary, #d4af37), var(--tenant-secondary, #fef08a), var(--tenant-primary, #d4af37))' }}>MEJOR VERSIÓN</span>
              <motion.span 
                className="absolute inset-0 blur-3xl z-0 rounded-full mix-blend-screen"
                style={{ backgroundColor: 'var(--tenant-primary, #d4af37)' }}
                animate={{ opacity: [0.1, 0.4, 0.1], scale: [0.9, 1.1, 0.9] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
            </span><br/>
            DESDE EL <span className="text-white/30">DETALLE</span>
          </h1>
          
          <p className="text-white/60 text-base md:text-xl max-w-2xl font-medium tracking-wide mb-12">
            {tenant?.descripcion || 'Donde la tradición y el estilo convergen. Tu barbería de confianza brindando excelencia y maestría en San Fernando.'}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto">
            {/* Primary Liquid Button */}
            <MotionLink
              href="/reservar"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative group overflow-hidden rounded-xl px-10 py-5 flex items-center justify-center gap-3"
              style={{ backgroundImage: 'linear-gradient(to right, var(--tenant-primary, #d4af37), var(--tenant-secondary, #a88647))' }}
            >
              <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-500 ease-out rounded-xl" />
              <span className="relative z-10 text-dark font-black tracking-widest text-sm uppercase">Agendar Experiencia</span>
              <ArrowRight className="w-4 h-4 text-dark relative z-10 group-hover:translate-x-1 transition-transform" />
            </MotionLink>

            {/* Secondary Glass Button */}
            <Link
              href="/equipo"
              className="relative overflow-hidden rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl px-10 py-5 flex items-center justify-center gap-3 group hover:bg-white/10 transition-colors duration-300"
            >
              <PlayCircle className="w-5 h-5 group-hover:scale-110 transition-transform" style={{ color: 'var(--tenant-primary, #d4af37)' }} />
              <span className="text-white font-bold tracking-widest text-sm uppercase">Conocer Equipo</span>
            </Link>
          </div>

          {/* Social Proof Glass Panel */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 1 }}
            className="mt-20 flex flex-wrap justify-center md:justify-between gap-10 sm:gap-16 px-12 md:px-20 py-8 md:py-10 rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)]"
          >
            {[
              { label: "Barberos Master", value: "3+" },
              { label: "Clientes Felices", value: "2K+" },
              { label: "Años Experiencia", value: "4+" }
            ].map((stat, i) => (
              <div key={stat.label} className="flex flex-col items-center">
                <span className="text-3xl md:text-5xl font-black text-white mb-2">{stat.value}</span>
                <span className="text-[9px] md:text-[11px] uppercase tracking-[0.2em] font-bold" style={{ color: 'var(--tenant-primary, #d4af37)', opacity: 0.8 }}>{stat.label}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
      
      {/* Scroll Indicator */}
      <motion.div 
        animate={{ y: [0, 8, 0], opacity: [0.2, 0.6, 0.2] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
      >
        <div className="w-[1px] h-16" style={{ backgroundImage: 'linear-gradient(to bottom, var(--tenant-primary, #d4af37), transparent)', opacity: 0.5 }} />
      </motion.div>
    </section>
  );
}
