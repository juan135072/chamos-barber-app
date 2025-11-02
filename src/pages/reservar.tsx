import React, { useState, useEffect } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import Layout from '../components/Layout'
import { chamosSupabase } from '../../lib/supabase-helpers'
import type { Database } from '../../lib/database.types'

type Barbero = Database['public']['Tables']['barberos']['Row']
type Servicio = Database['public']['Tables']['servicios']['Row']

const ReservarPage: React.FC = () => {
  const supabase = useSupabaseClient<Database>()
  const [currentStep, setCurrentStep] = useState(1)
  const [barberos, setBarberos] = useState<Barbero[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [formData, setFormData] = useState({
    servicio_id: '',
    barbero_id: '',
    fecha: '',
    hora: '',
    cliente_nombre: '',
    cliente_telefono: '',
    cliente_email: '',
    notas: ''
  })
  const [loading, setLoading] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<{hora: string, disponible: boolean, motivo?: string}[]>([])

  const totalSteps = 5

  useEffect(() => {
    loadBarberosYServicios()
  }, [])

  useEffect(() => {
    if (formData.fecha && formData.barbero_id) {
      loadAvailableSlots()
    }
  }, [formData.fecha, formData.barbero_id])

  const loadBarberosYServicios = async () => {
    try {
      // Cargar barberos usando helper de Supabase
      const barberosData = await chamosSupabase.getBarberos(true)
      setBarberos(barberosData || [])

      // Cargar servicios usando helper de Supabase
      const serviciosData = await chamosSupabase.getServicios(true)
      setServicios(serviciosData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const loadAvailableSlots = async () => {
    try {
      console.log('🔍 Cargando horarios disponibles para:', {
        barbero_id: formData.barbero_id,
        fecha: formData.fecha
      })
      
      const data = await chamosSupabase.getHorariosDisponibles(formData.barbero_id, formData.fecha)
      
      if (data && data.length > 0) {
        console.log('✅ Horarios recibidos:', data.length, 'slots')
        console.log('📊 Disponibles:', data.filter((s: any) => s.disponible).length)
        console.log('❌ Ocupados:', data.filter((s: any) => !s.disponible).length)
        setAvailableSlots(data)
      } else {
        console.warn('⚠️ No se recibieron horarios, usando defaults')
        // Horarios por defecto si la función no existe o falla
        const defaultSlots = [
          { hora: '09:00', disponible: true, motivo: 'Disponible' },
          { hora: '09:30', disponible: true, motivo: 'Disponible' },
          { hora: '10:00', disponible: true, motivo: 'Disponible' },
          { hora: '10:30', disponible: true, motivo: 'Disponible' },
          { hora: '11:00', disponible: true, motivo: 'Disponible' },
          { hora: '11:30', disponible: true, motivo: 'Disponible' },
          { hora: '12:00', disponible: true, motivo: 'Disponible' },
          { hora: '12:30', disponible: true, motivo: 'Disponible' },
          { hora: '14:00', disponible: true, motivo: 'Disponible' },
          { hora: '14:30', disponible: true, motivo: 'Disponible' },
          { hora: '15:00', disponible: true, motivo: 'Disponible' },
          { hora: '15:30', disponible: true, motivo: 'Disponible' },
          { hora: '16:00', disponible: true, motivo: 'Disponible' },
          { hora: '16:30', disponible: true, motivo: 'Disponible' },
          { hora: '17:00', disponible: true, motivo: 'Disponible' },
          { hora: '17:30', disponible: true, motivo: 'Disponible' },
          { hora: '18:00', disponible: true, motivo: 'Disponible' },
          { hora: '18:30', disponible: true, motivo: 'Disponible' }
        ]
        setAvailableSlots(defaultSlots)
      }
    } catch (error) {
      console.error('❌ Error loading available slots:', error)
      // Horarios por defecto en caso de error
      const defaultSlots = [
        { hora: '09:00', disponible: true, motivo: 'Disponible' },
        { hora: '09:30', disponible: true, motivo: 'Disponible' },
        { hora: '10:00', disponible: true, motivo: 'Disponible' },
        { hora: '10:30', disponible: true, motivo: 'Disponible' },
        { hora: '11:00', disponible: true, motivo: 'Disponible' },
        { hora: '11:30', disponible: true, motivo: 'Disponible' },
        { hora: '12:00', disponible: true, motivo: 'Disponible' },
        { hora: '12:30', disponible: true, motivo: 'Disponible' },
        { hora: '14:00', disponible: true, motivo: 'Disponible' },
        { hora: '14:30', disponible: true, motivo: 'Disponible' },
        { hora: '15:00', disponible: true, motivo: 'Disponible' },
        { hora: '15:30', disponible: true, motivo: 'Disponible' },
        { hora: '16:00', disponible: true, motivo: 'Disponible' },
        { hora: '16:30', disponible: true, motivo: 'Disponible' },
        { hora: '17:00', disponible: true, motivo: 'Disponible' },
        { hora: '17:30', disponible: true, motivo: 'Disponible' },
        { hora: '18:00', disponible: true, motivo: 'Disponible' },
        { hora: '18:30', disponible: true, motivo: 'Disponible' }
      ]
      setAvailableSlots(defaultSlots)
    }
  }

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // Crear cita usando helper de Supabase
      await chamosSupabase.createCita({
        servicio_id: formData.servicio_id,
        barbero_id: formData.barbero_id,
        fecha: formData.fecha,
        hora: formData.hora,
        cliente_nombre: formData.cliente_nombre,
        cliente_telefono: formData.cliente_telefono,
        cliente_email: formData.cliente_email || null,
        notas: formData.notas || null,
        estado: 'pendiente'
      })

      alert('¡Cita reservada exitosamente! Te contactaremos pronto para confirmar.')
      
      // Reset form
      setFormData({
        servicio_id: '',
        barbero_id: '',
        fecha: '',
        hora: '',
        cliente_nombre: '',
        cliente_telefono: '',
        cliente_email: '',
        notas: ''
      })
      setCurrentStep(1)
    } catch (error) {
      console.error('Error:', error)
      if (error instanceof Error) {
        alert(error.message)
      } else {
        alert('Error al reservar la cita. Por favor, inténtalo de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  const getImageUrl = (imagen_url: string | null) => {
    if (!imagen_url) return 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100&q=80'
    if (imagen_url.startsWith('http')) return imagen_url
    return `/images/barberos/${imagen_url}`
  }

  const getMinDate = () => {
    const today = new Date()
    today.setDate(today.getDate() + 1) // Mínimo mañana
    return today.toISOString().split('T')[0]
  }

  const getMaxDate = () => {
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 30) // Máximo 30 días
    return maxDate.toISOString().split('T')[0]
  }

  return (
    <Layout 
      title="Reservar Cita - Chamos Barber"
      description="Reserva tu cita con nuestros expertos barberos. Proceso simple y rápido para garantizar tu lugar."
    >
      <section className="page-header">
        <div className="container">
          <h1 className="page-title">Reservar Cita</h1>
          <p className="page-subtitle">Sigue los pasos para reservar tu cita con nosotros</p>
        </div>
      </section>

      <section style={{ padding: '4rem 0' }}>
        <div className="container">
          <div className="booking-form">
            {/* Progress Bar */}
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              ></div>
            </div>

            {/* Step 1: Servicio */}
            {currentStep === 1 && (
              <div className="form-step active">
                <div className="step-header">
                  <h2 className="step-title">Selecciona un Servicio</h2>
                  <p className="step-subtitle">¿Qué servicio necesitas hoy?</p>
                </div>

                <div style={{ display: 'grid', gap: '1rem' }}>
                  {servicios.map(servicio => (
                    <div 
                      key={servicio.id}
                      className={`barber-option ${formData.servicio_id === servicio.id ? 'selected' : ''}`}
                      onClick={() => handleInputChange('servicio_id', servicio.id)}
                      style={{ textAlign: 'left', padding: '1.5rem' }}
                    >
                      <h3 style={{ color: 'var(--accent-color)', marginBottom: '0.5rem' }}>
                        {servicio.nombre}
                      </h3>
                      <p style={{ opacity: '0.8', marginBottom: '1rem', fontSize: '0.9rem' }}>
                        {servicio.descripcion}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '600', color: 'var(--accent-color)' }}>
                          ${servicio.precio.toLocaleString()}
                        </span>
                        <span style={{ fontSize: '0.9rem', opacity: '0.8' }}>
                          {servicio.duracion_minutos} min
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Barbero */}
            {currentStep === 2 && (
              <div className="form-step active">
                <div className="step-header">
                  <h2 className="step-title">Elige tu Barbero</h2>
                  <p className="step-subtitle">Selecciona con quién prefieres atenderte</p>
                </div>

                <div className="barbers-grid">
                  {barberos.map(barbero => (
                    <div 
                      key={barbero.id}
                      className={`barber-option ${formData.barbero_id === barbero.id ? 'selected' : ''}`}
                      onClick={() => handleInputChange('barbero_id', barbero.id)}
                    >
                      <img 
                        src={getImageUrl(barbero.imagen_url)} 
                        alt={`${barbero.nombre} ${barbero.apellido}`}
                        style={{ width: '80px', height: '80px', borderRadius: '50%', marginBottom: '1rem', objectFit: 'cover' }}
                      />
                      <h3 style={{ marginBottom: '0.5rem' }}>{barbero.nombre} {barbero.apellido}</h3>
                      <p style={{ fontSize: '0.8rem', opacity: '0.8' }}>
                        {barbero.especialidad}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Fecha y Hora */}
            {currentStep === 3 && (
              <div className="form-step active">
                <div className="step-header">
                  <h2 className="step-title">Fecha y Hora</h2>
                  <p className="step-subtitle">¿Cuándo te gustaría venir?</p>
                </div>

                <div className="calendar-container">
                  <div className="date-picker">
                    <label className="form-label">Selecciona una fecha:</label>
                    <input 
                      type="date"
                      className="form-input"
                      value={formData.fecha}
                      onChange={(e) => handleInputChange('fecha', e.target.value)}
                      min={getMinDate()}
                      max={getMaxDate()}
                    />
                  </div>

                  {formData.fecha && (
                    <div>
                      <label className="form-label">
                        Horarios disponibles:
                        {availableSlots.filter(slot => slot.disponible).length > 0 && (
                          <span style={{ fontSize: '0.85rem', opacity: 0.8, marginLeft: '0.5rem' }}>
                            ({availableSlots.filter(slot => slot.disponible).length} disponibles)
                          </span>
                        )}
                      </label>
                      
                      {availableSlots.filter(slot => slot.disponible).length === 0 ? (
                        <div style={{ 
                          padding: '2rem', 
                          textAlign: 'center',
                          background: 'rgba(239, 68, 68, 0.1)',
                          borderRadius: 'var(--border-radius)',
                          border: '1px solid rgba(239, 68, 68, 0.3)'
                        }}>
                          <i className="fas fa-calendar-times" style={{ fontSize: '2rem', color: '#ef4444', marginBottom: '1rem' }}></i>
                          <p style={{ margin: 0, fontWeight: '600' }}>
                            No hay horarios disponibles para esta fecha
                          </p>
                          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', opacity: 0.8 }}>
                            Por favor selecciona otra fecha o prueba con otro barbero
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="time-slots">
                            {availableSlots.filter(slot => slot.disponible).map(slot => (
                              <div 
                                key={slot.hora}
                                className={`time-slot ${formData.hora === slot.hora ? 'selected' : ''}`}
                                onClick={() => handleInputChange('hora', slot.hora)}
                                title="Click para seleccionar"
                              >
                                <span style={{ fontWeight: '600' }}>{slot.hora}</span>
                                <i className="fas fa-check-circle" style={{ 
                                  fontSize: '0.8rem', 
                                  marginLeft: '0.5rem',
                                  opacity: formData.hora === slot.hora ? 1 : 0
                                }}></i>
                              </div>
                            ))}
                          </div>
                          
                          {/* Mostrar horarios ocupados (informativo) */}
                          {availableSlots.filter(slot => !slot.disponible).length > 0 && (
                            <details style={{ marginTop: '1rem' }}>
                              <summary style={{ 
                                cursor: 'pointer', 
                                fontSize: '0.9rem', 
                                opacity: 0.7,
                                padding: '0.5rem',
                                userSelect: 'none'
                              }}>
                                <i className="fas fa-info-circle"></i> Ver horarios no disponibles ({availableSlots.filter(slot => !slot.disponible).length})
                              </summary>
                              <div style={{ 
                                marginTop: '0.5rem',
                                padding: '1rem',
                                background: 'rgba(107, 114, 128, 0.1)',
                                borderRadius: 'var(--border-radius)',
                                fontSize: '0.85rem'
                              }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem' }}>
                                  {availableSlots.filter(slot => !slot.disponible).map(slot => (
                                    <div 
                                      key={slot.hora}
                                      style={{
                                        padding: '0.5rem',
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        borderRadius: '0.375rem',
                                        opacity: 0.6,
                                        cursor: 'not-allowed',
                                        textAlign: 'center'
                                      }}
                                      title={slot.motivo || 'No disponible'}
                                    >
                                      <div style={{ fontWeight: '600', textDecoration: 'line-through' }}>
                                        {slot.hora}
                                      </div>
                                      <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                                        {slot.motivo === 'Ya reservado' && '🔒 Ocupado'}
                                        {slot.motivo === 'Hora pasada' && '⏰ Pasada'}
                                        {slot.motivo === 'Fuera de horario de trabajo' && '🚫 Cerrado'}
                                        {!slot.motivo && '❌ No disponible'}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </details>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Información Personal */}
            {currentStep === 4 && (
              <div className="form-step active">
                <div className="step-header">
                  <h2 className="step-title">Tus Datos</h2>
                  <p className="step-subtitle">Necesitamos tu información de contacto</p>
                </div>

                <div style={{ display: 'grid', gap: '1.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Nombre completo *</label>
                    <input 
                      type="text"
                      className="form-input"
                      value={formData.cliente_nombre}
                      onChange={(e) => handleInputChange('cliente_nombre', e.target.value)}
                      placeholder="Tu nombre completo"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Teléfono (WhatsApp) *</label>
                    <input 
                      type="tel"
                      className="form-input"
                      value={formData.cliente_telefono}
                      onChange={(e) => handleInputChange('cliente_telefono', e.target.value)}
                      placeholder="+56 9 1234 5678"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input 
                      type="email"
                      className="form-input"
                      value={formData.cliente_email}
                      onChange={(e) => handleInputChange('cliente_email', e.target.value)}
                      placeholder="tu@email.com"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Notas adicionales</label>
                    <textarea 
                      className="form-input"
                      value={formData.notas}
                      onChange={(e) => handleInputChange('notas', e.target.value)}
                      placeholder="Algún detalle especial o preferencia..."
                      rows={3}
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Confirmación */}
            {currentStep === 5 && (
              <div className="form-step active">
                <div className="step-header">
                  <h2 className="step-title">Confirma tu Reserva</h2>
                  <p className="step-subtitle">Revisa los detalles antes de confirmar</p>
                </div>

                <div style={{ 
                  background: 'var(--bg-primary)', 
                  padding: '2rem', 
                  borderRadius: 'var(--border-radius)',
                  border: '1px solid var(--border-color)'
                }}>
                  <h3 style={{ color: 'var(--accent-color)', marginBottom: '1rem' }}>
                    Resumen de tu cita:
                  </h3>
                  
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <div><strong>Servicio:</strong> {servicios.find(s => s.id === formData.servicio_id)?.nombre}</div>
                    <div><strong>Barbero:</strong> {(() => {
                      const barbero = barberos.find(b => b.id === formData.barbero_id)
                      return barbero ? `${barbero.nombre} ${barbero.apellido}` : ''
                    })()}</div>
                    <div><strong>Fecha:</strong> {new Date(formData.fecha + 'T00:00:00').toLocaleDateString('es-ES', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</div>
                    <div><strong>Hora:</strong> {formData.hora}</div>
                    <div><strong>Cliente:</strong> {formData.cliente_nombre}</div>
                    <div><strong>Teléfono:</strong> {formData.cliente_telefono}</div>
                    {formData.cliente_email && <div><strong>Email:</strong> {formData.cliente_email}</div>}
                    {formData.notas && <div><strong>Notas:</strong> {formData.notas}</div>}
                  </div>

                  <div style={{ 
                    marginTop: '2rem', 
                    padding: '1rem', 
                    background: 'rgba(212, 175, 55, 0.1)',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid var(--accent-color)'
                  }}>
                    <p style={{ fontSize: '0.9rem', opacity: '0.9' }}>
                      <strong>Nota:</strong> Te contactaremos por WhatsApp para confirmar tu cita. 
                      Si necesitas cancelar o reprogramar, hazlo con al menos 2 horas de anticipación.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="form-navigation">
              <button 
                type="button"
                className="btn btn-secondary"
                onClick={prevStep}
                disabled={currentStep === 1}
                style={{ opacity: currentStep === 1 ? 0.5 : 1 }}
              >
                <i className="fas fa-arrow-left"></i>
                Anterior
              </button>

              <span style={{ fontSize: '0.9rem', opacity: '0.8' }}>
                Paso {currentStep} de {totalSteps}
              </span>

              {currentStep < totalSteps ? (
                <button 
                  type="button"
                  className="btn btn-primary"
                  onClick={nextStep}
                  disabled={
                    (currentStep === 1 && !formData.servicio_id) ||
                    (currentStep === 2 && !formData.barbero_id) ||
                    (currentStep === 3 && (!formData.fecha || !formData.hora)) ||
                    (currentStep === 4 && (!formData.cliente_nombre || !formData.cliente_telefono))
                  }
                >
                  Siguiente
                  <i className="fas fa-arrow-right"></i>
                </button>
              ) : (
                <button 
                  type="button"
                  className={`btn btn-primary ${loading ? 'loading' : ''}`}
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="spinner"></div>
                      Reservando...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check"></i>
                      Confirmar Reserva
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  )
}

export default ReservarPage