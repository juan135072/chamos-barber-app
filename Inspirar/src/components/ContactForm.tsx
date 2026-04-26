import { useForm } from "react-hook-form";
import { motion } from "motion/react";
import { Send, CheckCircle2 } from "lucide-react";
import { useState } from "react";

type FormData = {
  name: string;
  email: string;
  service: string;
  message: string;
};

export default function ContactForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    console.log("Form data:", data);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubmitted(true);
  };

  return (
    <section className="py-24 bg-dark" id="contacto">
      <div className="container mx-auto px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <motion.span 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="text-gold text-[10px] tracking-ultra block mb-4"
            >
              Contacto
            </motion.span>
            <motion.h2 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-6xl font-black uppercase tracking-tighter mb-8 leading-tight"
            >
              ¿Listo para tu <span className="italic text-gold">Transformación?</span>
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-white/40 text-[11px] mb-8 leading-relaxed uppercase tracking-wider"
            >
              Reserva una cita o envíanos un mensaje. Estamos aquí para brindarte la experiencia premium que mereces.
            </motion.p>
            
            <div className="space-y-6">
              {[
                { label: "Ubicación del Estudio", value: "123 Elegance Ave, Style District, NY" },
                { label: "Teléfono", value: "+1 (555) 000-ELES" },
                { label: "Email", value: "concierge@elysian.studio" }
              ].map((item, i) => (
                <motion.div 
                  key={item.label}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex flex-col"
                >
                  <span className="text-[9px] uppercase tracking-[0.2em] text-white/20 font-bold mb-1">{item.label}</span>
                  <span className="text-white text-xs font-bold tracking-widest uppercase">{item.value}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-zinc-900/40 p-8 md:p-12 rounded-2xl border border-white/5 shadow-2xl relative overflow-hidden backdrop-blur-xl"
          >
            {isSubmitted ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <CheckCircle2 className="w-12 h-12 text-gold mx-auto mb-6" />
                <h3 className="text-lg font-black uppercase tracking-widest mb-4">Mensaje Recibido</h3>
                <p className="text-white/40 text-[10px] uppercase tracking-wider">Nuestro concierge te contactará pronto para confirmar tu solicitud.</p>
                <button 
                  onClick={() => setIsSubmitted(false)}
                  className="mt-8 text-gold border-b border-gold/30 pb-1 text-[9px] font-black tracking-ultra hover:border-gold transition-colors"
                >
                  Enviar otro mensaje
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase tracking-widest text-white/40 font-bold ml-1">Nombre</label>
                    <input
                      {...register("name", { required: true })}
                      placeholder=""
                      className="w-full bg-white/5 border border-white/10 rounded px-5 py-4 focus:outline-none focus:border-gold transition-colors text-[10px] uppercase tracking-widest text-white placeholder:text-white/10"
                    />
                    {errors.name && <span className="text-[9px] text-red-400 uppercase tracking-widest">Requerido</span>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase tracking-widest text-white/40 font-bold ml-1">Email</label>
                    <input
                      {...register("email", { required: true, pattern: /^\S+@\S+$/i })}
                      placeholder=""
                      className="w-full bg-white/5 border border-white/10 rounded px-5 py-4 focus:outline-none focus:border-gold transition-colors text-[10px] uppercase tracking-widest text-white placeholder:text-white/10"
                    />
                    {errors.email && <span className="text-[9px] text-red-400 uppercase tracking-widest">Email inválido</span>}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] uppercase tracking-widest text-white/40 font-bold ml-1">Servicio Master</label>
                  <select
                    {...register("service")}
                    className="w-full bg-white/5 border border-white/10 rounded px-5 py-4 focus:outline-none focus:border-gold transition-colors text-[10px] uppercase tracking-widest text-white appearance-none"
                  >
                    <option value="consultation">Consulta Inicial</option>
                    <option value="cut">Corte de Firma</option>
                    <option value="beard">Diseño de Barba</option>
                    <option value="full">Experiencia Completa</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] uppercase tracking-widest text-white/40 font-bold ml-1">Mensaje</label>
                  <textarea
                    {...register("message")}
                    placeholder=""
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded px-5 py-4 focus:outline-none focus:border-gold transition-colors text-[10px] uppercase tracking-widest text-white resize-none placeholder:text-white/10"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gold hover:brightness-110 text-dark font-black py-5 rounded transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 text-[10px] tracking-ultra"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-dark/20 border-t-dark rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Enviar Solicitud</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
