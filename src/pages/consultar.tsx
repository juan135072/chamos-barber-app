import React, { useState } from 'react'
import Layout from '../components/Layout'

interface Cita {
  id: string
  servicio_nombre: string
  barbero_nombre: string
  fecha: string
  hora: string
  estado: string
  notas?: string
  precio?: number
}

const ConsultarPage: React.FC = () => {
  const [telefono, setTelefono] = useState('')
  const [citas, setCitas] = useState<Cita[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!telefono.trim()) {
      alert('Por favor, ingresa tu número de teléfono')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/consultar-citas?telefono=${encodeURIComponent(telefono)}`)
      if (response.ok) {
        const data = await response.json()
        setCitas(data.citas || [])
      } else {
        console.error('Error consulting appointments')
        setCitas([])
      }
    } catch (error) {
      console.error('Error:', error)
      setCitas([])
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
                    {/* Próximas Citas */}
                    {upcomingCitas.length > 0 && (
                      <div className="appointments-section">
                        <h3>
                          <i className="fas fa-calendar-plus" style={{ marginRight: '0.5rem' }}></i>
                          Próximas Citas ({upcomingCitas.length})
                        </h3>
                        {upcomingCitas.map(cita => (
                          <div key={cita.id} className="appointment-card">
                            <div className="appointment-date">
                              <i className="fas fa-calendar"></i> {formatDate(cita.fecha)} a las {cita.hora}
                            </div>
                            <div className="appointment-details">
                              <div>
                                <strong>Servicio:</strong> {cita.servicio_nombre}
                              </div>
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
                              {cita.precio && (
                                <div>
                                  <strong>Precio:</strong> ${cita.precio.toLocaleString()}
                                </div>
                              )}
                            </div>
                            {cita.notas && (
                              <div style={{ 
                                marginTop: '1rem', 
                                padding: '0.75rem',
                                background: 'rgba(212, 175, 55, 0.1)',
                                borderRadius: 'var(--border-radius)',
                                fontSize: '0.9rem'
                              }}>
                                <strong>Notas:</strong> {cita.notas}
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
                              <div>
                                <strong>Servicio:</strong> {cita.servicio_nombre}
                              </div>
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
                              {cita.precio && (
                                <div>
                                  <strong>Precio:</strong> ${cita.precio.toLocaleString()}
                                </div>
                              )}
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
                          href="https://wa.me/56912345678" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn btn-primary"
                          style={{ padding: '10px 20px' }}
                        >
                          <i className="fab fa-whatsapp"></i>
                          WhatsApp
                        </a>
                        <a 
                          href="tel:+56912345678"
                          className="btn btn-secondary"
                          style={{ padding: '10px 20px' }}
                        >
                          <i className="fas fa-phone"></i>
                          Llamar
                        </a>
                      </div>
                      <p style={{ fontSize: '0.85rem', opacity: '0.7', marginTop: '1rem' }}>
                        Horario de atención: Lunes a Viernes 9:00 AM - 7:00 PM
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