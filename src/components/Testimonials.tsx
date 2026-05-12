import { motion } from "motion/react";
import { Star } from "lucide-react";
import { useTenant } from '@/context/TenantContext'

const testimonials = [
  {
    name: "Alex Rivera",
    role: "Cliente Regular",
    text: "La atención al detalle aquí es incomparable. No es solo un corte de pelo, es una experiencia que te hace sentir como una persona nueva.",
    avatar: "AR"
  },
  {
    name: "Marcus Chen",
    role: "Miembro VIP",
    text: "Redefinieron mis expectativas. La atmósfera es sofisticada y los resultados hablan por sí solos. Excelente atención.",
    avatar: "MC"
  },
  {
    name: "Sarah Jenkins",
    role: "Primera Visita",
    text: "Buscaba un lugar que entendiera la estética moderna. Cumplieron a la perfección. ¡Altamente recomendados a todos!",
    avatar: "SJ"
  }
];

export default function Testimonials() {
  const { tenant } = useTenant()

  return (
    <section className="py-32 relative overflow-hidden" id="testimonios" style={{ backgroundColor: 'var(--tenant-bg, #080808)' }}>
      {/* Background Orbs */}
      <div className="absolute top-0 right-1/4 w-96 h-96 blur-[120px] rounded-full pointer-events-none" style={{ backgroundColor: 'var(--tenant-primary, #d4af37)', opacity: 0.05 }} />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-white/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="absolute top-0 left-0 w-full h-[1px]" style={{ backgroundImage: 'linear-gradient(to right, transparent, var(--tenant-primary, rgba(212, 175, 55, 0.2)), transparent)' }} />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col items-center mb-20 text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-xl mb-6"
          >
            <span className="text-[10px] tracking-[0.2em] font-bold uppercase" style={{ color: 'var(--tenant-primary, #d4af37)' }}>Historias Reales</span>
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tighter mb-6 text-white"
          >
            Voces de la <span className="italic font-serif font-normal bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(to right, var(--tenant-primary, #d4af37), var(--tenant-secondary, #fef08a))' }}>Élite</span>
          </motion.h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className="bg-white/[0.02] p-10 rounded-[2rem] border border-white/5 backdrop-blur-xl hover:border-gold/30 hover:bg-white/[0.04] transition-all duration-500 group shadow-[0_0_30px_rgba(0,0,0,0.5)] hover:shadow-[0_0_40px_rgba(197,160,89,0.1)] relative overflow-hidden"
            >
              {/* Internal glow on hover */}
              <div className="absolute inset-0 bg-gradient-to-b from-gold/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-1.5 mb-8">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4" style={{ color: 'var(--tenant-primary, #d4af37)', fill: 'var(--tenant-primary, #d4af37)', filter: 'drop-shadow(0 0 8px rgba(212, 175, 55, 0.5))' }} />
                  ))}
                </div>
                <p className="text-white/60 mb-10 italic text-base leading-relaxed">
                  "{t.text}"
                </p>
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-full border flex items-center justify-center font-black tracking-widest text-sm shadow-[0_0_15px_rgba(212,175,55,0.2)]" style={{ backgroundColor: 'var(--tenant-primary, rgba(212, 175, 55, 0.1))', borderColor: 'var(--tenant-primary, rgba(212, 175, 55, 0.2))', color: 'var(--tenant-primary, #d4af37)' }}>
                    {t.avatar}
                  </div>
                  <div>
                    <h4 className="text-xs font-black tracking-widest text-white transition-colors uppercase group-hover-title">
                      <style jsx>{`
                        .group-hover-title { transition: color 0.3s ease; }
                        .group:hover .group-hover-title { color: var(--tenant-primary, #d4af37); }
                      `}</style>
                      {t.name}
                    </h4>
                    <p className="text-[10px] uppercase tracking-widest text-white/30 mt-1">{t.role}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
