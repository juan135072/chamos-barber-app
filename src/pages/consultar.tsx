import React, { useState } from 'react'
import Layout from '../components/Layout'

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
      alert('Por favor, ingresa tu número de teléfono')
      return
    }

    setLoading(true)
    console.log('📤 [consultar] Enviando solicitud para teléfono:', telefono)
    
    try {
      const url = `/api/consultar-citas?telefono=${encodeURIComponent(telefono)}`
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
        alert(`Error al consultar citas: ${errorData.error || 'Error desconocido'}`)
        setCitas([])
        setTotalCitas(0)
        setCitasPendientes(0)
      }
    } catch (error) {
      console.error('❌ [consultar] Error completo:', error)
      alert('Error al consultar citas. Por favor, inténtalo de nuevo.')
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
      <section className="page-header">
        <div className="container">
          <h1 className="page-title">Consultar Citas</h1>
          <p className="page-subtitle">Ingresa tu teléfono para ver tus reservas</p>
        </div>
      </section>

      <section style={{ padding: '4rem 0' }}>
        <div className="container">
          <div className="consultation-form">
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <i className="fas fa-search" style={{ 
                fontSize: '3rem', 
                color: 'var(--accent-color)', 
                marginBottom: '1rem' 
              }}></i>
              <h2 style={{ color: 'var(--accent-color)', marginBottom: '0.5rem' }}>
                Buscar mis Citas
              </h2>
              <p style={{ opacity: '0.8' }}>
                Introduce el número de teléfono que usaste al reservar
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-phone"></i> Número de Teléfono
                </label>
                <input 
                  type="tel"
                  className="form-input"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="+56 9 1234 5678"
                  required
                />
                <small style={{ opacity: '0.7', fontSize: '0.85rem' }}>
                  Usa el mismo número con el que reservaste tu cita
                </small>
              </div>

              <button 
                type="submit" 
                className={`btn btn-primary ${loading ? 'loading' : ''}`}
                disabled={loading}
                style={{ width: '100%' }}
              >
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    Buscando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-search"></i>
                    Buscar mis Citas
                  </>
                )}
              </button>
            </form>

            {/* Results */}
            {searched && (
              <div className="appointments-results">
                {citas.length === 0 ? (
                  <div className="no-results">
                    <i className="fas fa-calendar-times" style={{ 
                      fontSize: '3rem', 
                      color: 'var(--accent-color)', 
                      marginBottom: '1rem' 
                    }}></i>
                    <h3>No se encontraron citas</h3>
                    <p>No encontramos citas asociadas a este número de teléfono.</p>
                    <p>Verifica que hayas ingresado el número correcto o 
                       <a href="/reservar" style={{ color: 'var(--accent-color)', textDecoration: 'none' }}>
                         {' '}reserva una nueva cita aquí
                       </a>.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Mensaje de Bienvenida y Estadísticas */}
                    <div style={{ 
                      marginBottom: '2rem',
                      padding: '2rem',
                      background: 'linear-gradient(135deg, var(--accent-color) 0%, #c89d3c 100%)',
                      borderRadius: 'var(--border-radius)',
                      color: '#1a1a1a',
                      textAlign: 'center'
                    }}>
                      <h2 style={{ 
                        fontSize: '2rem', 
                        marginBottom: '1rem',
                        fontWeight: 'bold'
                      }}>
                        <i className="fas fa-heart" style={{ marginRight: '0.5rem' }}></i>
                        ¡Gracias por confiar en Chamos Barber!
                      </h2>
                      <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem', opacity: 0.9 }}>
                        Nos alegra tenerte como cliente. Tu confianza es nuestro mayor orgullo.
                      </p>
                      
                      {/* Estadísticas */}
                      <div style={{ 
                        display: 'flex', 
                        gap: '2rem', 
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                        marginTop: '1.5rem'
                      }}>
                        <div style={{
                          padding: '1rem 2rem',
                          background: 'rgba(26, 26, 26, 0.2)',
                          borderRadius: '10px',
                          minWidth: '150px'
                        }}>
                          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                            {totalCitas}
                          </div>
                          <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                            <i className="fas fa-calendar"></i> Total de Citas
                          </div>
                        </div>
                        
                        <div style={{
                          padding: '1rem 2rem',
                          background: 'rgba(26, 26, 26, 0.2)',
                          borderRadius: '10px',
                          minWidth: '150px'
                        }}>
                          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                            {citasPendientes}
                          </div>
                          <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                            <i className="fas fa-clock"></i> Citas Pendientes
                          </div>
                        </div>

                        <div style={{
                          padding: '1rem 2rem',
                          background: 'rgba(26, 26, 26, 0.2)',
                          borderRadius: '10px',
                          minWidth: '150px'
                        }}>
                          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                            {10 - citasPendientes}
                          </div>
                          <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                            <i className="fas fa-plus-circle"></i> Cupos Disponibles
                          </div>
                        </div>
                      </div>

                      {citasPendientes >= 8 && (
                        <div style={{
                          marginTop: '1.5rem',
                          padding: '1rem',
                          background: 'rgba(255, 0, 0, 0.2)',
                          borderRadius: '8px',
                          border: '2px solid rgba(255, 0, 0, 0.4)'
                        }}>
                          <i className="fas fa-exclamation-triangle" style={{ marginRight: '0.5rem' }}></i>
                          Estás cerca del límite de {citasPendientes}/10 citas pendientes
                        </div>
                      )}
                    </div>

                    {/* Próximas Citas */}
                    {upcomingCitas.length > 0 && (
                      <div className="appointments-section">
                        <h3>
                          <i className="fas fa-calendar-plus" style={{ marginRight: '0.5rem' }}></i>
                          Próximas Citas ({upcomingCitas.length})
                        </h3>
                        {upcomingCitas.map(cita => (
                          <div key={cita.id} className="appointment-card" style={{
                            position: 'relative',
                            overflow: 'hidden'
                          }}>
                            {/* Foto del Barbero y Información */}
                            {cita.barbero_imagen && (
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                marginBottom: '1.5rem',
                                padding: '1.5rem',
                                background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(212, 175, 55, 0.05) 100%)',
                                borderRadius: 'var(--border-radius)',
                                gap: '1.5rem'
                              }}>
                                <div style={{
                                  position: 'relative',
                                  flexShrink: 0
                                }}>
                                  <img 
                                    src={cita.barbero_imagen} 
                                    alt={cita.barbero_nombre}
                                    style={{
                                      width: '100px',
                                      height: '100px',
                                      borderRadius: '50%',
                                      objectFit: 'cover',
                                      border: '3px solid var(--accent-color)',
                                      boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                                    }}
                                  />
                                  <div style={{
                                    position: 'absolute',
                                    bottom: '-5px',
                                    right: '-5px',
                                    background: 'var(--accent-color)',
                                    borderRadius: '50%',
                                    width: '30px',
                                    height: '30px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '2px solid var(--bg-primary)'
                                  }}>
                                    <i className="fas fa-scissors" style={{ fontSize: '0.8rem', color: '#1a1a1a' }}></i>
                                  </div>
                                </div>
                                
                                <div style={{ flex: 1 }}>
                                  <h4 style={{ 
                                    fontSize: '1.3rem', 
                                    marginBottom: '0.5rem',
                                    color: 'var(--accent-color)'
                                  }}>
                                    Tu barbero: {cita.barbero_nombre}
                                  </h4>
                                  {cita.barbero_especialidad && (
                                    <p style={{ 
                                      fontSize: '0.95rem', 
                                      opacity: 0.8,
                                      marginBottom: '0.5rem'
                                    }}>
                                      <i className="fas fa-star" style={{ marginRight: '0.5rem' }}></i>
                                      {cita.barbero_especialidad}
                                    </p>
                                  )}
                                  <p style={{
                                    fontSize: '0.9rem',
                                    opacity: 0.7,
                                    fontStyle: 'italic'
                                  }}>
                                    ¡Estamos emocionados de atenderte!
                                  </p>
                                </div>
                              </div>
                            )}

                            <div className="appointment-date">
                              <i className="fas fa-calendar"></i> {formatDate(cita.fecha)} a las {cita.hora}
                            </div>
                            <div className="appointment-details">
                              {(() => {
                                const serviciosDetalle = cita.servicios_detalle || []
                                const tieneMultiplesServicios = serviciosDetalle.length > 1
                                
                                return (
                                  <div>
                                    <strong>
                                      {tieneMultiplesServicios ? 'Servicios:' : 'Servicio:'}
                                    </strong>
                                    {tieneMultiplesServicios ? (
                                      <div style={{ marginTop: '0.5rem' }}>
                                        <ul style={{
                                          marginBottom: '0.75rem',
                                          paddingLeft: '1.5rem',
                                          listStyleType: 'none'
                                        }}>
                                          {serviciosDetalle.map((servicio, idx) => (
                                            <li key={idx} style={{
                                              marginBottom: '0.5rem',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '0.5rem',
                                              fontSize: '0.95rem'
                                            }}>
                                              <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                minWidth: '24px',
                                                height: '24px',
                                                borderRadius: '50%',
                                                background: 'var(--accent-color)',
                                                color: '#1a1a1a',
                                                fontSize: '0.75rem',
                                                fontWeight: 'bold'
                                              }}>
                                                {idx + 1}
                                              </span>
                                              <span style={{ flex: 1 }}>{servicio.nombre}</span>
                                              <span style={{ 
                                                color: 'var(--accent-color)',
                                                fontWeight: '600',
                                                whiteSpace: 'nowrap'
                                              }}>
                                                ${servicio.precio?.toLocaleString()}
                                              </span>
                                              <span style={{ 
                                                opacity: 0.7,
                                                fontSize: '0.85rem',
                                                whiteSpace: 'nowrap'
                                              }}>
                                                {servicio.duracion_minutos} min
                                              </span>
                                            </li>
                                          ))}
                                        </ul>
                                        {/* Resumen Total */}
                                        <div style={{
                                          marginTop: '0.75rem',
                                          paddingTop: '0.75rem',
                                          borderTop: '2px solid var(--accent-color)',
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          fontWeight: 'bold',
                                          fontSize: '1.05rem'
                                        }}>
                                          <span>TOTAL:</span>
                                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            <span style={{ color: 'var(--accent-color)' }}>
                                              ${cita.precio?.toLocaleString()}
                                            </span>
                                            <span style={{ opacity: 0.8, fontSize: '0.9rem' }}>
                                              {cita.duracion_total} min
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div style={{ marginTop: '0.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <span>{cita.servicio_nombre}</span>
                                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            <span style={{ color: 'var(--accent-color)', fontWeight: '600' }}>
                                              ${cita.precio?.toLocaleString()}
                                            </span>
                                            {cita.duracion_total && (
                                              <span style={{ opacity: 0.7, fontSize: '0.9rem' }}>
                                                {cita.duracion_total} min
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              })()}
                              <div>
                                <strong>Barbero:</strong> {cita.barbero_nombre}
                              </div>
                              <div>
                                <strong>Estado:</strong> 
                                <span style={{ 
                                  color: getEstadoColor(cita.estado),
                                  fontWeight: '600',
                                  marginLeft: '0.5rem'
                                }}>
                                  {cita.estado.charAt(0).toUpperCase() + cita.estado.slice(1)}
                                </span>
                              </div>
                            </div>
                            {limpiarNotas(cita.notas) && (
                              <div style={{ 
                                marginTop: '1rem', 
                                padding: '0.75rem',
                                background: 'rgba(212, 175, 55, 0.1)',
                                borderRadius: 'var(--border-radius)',
                                fontSize: '0.9rem'
                              }}>
                                <strong>Notas:</strong> {limpiarNotas(cita.notas)}
                              </div>
                            )}
                            
                            {cita.estado.toLowerCase() === 'pendiente' && (
                              <div style={{ 
                                marginTop: '1rem',
                                padding: '0.75rem',
                                background: 'rgba(255, 165, 0, 0.1)',
                                borderRadius: 'var(--border-radius)',
                                fontSize: '0.9rem',
                                border: '1px solid rgba(255, 165, 0, 0.3)'
                              }}>
                                <i className="fas fa-info-circle"></i> Tu cita está pendiente de confirmación. 
                                Te contactaremos pronto por WhatsApp.
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Historial */}
                    {historyCitas.length > 0 && (
                      <div className="appointments-section">
                        <h3>
                          <i className="fas fa-history" style={{ marginRight: '0.5rem' }}></i>
                          Historial ({historyCitas.length})
                        </h3>
                        {historyCitas.map(cita => (
                          <div key={cita.id} className="appointment-card" style={{ opacity: '0.8' }}>
                            <div className="appointment-date">
                              <i className="fas fa-calendar"></i> {formatDate(cita.fecha)} a las {cita.hora}
                            </div>
                            <div className="appointment-details">
                              {(() => {
                                const serviciosDetalle = cita.servicios_detalle || []
                                const tieneMultiplesServicios = serviciosDetalle.length > 1
                                
                                return (
                                  <div>
                                    <strong>
                                      {tieneMultiplesServicios ? 'Servicios:' : 'Servicio:'}
                                    </strong>
                                    {tieneMultiplesServicios ? (
                                      <div style={{ marginTop: '0.5rem' }}>
                                        <ul style={{
                                          marginBottom: '0.75rem',
                                          paddingLeft: '1.5rem',
                                          listStyleType: 'none'
                                        }}>
                                          {serviciosDetalle.map((servicio, idx) => (
                                            <li key={idx} style={{
                                              marginBottom: '0.5rem',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '0.5rem',
                                              fontSize: '0.95rem'
                                            }}>
                                              <span style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                minWidth: '24px',
                                                height: '24px',
                                                borderRadius: '50%',
                                                background: 'var(--accent-color)',
                                                color: '#1a1a1a',
                                                fontSize: '0.75rem',
                                                fontWeight: 'bold'
                                              }}>
                                                {idx + 1}
                                              </span>
                                              <span style={{ flex: 1 }}>{servicio.nombre}</span>
                                              <span style={{ 
                                                color: 'var(--accent-color)',
                                                fontWeight: '600',
                                                whiteSpace: 'nowrap'
                                              }}>
                                                ${servicio.precio?.toLocaleString()}
                                              </span>
                                              <span style={{ 
                                                opacity: 0.7,
                                                fontSize: '0.85rem',
                                                whiteSpace: 'nowrap'
                                              }}>
                                                {servicio.duracion_minutos} min
                                              </span>
                                            </li>
                                          ))}
                                        </ul>
                                        {/* Resumen Total */}
                                        <div style={{
                                          marginTop: '0.75rem',
                                          paddingTop: '0.75rem',
                                          borderTop: '2px solid rgba(212, 175, 55, 0.5)',
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          fontWeight: 'bold',
                                          fontSize: '1.05rem'
                                        }}>
                                          <span>TOTAL:</span>
                                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            <span style={{ color: 'var(--accent-color)' }}>
                                              ${cita.precio?.toLocaleString()}
                                            </span>
                                            <span style={{ opacity: 0.8, fontSize: '0.9rem' }}>
                                              {cita.duracion_total} min
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div style={{ marginTop: '0.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                          <span>{cita.servicio_nombre}</span>
                                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            <span style={{ color: 'var(--accent-color)', fontWeight: '600' }}>
                                              ${cita.precio?.toLocaleString()}
                                            </span>
                                            {cita.duracion_total && (
                                              <span style={{ opacity: 0.7, fontSize: '0.9rem' }}>
                                                {cita.duracion_total} min
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              })()}
                              <div>
                                <strong>Barbero:</strong> {cita.barbero_nombre}
                              </div>
                              <div>
                                <strong>Estado:</strong> 
                                <span style={{ 
                                  color: getEstadoColor(cita.estado),
                                  fontWeight: '600',
                                  marginLeft: '0.5rem'
                                }}>
                                  {cita.estado.charAt(0).toUpperCase() + cita.estado.slice(1)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Contact Info */}
                    <div style={{ 
                      marginTop: '2rem',
                      padding: '1.5rem',
                      background: 'var(--bg-primary)',
                      borderRadius: 'var(--border-radius)',
                      border: '1px solid var(--border-color)',
                      textAlign: 'center'
                    }}>
                      <h4 style={{ color: 'var(--accent-color)', marginBottom: '1rem' }}>
                        ¿Necesitas ayuda?
                      </h4>
                      <p style={{ marginBottom: '1rem' }}>
                        Si necesitas cancelar, reprogramar o tienes alguna consulta sobre tu cita:
                      </p>
                      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <a 
                          href="https://wa.me/56983588553" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn btn-primary"
                          style={{ padding: '10px 20px' }}
                        >
                          <i className="fab fa-whatsapp"></i>
                          WhatsApp
                        </a>
                        <a 
                          href="tel:+56983588553"
                          className="btn btn-secondary"
                          style={{ padding: '10px 20px' }}
                          >
                          <i className="fas fa-phone"></i>
                          Llamar
                        </a>
                      </div>
                      <p style={{ fontSize: '0.85rem', opacity: '0.7', marginTop: '1rem' }}>
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
