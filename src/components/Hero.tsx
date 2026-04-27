import React, { useRef } from 'react'
import Link from 'next/link'
import { motion, useScroll, useTransform } from 'motion/react'
import { ArrowRight, PlayCircle } from 'lucide-react'

export default function Hero() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -150]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.9]);

  return (
    <section 
      ref={containerRef}
      className="relative min-h-screen flex items-start justify-center overflow-hidden bg-dark pt-48 pb-24"
    >
      {/* Imagen de Fondo Inmersiva con Parallax */}
      <motion.div 
        style={{ y: y1, scale: 1.1 }}
        className="absolute inset-0 z-0"
      >
        <img 
          src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=2000" 
          alt="Luxury Barbershop Background" 
          className="w-full h-full object-cover opacity-30 grayscale"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-dark via-transparent to-dark" />
        <div className="absolute inset-0 bg-gradient-to-r from-dark via-transparent to-dark" />
      </motion.div>

      {/* Efectos de Luz Dinámicos */}
      <motion.div 
        style={{ y: y2, opacity }}
        className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-gold/10 blur-[120px] rounded-full pointer-events-none z-1" 
      />
      <motion.div 
        style={{ y: y1 }}
        className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-gold/5 blur-[100px] rounded-full pointer-events-none z-1" 
      />

      <div className="container mx-auto px-6 relative z-10 text-center">
        <motion.div
          style={{ opacity, scale }}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-5xl mx-auto"
        >
          {/* Badge Establecido */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-4 mb-10"
          >
            <div className="h-[1px] w-8 bg-gold/50" />
            <span className="text-gold text-xs font-black tracking-[0.6em] uppercase">Establecido 2021</span>
            <div className="h-[1px] w-8 bg-gold/50" />
          </motion.div>
          
          <div className="relative z-10">
            <h1 className="text-6xl md:text-[110px] font-black leading-[0.8] tracking-tighter uppercase mb-12">
              Maestría en<br/>
              <span className="text-gold italic">Cortes</span><br/>
              <span className="outline-text">Legendarios</span>
            </h1>
            
            <p className="text-white/60 text-lg md:text-xl max-w-2xl mx-auto mb-16 leading-relaxed font-medium tracking-wide">
              Donde la tradición y el estilo convergen. Tu barbería de confianza desde el primer día, brindando excelencia en San Fernando.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-8 justify-center items-center">
              <Link href="/reservar" passHref>
                <motion.a 
                  whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(197, 160, 89, 0.4)" }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gold text-dark px-14 py-6 font-black text-xs tracking-ultra hover:brightness-110 transition-all flex items-center gap-4 group relative overflow-hidden"
                >
                  <span className="relative z-10">Reservar Experiencia</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform relative z-10" />
                  <motion.div 
                    className="absolute inset-0 bg-white/30 translate-x-[-100%]"
                    whileHover={{ translateX: "100%" }}
                    transition={{ duration: 0.6 }}
                  />
                </motion.a>
              </Link>
              
              <Link href="/equipo" passHref>
                <button className="flex items-center justify-center gap-4 text-white/40 hover:text-white transition-all group px-8 py-6 text-[10px] tracking-ultra border border-white/10 bg-dark/40 backdrop-blur-md">
                  <PlayCircle className="w-6 h-6 group-hover:text-gold transition-colors" />
                  <span>Ver Film de Marca</span>
                </button>
              </Link>
            </div>
          </div>

          {/* Stats Section */}
          <div className="mt-24 flex flex-wrap justify-center gap-12 md:gap-24 border-t border-white/5 pt-16">
            {[
              { label: "Barberos Master", value: "3+" },
              { label: "Clientes Felices", value: "2K+" },
              { label: "Años de Exp.", value: "4+" }
            ].map((stat) => (
              <div key={stat.label} className="group cursor-default">
                <motion.div 
                  whileHover={{ y: -5, color: "#C5A059" }}
                  className="text-3xl md:text-4xl font-black text-white transition-colors"
                >
                  {stat.value}
                </motion.div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/30 font-bold mt-2 group-hover:text-white/50 transition-colors">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
      
      {/* Scroll Indicator */}
      <motion.div 
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 opacity-20"
      >
        <span className="text-[9px] uppercase tracking-[0.4em] font-black">Scroll</span>
        <div className="w-[1px] h-12 bg-gradient-to-b from-white to-transparent" />
      </motion.div>
    </section>
  );
}
