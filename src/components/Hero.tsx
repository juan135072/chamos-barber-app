import React, { useRef } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { ArrowRight, PlayCircle } from 'lucide-react'
import dynamic from 'next/dynamic'

const SplineScene = dynamic(() => import('@splinetool/react-spline'), {
  ssr: false,
  loading: () => <div style={{ opacity: 0 }} />
})

export default function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center pt-24 overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-gold/5 to-transparent pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-gold/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
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

          <motion.div 
            initial={{ opacity: 0, scale: 0.8, rotateY: 20 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:block relative aspect-square"
          >
            {/* The 3D Asset Placeholder replaced by SplineScene */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl opacity-20" />
            <div className="w-full h-full border border-white/5 rounded-3xl bg-neutral-900/40 relative overflow-hidden group">
              <SplineScene 
                scene="https://prod.spline.design/3Xi3HTcxP-AAGbbw/scene.splinecode"
                onLoad={(spline: any) => {
                  setTimeout(() => {
                    try {
                      const splineWrapper = document.querySelector('.spline-container > div');
                      if (splineWrapper && splineWrapper.shadowRoot) {
                        const logoContainer = splineWrapper.shadowRoot.querySelector('#logo') || splineWrapper.shadowRoot.querySelector('a');
                        if (logoContainer) (logoContainer as HTMLElement).style.display = 'none';
                      }
                      const canvas = document.querySelector('.spline-container canvas');
                      if (canvas && canvas.nextElementSibling) {
                        const logo = canvas.nextElementSibling as HTMLElement;
                        if (logo && logo.tagName === 'A') logo.style.display = 'none';
                      }
                      document.querySelectorAll('a').forEach(a => {
                        if (a.href && a.href.includes('spline.design')) {
                          a.style.display = 'none';
                        }
                      });
                    } catch(e) {}
                  }, 100);
                }}
              />
              
              {/* Corner Accents */}
              <div className="absolute top-8 left-8 w-4 h-4 border-t-2 border-l-2 border-gold/20 pointer-events-none" />
              <div className="absolute top-8 right-8 w-4 h-4 border-t-2 border-r-2 border-gold/20 pointer-events-none" />
              <div className="absolute bottom-8 left-8 w-4 h-4 border-b-2 border-l-2 border-gold/20 pointer-events-none" />
              <div className="absolute bottom-8 right-8 w-4 h-4 border-b-2 border-r-2 border-gold/20 pointer-events-none" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
