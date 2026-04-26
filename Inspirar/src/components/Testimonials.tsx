import { motion } from "motion/react";
import { User, Scissors, Star, Clock } from "lucide-react";

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
    text: "Elysian Studio redefinió mis expectativas. La atmósfera es sofisticada y los resultados hablan por sí solos.",
    avatar: "MC"
  },
  {
    name: "Sarah Jenkins",
    role: "Primera Visita",
    text: "Buscaba un lugar que entendiera la estética moderna. Cumplieron a la perfección. ¡Altamente recomendados!",
    avatar: "SJ"
  }
];

export default function Testimonials() {
  return (
    <section className="py-24 bg-charcoal relative overflow-hidden" id="testimonios">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-gold/0 via-gold/20 to-gold/0" />
      
      <div className="container mx-auto px-6">
        <div className="flex flex-col items-center mb-16 text-center">
          <motion.span 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-gold text-[10px] tracking-ultra mb-4"
          >
            Historias de Clientes
          </motion.span>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-6"
          >
            Voces de la <span className="italic text-gold">Élite</span>
          </motion.h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-dark p-8 rounded-2xl border border-white/5 hover:border-gold/20 transition-all group"
            >
              <div className="flex items-center gap-1 mb-6">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="w-3 h-3 fill-gold text-gold" />
                ))}
              </div>
              <p className="text-white/40 mb-8 italic text-sm leading-relaxed">
                "{t.text}"
              </p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded bg-gold/5 border border-gold/10 flex items-center justify-center text-gold text-xs font-bold">
                  {t.avatar}
                </div>
                <div>
                  <h4 className="text-[11px] font-black tracking-widest text-white group-hover:text-gold transition-colors uppercase">{t.name}</h4>
                  <p className="text-[9px] uppercase tracking-widest text-white/20 mt-1">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
