import React, { useState } from 'react'
import Layout from '../components/Layout'
import { formatPhoneInput, normalizePhone, getPhonePlaceholder, getPhoneHint } from '@/lib/phone-utils'
import PhoneInput from '../components/PhoneInput'
import toast from 'react-hot-toast'

// Build Version: 2025-11-09-v6 - Multiple services with individual prices and duration
interface Cita {
  id: string
  servicio_nombre: string
  barbero_nombre: string
  barbero_imagen?: string | null
  barbero_especialidad?: string | null
  fecha: string
  hora: string
  estado: string
  notas?: string
  precio?: number
  duracion_total?: number
  servicios_detalle?: ServicioDetalle[]
}

interface ServicioDetalle {
  nombre: string
  precio: number
  duracion_minutos: number
  cantidad?: number
  subtotal?: number
}

interface ServicioInfo {
  nombre: string
  esAdicional: boolean
}

interface ConsultarResponse {
  citas: Cita[]
  total_citas: number
  citas_pendientes: number
}

const ConsultarPage: React.FC = () => {
  const [telefono, setTelefono] = useState('')
  const [citas, setCitas] = useState<Cita[]>([])
  const [totalCitas, setTotalCitas] = useState(0)
  const [citasPendientes, setCitasPendientes] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  // Helper function to extract multiple services from notes
  const extraerServicios = (cita: Cita): ServicioInfo[] => {
    const servicios: ServicioInfo[] = [
      { nombre: cita.servicio_nombre, esAdicional: false }
    ]

    if (cita.notas) {
      // Buscar el patrón con o sin saltos de línea antes/después
      const match = cita.notas.match(/\[SERVICIOS SOLICITADOS:\s*([^\]]+)\]/)

      if (match) {
        const serviciosTexto = match[1].trim()
        const nombresServicios = serviciosTexto.split(',').map(s => s.trim())

        // Si hay más de un servicio, reemplazar todos
        if (nombresServicios.length > 1) {
          return nombresServicios.map((nombre, idx) => ({
            nombre,
            esAdicional: idx > 0
          }))
        }
      }
    }

    return servicios
  }

  // Helper function to clean notes by removing the services list
  const limpiarNotas = (notas?: string): string | null => {
    if (!notas) return null

    // Remove the [SERVICIOS SOLICITADOS: ...] part including surrounding whitespace
    const notasLimpias = notas.replace(/\s*\[SERVICIOS SOLICITADOS:\s*[^\]]+\]\s*/g, '').trim()

    return notasLimpias || null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!telefono.trim()) {
      toast.error('Por favor, ingresa tu número de teléfono')
      return
    }

    setLoading(true)
    // El teléfono ya viene normalizado desde el componente PhoneInput
    const normalizedPhone = telefono
    console.log('📤 [consultar] Teléfono:', normalizedPhone)

    try {
      const url = `/api/consultar-citas?telefono=${encodeURIComponent(normalizedPhone)}`
      console.log('🔍 [consultar] URL:', url)

      const response = await fetch(url)
      console.log('📥 [consultar] Respuesta recibida:', response.status, response.statusText)

      if (response.ok) {
        const data: ConsultarResponse = await response.json()
        console.log('📋 [consultar] Datos recibidos:', data)
        console.log('📊 [consultar] Total citas:', data.total_citas)
        console.log('📊 [consultar] Citas pendientes:', data.citas_pendientes)
        console.log('📊 [consultar] Número de citas en array:', data.citas?.length || 0)

        setCitas(data.citas || [])
        setTotalCitas(data.total_citas || 0)
        setCitasPendientes(data.citas_pendientes || 0)
      } else {
        const errorData = await response.json()
        console.error('❌ [consultar] Error consulting appointments:', errorData)
        toast.error(`Error al consultar citas: ${errorData.error || 'Error desconocido'}`)
        setCitas([])
        setTotalCitas(0)
        setCitasPendientes(0)
      }
    } catch (error) {
      console.error('❌ [consultar] Error completo:', error)
      toast.error('Error al consultar citas. Por favor, inténtalo de nuevo.')
      setCitas([])
      setTotalCitas(0)
      setCitasPendientes(0)
    } finally {
      setLoading(false)
      setSearched(true)
    }
  }

  const getEstadoColor = (estado: string) => {
    switch (estado.toLowerCase()) {
      case 'pendiente':
        return '#FFA500'
      case 'confirmada':
        return 'var(--accent-color)'
      case 'completada':
        return '#4CAF50'
      case 'cancelada':
        return '#F44336'
      default:
        return 'var(--text-primary)'
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const isPastDate = (dateStr: string, timeStr: string) => {
    const appointmentDate = new Date(`${dateStr}T${timeStr}:00`)
    return appointmentDate < new Date()
  }

  // Separar citas próximas de historial
  const upcomingCitas = citas.filter(cita =>
    !isPastDate(cita.fecha, cita.hora) &&
    cita.estado.toLowerCase() !== 'cancelada' &&
    cita.estado.toLowerCase() !== 'completada'
  )

  const historyCitas = citas.filter(cita =>
    isPastDate(cita.fecha, cita.hora) ||
    cita.estado.toLowerCase() === 'cancelada' ||
    cita.estado.toLowerCase() === 'completada'
  )

  return (
    <Layout
      title="Consultar Citas - Chamos Barber"
      description="Consulta el estado de tus citas reservadas en Chamos Barber. Revisa fechas, horarios y confirmaciones."
    >
      <section className="relative overflow-hidden bg-[#080808] pt-24 pb-12">
        {/* Background Orbs */}
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-gold/10 blur-[120px] rounded-full pointer-events-none z-0" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-white/5 blur-[120px] rounded-full pointer-events-none z-0" />

        <div className="relative z-10 container mx-auto text-center px-6">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white mb-4">
            Consultar <span className="italic font-serif font-normal bg-gradient-to-r from-gold to-yellow-300 bg-clip-text text-transparent">Citas</span>
          </h1>
          <p className="text-lg text-white/60 font-medium tracking-wide">
            Ingresa tu teléfono para ver tus reservas
          </p>
        </div>
      </section>

      <section className="relative bg-[#080808] pb-24">
        {/* Additional Orb for the form area */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold/5 blur-[150px] rounded-full pointer-events-none z-0" />
        
        <div className="relative z-10 container mx-auto px-4 max-w-4xl">
          <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-6 md:p-10 backdrop-blur-2xl shadow-2xl">
            <div className="text-center mb-8">
              <i className="fas fa-search text-5xl text-gold mb-4" />
              <h2 className="text-3xl font-bold text-white mb-2">
                Buscar mis Citas
              </h2>
              <p className="text-white/70">
                Introduce el número de teléfono que usaste al reservar
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <PhoneInput
                  label="Número de Teléfono (WhatsApp)"
                  value={telefono}
                  onChange={(val) => setTelefono(val)}
                  required
                />
                <small className="flex items-center gap-2 mt-3 text-sm text-white/60">
                  <i className="fas fa-info-circle text-gold" />
                  Usa el mismo formato con el que reservaste.
                </small>
              </div>

              <button
                type="submit"
                className={`w-full py-4 px-6 rounded-2xl font-bold uppercase tracking-wider text-sm transition-all duration-300
                  ${loading 
                    ? 'bg-white/10 text-white/50 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-gold to-yellow-500 text-[#080808] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:scale-[1.02]'
                  }`}
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    Buscando...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fas fa-search" />
                    Buscar mis Citas
                  </span>
                )}
              </button>
            </form>

            {/* Results */}
            {searched && (
              <div className="mt-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {citas.length === 0 ? (
                  <div className="text-center py-12 bg-white/5 rounded-[2rem] border border-white/10">
                    <i className="fas fa-calendar-times text-5xl text-gold/50 mb-6" />
                    <h3 className="text-2xl font-bold text-white mb-3">No se encontraron citas</h3>
                    <p className="text-white/60 mb-2">No encontramos citas asociadas a este número de teléfono.</p>
                    <p className="text-white/60">
                      Verifica que hayas ingresado el número correcto o
                      <a href="/reservar" className="text-gold hover:text-yellow-400 ml-1 underline underline-offset-4">
                        reserva una nueva cita aquí
                      </a>.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Mensaje de Bienvenida y Estadísticas */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-gold/20 via-yellow-500/10 to-transparent border border-gold/30 rounded-[2rem] p-8 text-center backdrop-blur-md">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-gold/20 blur-[80px] rounded-full pointer-events-none" />
                      
                      <div className="relative z-10">
                        <h2 className="text-3xl font-bold text-white mb-4 flex items-center justify-center gap-3">
                          <i className="fas fa-heart text-gold" />
                          ¡Gracias por confiar en Chamos Barber!
                        </h2>
                        <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
                          Nos alegra tenerte como cliente. Tu confianza es nuestro mayor orgullo.
                        </p>

                        {/* Estadísticas */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm transition-transform hover:-translate-y-1">
                            <div className="text-4xl font-black text-gold mb-2">{totalCitas}</div>
                            <div className="text-sm font-medium uppercase tracking-wider text-white/70">
                              <i className="fas fa-calendar mr-2" /> Total de Citas
                            </div>
                          </div>

                          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm transition-transform hover:-translate-y-1">
                            <div className="text-4xl font-black text-gold mb-2">{citasPendientes}</div>
                            <div className="text-sm font-medium uppercase tracking-wider text-white/70">
                              <i className="fas fa-clock mr-2" /> Citas Pendientes
                            </div>
                          </div>

                          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm transition-transform hover:-translate-y-1">
                            <div className="text-4xl font-black text-gold mb-2">{10 - citasPendientes}</div>
                            <div className="text-sm font-medium uppercase tracking-wider text-white/70">
                              <i className="fas fa-plus-circle mr-2" /> Cupos Disponibles
                            </div>
                          </div>
                        </div>

                        {citasPendientes >= 8 && (
                          <div className="mt-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center justify-center gap-2">
                            <i className="fas fa-exclamation-triangle" />
                            Estás cerca del límite de {citasPendientes}/10 citas pendientes
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Próximas Citas */}
                    {upcomingCitas.length > 0 && (
                      <div className="space-y-6">
                        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                          <i className="fas fa-calendar-plus text-gold" />
                          Próximas Citas ({upcomingCitas.length})
                        </h3>
                        {upcomingCitas.map(cita => (
                          <div key={cita.id} className="relative overflow-hidden bg-white/[0.03] border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-xl transition-all duration-300 hover:bg-white/[0.05] hover:border-gold/30 hover:shadow-[0_0_30px_rgba(212,175,55,0.1)] group">
                            {/* Accent Glow on Hover */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-gold/10 blur-[50px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                            {/* Foto del Barbero y Información */}
                            {cita.barbero_imagen && (
                              <div className="flex items-center gap-6 mb-8 p-6 bg-gradient-to-r from-gold/10 to-transparent rounded-2xl border border-gold/20">
                                <div className="relative shrink-0">
                                  <img
                                    src={cita.barbero_imagen}
                                    alt={cita.barbero_nombre}
                                    className="w-24 h-24 rounded-full object-cover border-2 border-gold shadow-lg"
                                  />
                                  <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-gold to-yellow-500 rounded-full w-8 h-8 flex items-center justify-center border-2 border-[#080808] shadow-md">
                                    <i className="fas fa-scissors text-xs text-[#080808]" />
                                  </div>
                                </div>

                                <div className="flex-1">
                                  <h4 className="text-xl font-bold text-white mb-1">
                                    Tu barbero: <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold to-yellow-300">{cita.barbero_nombre}</span>
                                  </h4>
                                  {cita.barbero_especialidad && (
                                    <p className="text-sm text-gold/80 mb-2 flex items-center gap-2">
                                      <i className="fas fa-star" />
                                      {cita.barbero_especialidad}
                                    </p>
                                  )}
                                  <p className="text-sm text-white/60 italic">
                                    ¡Estamos emocionados de atenderte!
                                  </p>
                                </div>
                              </div>
                            )}

                            <div className="text-lg font-medium text-white mb-6 flex items-center gap-3">
                              <i className="fas fa-calendar text-gold" /> {formatDate(cita.fecha)} a las {cita.hora}
                            </div>
                            <div className="space-y-4 text-white/80">
                              {(() => {
                                const serviciosDetalle = cita.servicios_detalle || []
                                const tieneMultiplesServicios = serviciosDetalle.length > 1

                                return (
                                  <div className="bg-[#080808]/50 rounded-xl p-6 border border-white/5">
                                    <strong className="text-white mb-4 block text-lg">
                                      {tieneMultiplesServicios ? 'Servicios:' : 'Servicio:'}
                                    </strong>
                                    {tieneMultiplesServicios ? (
                                      <div className="space-y-4">
                                        <ul className="space-y-3">
                                          {serviciosDetalle.map((servicio, idx) => (
                                            <li key={idx} className="flex items-center gap-4 text-white/80">
                                              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gold/20 text-gold flex items-center justify-center font-bold text-sm border border-gold/30">
                                                {idx + 1}
                                              </span>
                                              <span className="flex-1">
                                                {servicio.cantidad && servicio.cantidad > 1 ? `${servicio.cantidad}x ` : ''}
                                                {servicio.nombre}
                                              </span>
                                              <span className="text-gold font-semibold whitespace-nowrap">
                                                ${(servicio.subtotal || (servicio.precio * (servicio.cantidad || 1)))?.toLocaleString()}
                                              </span>
                                              <span className="text-white/50 text-sm whitespace-nowrap w-16 text-right">
                                                {servicio.duracion_minutos} min
                                              </span>
                                            </li>
                                          ))}
                                        </ul>
                                        {/* Resumen Total */}
                                        <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center text-lg">
                                          <span className="font-bold text-white">TOTAL:</span>
                                          <div className="flex gap-4 items-center">
                                            <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold to-yellow-300">
                                              ${cita.precio?.toLocaleString()}
                                            </span>
                                            <span className="text-white/60 text-sm">
                                              {cita.duracion_total} min
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex justify-between items-center text-lg">
                                        <span className="text-white/90">{cita.servicio_nombre}</span>
                                        <div className="flex gap-4 items-center">
                                          <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold to-yellow-300">
                                            ${cita.precio?.toLocaleString()}
                                          </span>
                                          {cita.duracion_total && (
                                            <span className="text-white/60 text-sm">
                                              {cita.duracion_total} min
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              })()}
                              <div className="flex items-center gap-2 mt-4 px-2">
                                <strong className="text-white">Barbero:</strong> <span className="text-white/80">{cita.barbero_nombre}</span>
                              </div>
                              <div className="flex items-center gap-2 px-2">
                                <strong className="text-white">Estado:</strong>
                                <span className={`font-bold px-3 py-1 rounded-full text-xs ${cita.estado.toLowerCase() === 'pendiente' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
                                  {cita.estado.charAt(0).toUpperCase() + cita.estado.slice(1)}
                                </span>
                              </div>
                            </div>
                            {limpiarNotas(cita.notas) && (
                              <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-xl text-sm text-white/80">
                                <strong className="text-white">Notas:</strong> {limpiarNotas(cita.notas)}
                              </div>
                            )}

                            {cita.estado.toLowerCase() === 'pendiente' && (
                              <div className="mt-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl text-sm text-orange-400 flex items-start gap-3">
                                <i className="fas fa-info-circle mt-0.5" />
                                <span>Tu cita está pendiente de confirmación. Te contactaremos pronto por WhatsApp.</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Historial */}
                    {historyCitas.length > 0 && (
                      <div className="space-y-6 mt-16">
                        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                          <i className="fas fa-history text-white/50" />
                          Historial ({historyCitas.length})
                        </h3>
                        {historyCitas.map(cita => (
                          <div key={cita.id} className="relative overflow-hidden bg-white/[0.02] border border-white/5 rounded-2xl p-6 md:p-8 backdrop-blur-sm opacity-80 hover:opacity-100 transition-opacity">
                            <div className="text-white/60 mb-6 flex items-center gap-3">
                              <i className="fas fa-calendar" /> {formatDate(cita.fecha)} a las {cita.hora}
                            </div>
                            <div className="space-y-4 text-white/80">
                              {(() => {
                                const serviciosDetalle = cita.servicios_detalle || []
                                const tieneMultiplesServicios = serviciosDetalle.length > 1

                                return (
                                  <div className="bg-[#080808]/30 rounded-xl p-5 border border-white/5">
                                    <strong className="text-white mb-4 block">
                                      {tieneMultiplesServicios ? 'Servicios:' : 'Servicio:'}
                                    </strong>
                                    {tieneMultiplesServicios ? (
                                      <div className="space-y-3">
                                        <ul className="space-y-2">
                                          {serviciosDetalle.map((servicio, idx) => (
                                            <li key={idx} className="flex items-center gap-4 text-white/70 text-sm">
                                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 text-white flex items-center justify-center font-bold text-xs">
                                                {idx + 1}
                                              </span>
                                              <span className="flex-1">{servicio.nombre}</span>
                                              <span className="text-white font-semibold whitespace-nowrap">
                                                ${servicio.precio?.toLocaleString()}
                                              </span>
                                              <span className="text-white/40 whitespace-nowrap w-16 text-right">
                                                {servicio.duracion_minutos} min
                                              </span>
                                            </li>
                                          ))}
                                        </ul>
                                        {/* Resumen Total */}
                                        <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center">
                                          <span className="font-bold text-white">TOTAL:</span>
                                          <div className="flex gap-4 items-center">
                                            <span className="text-lg font-bold text-white/90">
                                              ${cita.precio?.toLocaleString()}
                                            </span>
                                            <span className="text-white/50 text-sm">
                                              {cita.duracion_total} min
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex justify-between items-center">
                                        <span className="text-white/80">{cita.servicio_nombre}</span>
                                        <div className="flex gap-4 items-center">
                                          <span className="font-bold text-white/90">
                                            ${cita.precio?.toLocaleString()}
                                          </span>
                                          {cita.duracion_total && (
                                            <span className="text-white/50 text-sm">
                                              {cita.duracion_total} min
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              })()}
                              <div className="flex items-center gap-2 mt-4 px-2">
                                <strong className="text-white">Barbero:</strong> <span className="text-white/70">{cita.barbero_nombre}</span>
                              </div>
                              <div className="flex items-center gap-2 px-2">
                                <strong className="text-white">Estado:</strong>
                                <span className={`font-bold px-3 py-1 rounded-full text-xs ${cita.estado.toLowerCase() === 'cancelada' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                                  {cita.estado.charAt(0).toUpperCase() + cita.estado.slice(1)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Contact Info */}
                    <div className="mt-12 p-8 bg-gradient-to-b from-white/5 to-transparent rounded-[2rem] border border-white/10 text-center backdrop-blur-xl">
                      <h4 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold to-yellow-300 mb-4">
                        ¿Necesitas ayuda?
                      </h4>
                      <p className="text-white/80 mb-6 max-w-lg mx-auto">
                        Si necesitas cancelar, reprogramar o tienes alguna consulta sobre tu cita:
                      </p>
                      <div className="flex flex-wrap gap-4 justify-center">
                        <a
                          href="https://wa.me/56983588553"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white px-6 py-3 rounded-xl font-bold hover:shadow-[0_0_20px_rgba(37,211,102,0.4)] transition-all hover:-translate-y-1"
                        >
                          <i className="fab fa-whatsapp text-xl" />
                          WhatsApp
                        </a>
                        <a
                          href="tel:+56983588553"
                          className="flex items-center gap-2 bg-white/10 text-white border border-white/20 px-6 py-3 rounded-xl font-bold hover:bg-white/20 transition-all hover:-translate-y-1"
                        >
                          <i className="fas fa-phone text-xl" />
                          Llamar
                        </a>
                      </div>
                      <p className="text-xs text-white/50 mt-8 font-medium tracking-wide">
                        Horario de atención: Lunes a Viernes 10:00 - 20:30 | Sábado 10:00 - 21:00 | Domingo Cerrado
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </Layout>
  )
}

export default ConsultarPage
