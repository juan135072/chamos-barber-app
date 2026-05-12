import Link from 'next/link'
import { motion } from 'motion/react'
import { getServiceImage } from '../lib/service-utils'
import { useTenant } from '@/context/TenantContext'

const MotionLink = motion.create(Link)

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
  const { tenant } = useTenant()
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
              className="text-[10px] tracking-ultra block mb-4"
              style={{ color: 'var(--tenant-primary, #d4af37)' }}
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
              Nuestros <span className="italic" style={{ color: 'var(--tenant-primary, #d4af37)' }}>Servicios</span>.
            </motion.h2>
          </div>
          <MotionLink
            href="/servicios"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-[10px] uppercase tracking-widest text-white/40 pb-2 border-b border-white/10 transition-colors link-hover"
          >
            <style jsx>{`
              :global(.link-hover:hover) {
                color: var(--tenant-primary, #d4af37) !important;
                border-color: var(--tenant-primary, #d4af37) !important;
              }
            `}</style>
            Ver todos los servicios
          </MotionLink>
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
                <div className="font-mono text-[10px] mb-4" style={{ color: 'var(--tenant-primary, #d4af37)' }}>0{i + 1} // {svc.categoria.toUpperCase()}</div>
                <h3 className="text-xl font-bold tracking-widest uppercase mb-4 text-white">{svc.nombre}</h3>
                <p className="text-white/40 text-xs leading-relaxed mb-8 h-12">
                  {svc.descripcion || `Servicio profesional con la calidad garantizada de ${tenant?.nombre || 'nuestra barbería'}.`}
                </p>
                <Link
                  href={`/reservar?servicio=${svc.id}`}
                  className="inline-flex items-center text-[10px] tracking-ultra hover:text-white transition-colors group/btn"
                  style={{ color: 'var(--tenant-primary, #d4af37)' }}
                >
                  RESERVAR AHORA
                  <span className="ml-2 transform group-hover/btn:translate-x-1 transition-transform">→</span>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
