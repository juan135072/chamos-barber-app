import { motion } from "motion/react";

const logos = [
  "CHAMOS", "PREMIUM", "BARBER", "ESTILO", "ELEGANCIA", "TRADICIÓN", "CUIDADO"
];

export default function LogoCarousel() {
  return (
    <div className="py-12 bg-dark border-y border-white/5 overflow-hidden">
      <div className="container mx-auto px-6 mb-8 text-center">
        <span className="text-[9px] uppercase tracking-[0.4em] text-white/20 font-bold">Nuestra esencia y valores</span>
      </div>
      <div className="relative flex">
        <motion.div 
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="flex whitespace-nowrap gap-16 md:gap-32 items-center"
        >
          {/* Double the logos for seamless loop */}
          {[...logos, ...logos].map((logo, i) => (
            <span 
              key={i} 
              className="text-2xl md:text-4xl font-serif font-bold text-white/10 hover:text-gold/40 transition-colors cursor-default tracking-tighter"
            >
              {logo}
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
