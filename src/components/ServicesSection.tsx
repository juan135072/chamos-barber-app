import React from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { getServiceImage } from '../lib/service-utils'

interface Service {
  id: string
  nombre: string
  descripcion: string | null
  precio: number
  categoria: string
  imagen_url?: string | null
}

interface ServicesSectionProps {
  servicios: Service[]
}

const DEFAULT_SERVICES: Service[] = [
  { id: 'd1', nombre: 'Corte de Cabello', descripcion: 'Fade, undercut, texturizado y más. Cada corte adaptado a tu rostro y estilo personal.', precio: 0, categoria: 'cortes', imagen_url: null },
  { id: 'd2', nombre: 'Barba y Afeitado', descripcion: 'Perfilado de barba y afeitado clásico con toalla caliente. Una experiencia de barbería tradicional.', precio: 0, categoria: 'barbas', imagen_url: null },
  { id: 'd3', nombre: 'Tratamientos', descripcion: 'Limpieza facial y masajes capilares para una experiencia completa de cuidado premium.', precio: 0, categoria: 'tratamientos', imagen_url: null },
]

export default function ServicesSection({ servicios }: ServicesSectionProps) {
  const displayServices = servicios.length > 0 ? servicios.slice(0, 3) : DEFAULT_SERVICES

  return (
    <section className="py-24 bg-charcoal border-y border-white/5" id="servicios">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div>
            <motion.span 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-gold text-[10px] tracking-ultra block mb-4"
            >
              Catálogo de Servicios
            </motion.span>
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-6xl font-black uppercase tracking-tighter"
            >
              Nuestros <span className="italic text-gold">Servicios</span>.
            </motion.h2>
          </div>
          <Link href="/servicios" passHref>
            <motion.a 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-[10px] uppercase tracking-widest text-white/40 hover:text-gold transition-colors pb-2 border-b border-white/10 hover:border-gold"
            >
              Ver todos los servicios
            </motion.a>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {displayServices.map((svc, i) => (
            <motion.div
              key={svc.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group bg-dark border border-white/5 hover:border-gold/30 rounded-2xl overflow-hidden transition-all duration-500"
            >
              <div className="aspect-[4/3] overflow-hidden relative">
                <div className="absolute inset-0 bg-dark/20 group-hover:bg-transparent transition-colors z-10" />
                <img 
                  src={svc.imagen_url || getServiceImage(svc.categoria, svc.nombre)} 
                  alt={svc.nombre}
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                />
              </div>
              <div className="p-8">
                <div className="text-gold font-mono text-[10px] mb-4">0{i + 1} // {svc.categoria.toUpperCase()}</div>
                <h3 className="text-xl font-bold tracking-widest uppercase mb-4 text-white">{svc.nombre}</h3>
                <p className="text-white/40 text-xs leading-relaxed mb-8 h-12">
                  {svc.descripcion || 'Servicio profesional con la calidad garantizada de Chamos Barber.'}
                </p>
                <Link href={`/reservar?servicio=${svc.id}`} passHref>
                  <a className="inline-flex items-center text-[10px] tracking-ultra text-gold hover:text-white transition-colors group/btn">
                    RESERVAR AHORA 
                    <span className="ml-2 transform group-hover/btn:translate-x-1 transition-transform">→</span>
                  </a>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
