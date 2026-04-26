import { motion } from "motion/react";
import { Shield, Sparkles, Zap, ShieldCheck } from "lucide-react";

const features = [
  {
    icon: <Scissors className="w-5 h-5" />,
    title: "MAESTRÍA ARTESANAL",
    description: "Cada corte se ejecuta con precisión quirúrgica y una visión artística que se alinea con tu estructura única."
  },
  {
    icon: <ShieldCheck className="w-5 h-5" />,
    title: "PRODUCTOS PREMIUM",
    description: "Utilizamos solo las fórmulas de cuidado más exclusivas del mundo, provenientes de los mejores laboratorios botánicos."
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: "VELOCIDAD Y CONFORT",
    description: "Tu tiempo es valioso. Nuestro flujo de trabajo de alta eficiencia garantiza lujo sin esperas innecesarias."
  },
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: "EL RITUAL COMPLETO",
    description: "Más que un servicio, es un viaje sensorial que incluye toalla caliente, aceites aromáticos y estilismo de precisión."
  }
];

import { Scissors } from "lucide-react";

export default function ValueProp() {
  return (
    <section className="py-24 bg-dark relative" id="servicios">
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row justify-between items-end mb-16 gap-8">
          <div className="max-w-2xl">
            <motion.span 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-gold text-[10px] tracking-ultra block mb-4"
            >
              El Estándar Elysian
            </motion.span>
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-6xl md:text-7xl font-black uppercase tracking-tighter leading-tight"
            >
              Excelencia en cada <span className="italic text-gold">Detalle</span>.
            </motion.h2>
          </div>
          <motion.p 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-white/30 max-w-sm mb-2 text-xs leading-relaxed"
          >
            No seguimos tendencias; establecemos el punto de referencia para experiencias de cuidado de alta gama en toda la costa.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-dark p-10 hover:bg-zinc-900/40 transition-colors group"
            >
              <div className="mb-8 text-gold bg-gold/5 w-10 h-10 flex items-center justify-center rounded group-hover:bg-gold group-hover:text-dark transition-all duration-500">
                {f.icon}
              </div>
              <h3 className="text-sm font-black tracking-widest mb-4">{f.title}</h3>
              <p className="text-white/40 leading-relaxed text-[11px]">
                {f.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
