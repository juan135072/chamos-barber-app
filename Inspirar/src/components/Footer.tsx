import { Camera, Globe, MessageCircle, Scissors } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-charcoal pt-24 pb-12 border-t border-white/5">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-4 gap-12 mb-20">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-8">
              <div className="w-8 h-8 bg-gold rounded flex items-center justify-center text-dark">
                <Scissors className="w-5 h-5" />
              </div>
              <span className="text-2xl font-black tracking-widest text-white">ELYSIAN<span className="text-gold">.</span></span>
            </div>
            <p className="text-white/30 max-w-sm mb-8 leading-relaxed text-xs uppercase tracking-wider">
              Elevando el estándar del cuidado de alta gama desde 2011. Nuestro compromiso con la precisión artística y el servicio premium permanece inalterable.
            </p>
            <div className="flex gap-4">
              {[Camera, Globe, MessageCircle].map((Icon, i) => (
                <a key={i} href="#" className="w-10 h-10 rounded bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-gold hover:border-gold transition-all">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-[10px] tracking-ultra text-gold mb-8 uppercase">Enlaces Rápidos</h4>
            <ul className="space-y-4">
              {["Nuestros Estilistas", "Galería del Estudio", "Términos de Servicio", "Privacidad", "Trabaja con Nosotros"].map((link) => (
                <li key={link}>
                  <a href="#" className="text-white/40 hover:text-gold transition-colors text-[10px] uppercase tracking-widest">{link}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] tracking-ultra text-gold mb-8 uppercase">Horarios del Estudio</h4>
            <ul className="space-y-4 text-[10px] tracking-widest uppercase font-bold">
              <li className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/20">Lun — Vie</span>
                <span className="text-white">09:00 — 21:00</span>
              </li>
              <li className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/20">Sábado</span>
                <span className="text-white">10:00 — 18:00</span>
              </li>
              <li className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-white/20">Domingo</span>
                <span className="text-gold italic">Solo con Cita</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-[9px] font-bold text-white/20 uppercase tracking-[0.2em]">
          <p>© 2026 Elysian Grooming Studio. Todos los derechos reservados.</p>
          <div className="flex gap-8">
            <span className="hover:text-gold transition-colors cursor-pointer">Construido para la Élite</span>
            <span>Versión 2.4.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
