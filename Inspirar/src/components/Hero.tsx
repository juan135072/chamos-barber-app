import { motion } from "motion/react";
import { ArrowRight, PlayCircle } from "lucide-react";

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
              <span className="text-gold text-sm font-bold tracking-[0.4em] uppercase">Est. 2011</span>
            </motion.div>
            
            <h1 className="text-7xl md:text-8xl font-black leading-[0.85] tracking-tighter uppercase mb-8">
              Refina tu<br/><span className="italic text-gold">Carácter</span><br/><span className="text-white/20">Bespoke</span>.
            </h1>
            
            <p className="text-white/40 text-sm max-w-md mb-12 leading-relaxed">
              Experiencias de peluquería a medida para el caballero moderno. Donde la tradición se encuentra con la precisión en una atmósfera de lujo curado.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-gold text-dark px-10 py-4 font-black text-xs tracking-ultra hover:brightness-110 transition-all flex items-center justify-center gap-2 group"
              >
                Reservar Ahora
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </motion.button>
              
              <button className="flex items-center justify-center gap-3 text-white/40 hover:text-white transition-colors group px-6 py-4 text-[10px] tracking-ultra">
                <PlayCircle className="w-6 h-6 group-hover:text-gold transition-colors" />
                <span>Ver el Proceso</span>
              </button>
            </div>

            <div className="mt-16 flex items-center gap-12 border-t border-white/5 pt-12">
              {[
                { label: "Estilistas Master", value: "12+" },
                { label: "Premios Ganados", value: "24" },
                { label: "Años de Estudio", value: "15" }
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
            {/* The 3D Asset Placeholder */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl opacity-20" />
            <div className="w-full h-full border border-white/5 rounded-3xl bg-neutral-900/40 relative overflow-hidden group">
              {/* Decorative "Scanning" Line */}
              <motion.div 
                animate={{ top: ["0%", "100%", "0%"] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 w-full h-[1px] bg-gold/30 z-10"
              />
              
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="mb-6 mx-auto w-32 h-32 border border-gold/20 rounded-full flex items-center justify-center bg-gold/5 group-hover:bg-gold/10 transition-colors">
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      className="w-24 h-24 border border-dashed border-gold/40 rounded-full"
                    />
                  </div>
                  <h3 className="text-gold/40 font-mono text-[10px] tracking-[0.4em] uppercase font-bold text-center px-4">Espacio para Arte 3D Interactivo</h3>
                  <p className="text-white/10 text-[9px] mt-4 uppercase tracking-[0.2em]">Cargando módulo visual...</p>
                </div>
              </div>
              
              {/* Corner Accents */}
              <div className="absolute top-8 left-8 w-4 h-4 border-t-2 border-l-2 border-gold/20" />
              <div className="absolute top-8 right-8 w-4 h-4 border-t-2 border-r-2 border-gold/20" />
              <div className="absolute bottom-8 left-8 w-4 h-4 border-b-2 border-l-2 border-gold/20" />
              <div className="absolute bottom-8 right-8 w-4 h-4 border-b-2 border-r-2 border-gold/20" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
