import React, { useState, useEffect, useRef } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import Layout from '../components/Layout'
import { chamosSupabase } from '../../lib/supabase-helpers'
import type { Database } from '../../lib/database.types'
import { formatPhoneInput, normalizePhone, isValidChileanPhone, getPhonePlaceholder, getPhoneHint } from '../../lib/phone-utils'

// Build Version: 2025-11-06-v3 - Improved error handling for API calls

type Barbero = Database['public']['Tables']['barberos']['Row']
type Servicio = Database['public']['Tables']['servicios']['Row']

const ReservarPage: React.FC = () => {
  const supabase = useSupabaseClient<Database>()
  const [currentStep, setCurrentStep] = useState(1)
  const [barberos, setBarberos] = useState<Barbero[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<string[]>([])
  const [formData, setFormData] = useState({
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
  
  // Ref para el input de fecha
  const dateInputRef = useRef<HTMLInputElement>(null)

  const totalSteps = 5

  useEffect(() => {
    loadBarberosYServicios()
  }, [])

  const [sugerenciaParcial, setSugerenciaParcial] = useState<{
    servicio: Servicio,
    horarios: {hora: string, disponible: boolean}[]
  } | null>(null)

  useEffect(() => {
    if (formData.fecha && formData.barbero_id) {
      loadAvailableSlots()
    }
  }, [formData.fecha, formData.barbero_id, serviciosSeleccionados]) // Recargar si cambian servicios

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
      setSugerenciaParcial(null) // Reset sugerencia
      
      const { duracionTotal, serviciosInfo } = calcularTotales()
      const duracionSolicitada = duracionTotal > 0 ? duracionTotal : 30

      console.log('🔍 Cargando horarios disponibles para:', {
        barbero_id: formData.barbero_id,
        fecha: formData.fecha,
        duracion: duracionSolicitada
      })
      
      const data = await chamosSupabase.getHorariosDisponibles(
        formData.barbero_id, 
        formData.fecha,
        duracionSolicitada
      )
      
      if (data && data.some((s: any) => s.disponible)) {
        setAvailableSlots(data)
      } else {
        setAvailableSlots(data || [])
        
        // LÓGICA DE SUGERENCIA PARCIAL
        // Si no hay cupo total y hay múltiples servicios, intentar buscar cupo para uno solo
        if (serviciosInfo.length > 1) {
          // Ordenar servicios por duración (ascendente) para encontrar el que más fácil encaje
          const servicioAlternativo = [...serviciosInfo].sort((a, b) => a.duracion_minutos - b.duracion_minutos)[0]
          
          if (servicioAlternativo) {
            console.log('💡 Buscando alternativa parcial para:', servicioAlternativo.nombre)
            const dataAlternativa = await chamosSupabase.getHorariosDisponibles(
              formData.barbero_id,
              formData.fecha,
              servicioAlternativo.duracion_minutos
            )
            
            if (dataAlternativa && dataAlternativa.some((s: any) => s.disponible)) {
              setSugerenciaParcial({
                servicio: servicioAlternativo,
                horarios: dataAlternativa
              })
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error loading available slots:', error)
      setAvailableSlots([])
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

  const toggleServicio = (servicioId: string) => {
    setServiciosSeleccionados(prev => {
      if (prev.includes(servicioId)) {
        return prev.filter(id => id !== servicioId)
      } else {
        return [...prev, servicioId]
      }
    })
  }

  const calcularTotales = () => {
    const serviciosInfo = serviciosSeleccionados.map(id => 
      servicios.find(s => s.id === id)
    ).filter(Boolean) as Servicio[]

    const duracionTotal = serviciosInfo.reduce((sum, s) => sum + s.duracion_minutos, 0)
    const precioTotal = serviciosInfo.reduce((sum, s) => sum + s.precio, 0)

    return { duracionTotal, precioTotal, serviciosInfo }
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      console.log('📤 Enviando solicitud de cita...')
      
      // Usar API route en vez de helper directo
      // Esto bypassa el problema de RLS usando SERVICE_ROLE_KEY en el backend
      const response = await fetch('/api/crear-cita', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          servicio_id: serviciosSeleccionados[0], // Primer servicio (para compatibilidad)
          servicios_ids: serviciosSeleccionados, // Array completo de servicios
          barbero_id: formData.barbero_id,
          fecha: formData.fecha,
          hora: formData.hora,
          cliente_nombre: formData.cliente_nombre,
          cliente_telefono: normalizePhone(formData.cliente_telefono), // Normalizar antes de guardar
          cliente_email: formData.cliente_email || null,
          notas: formData.notas || null,
          estado: 'pendiente'
        })
      })

      console.log('📥 Respuesta recibida:', response.status, response.statusText)

      // Verificar si la respuesta es JSON válido
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        console.error('❌ Respuesta no es JSON:', contentType)
        throw new Error(`Error del servidor: ${response.status} ${response.statusText}. La respuesta no es JSON. Esto puede indicar un problema con el servidor o la configuración de Coolify.`)
      }

      const result = await response.json()
      console.log('📋 Resultado:', result)

      if (!response.ok) {
        throw new Error(result.error || 'Error al crear la cita')
      }

      alert(result.message || '¡Cita reservada exitosamente! Te contactaremos pronto para confirmar.')
      
      // Reset form
      setServiciosSeleccionados([])
      setFormData({
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
      console.error('❌ Error completo:', error)
      if (error instanceof Error) {
        alert(`Error: ${error.message}`)
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
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
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

            {/* Step 1: Servicios (Múltiples) */}
            {currentStep === 1 && (
              <div className="form-step active">
                <div className="step-header">
                  <h2 className="step-title">Selecciona tus Servicios</h2>
                  <p className="step-subtitle">Puedes seleccionar uno o más servicios</p>
                </div>

                {serviciosSeleccionados.length > 0 && (
                  <div style={{
                    marginBottom: '1.5rem',
                    padding: '1rem',
                    background: 'rgba(212, 175, 55, 0.1)',
                    border: '1px solid var(--accent-color)',
                    borderRadius: 'var(--border-radius)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: '600', color: 'var(--accent-color)' }}>
                        <i className="fas fa-check-circle"></i> {serviciosSeleccionados.length} servicio{serviciosSeleccionados.length !== 1 ? 's' : ''} seleccionado{serviciosSeleccionados.length !== 1 ? 's' : ''}
                      </span>
                      <button 
                        type="button"
                        onClick={() => setServiciosSeleccionados([])}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          textDecoration: 'underline'
                        }}
                      >
                        Limpiar selección
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem' }}>
                      <span><strong>Duración total:</strong> {calcularTotales().duracionTotal} min</span>
                      <span><strong>Precio total:</strong> ${calcularTotales().precioTotal.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gap: '1rem' }}>
                  {servicios.map(servicio => {
                    const isSelected = serviciosSeleccionados.includes(servicio.id)
                    return (
                      <div 
                        key={servicio.id}
                        className={`barber-option ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleServicio(servicio.id)}
                        style={{ 
                          textAlign: 'left', 
                          padding: '1.5rem',
                          cursor: 'pointer',
                          position: 'relative',
                          display: 'flex',
                          gap: '1rem',
                          alignItems: 'flex-start'
                        }}
                      >
                        {/* Checkbox */}
                        <div style={{ 
                          position: 'absolute',
                          top: '1rem',
                          right: '1rem',
                          width: '24px',
                          height: '24px',
                          borderRadius: '4px',
                          border: `2px solid ${isSelected ? 'var(--accent-color)' : 'var(--border-color)'}`,
                          background: isSelected ? 'var(--accent-color)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.3s ease'
                        }}>
                          {isSelected && <i className="fas fa-check" style={{ color: 'var(--bg-primary)', fontSize: '0.75rem' }}></i>}
                        </div>

                        {/* Imagen del servicio */}
                        {servicio.imagen_url && (
                          <div style={{
                            flexShrink: 0,
                            width: '80px',
                            height: '80px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: '2px solid var(--border-color)'
                          }}>
                            <img 
                              src={servicio.imagen_url}
                              alt={servicio.nombre}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }}
                              onError={(e) => {
                                // Fallback si la imagen no carga
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          </div>
                        )}

                        {/* Contenido del servicio */}
                        <div style={{ flex: 1, paddingRight: '3rem' }}>
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
                      </div>
                    )
                  })}
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
                        {barbero.especialidades?.join(', ') || 'Barbero profesional'}
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
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <i className="fas fa-calendar-alt" style={{ color: 'var(--accent-color)' }}></i>
                      Selecciona una fecha (haz click en el calendario):
                    </label>
                    <div 
                      onClick={() => {
                        // Al hacer click en cualquier parte del wrapper, abrir el calendario
                        if (dateInputRef.current) {
                          // Intentar usar showPicker() (navegadores modernos)
                          if (typeof dateInputRef.current.showPicker === 'function') {
                            try {
                              dateInputRef.current.showPicker()
                            } catch (error) {
                              // Fallback: hacer focus en el input
                              dateInputRef.current.focus()
                              dateInputRef.current.click()
                            }
                          } else {
                            // Fallback para navegadores antiguos
                            dateInputRef.current.focus()
                            dateInputRef.current.click()
                          }
                        }
                      }}
                      style={{ 
                        position: 'relative',
                        border: '2px solid var(--accent-color)',
                        borderRadius: 'var(--border-radius)',
                        overflow: 'hidden',
                        transition: 'all 0.3s ease',
                        boxShadow: !formData.fecha ? '0 0 0 3px rgba(212, 175, 55, 0.1)' : 'none',
                        cursor: 'pointer'
                      }}
                      className="date-input-wrapper"
                    >
                      <input 
                        ref={dateInputRef}
                        type="date"
                        className="form-input"
                        value={formData.fecha}
                        onChange={(e) => handleInputChange('fecha', e.target.value)}
                        min={getMinDate()}
                        max={getMaxDate()}
                        onClick={(e) => {
                          // Prevenir que el click en el input también dispare el del wrapper
                          e.stopPropagation()
                          // Abrir el calendario directamente
                          if (typeof e.currentTarget.showPicker === 'function') {
                            try {
                              e.currentTarget.showPicker()
                            } catch (error) {
                              console.log('showPicker not supported')
                            }
                          }
                        }}
                        style={{
                          cursor: 'pointer',
                          fontSize: '1.1rem',
                          height: '3.5rem',
                          border: 'none',
                          fontWeight: '500'
                        }}
                        placeholder="dd/mm/aaaa"
                      />

                    </div>

                  </div>

                  {formData.fecha && (
                    <div>
                      <label className="form-label">
                        Horarios:
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.8rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--bg-primary)', border: '1px solid var(--accent-color)' }}></div>
                            Disponible
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}></div>
                            Ocupado
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--accent-color)', border: '1px solid var(--accent-color)' }}></div>
                            Seleccionado
                          </span>
                        </div>
                      </label>
                      
                      {availableSlots.length === 0 || !availableSlots.some(s => s.disponible) ? (
                        <div style={{ 
                          padding: '2rem', 
                          textAlign: 'center',
                          background: 'rgba(239, 68, 68, 0.1)',
                          borderRadius: 'var(--border-radius)',
                          border: '1px solid rgba(239, 68, 68, 0.3)'
                        }}>
                          <i className="fas fa-calendar-times" style={{ fontSize: '2rem', color: '#ef4444', marginBottom: '1rem' }}></i>
                          <p style={{ margin: 0, fontWeight: '600' }}>
                            No hay horarios disponibles para todos los servicios seleccionados
                          </p>
                          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', opacity: 0.8 }}>
                            {(() => {
                              if (!formData.fecha) return 'Por favor selecciona otra fecha.'
                              
                              const date = new Date(formData.fecha + 'T00:00:00')
                              const day = date.getDay()
                              const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
                              const selectedDay = days[day]
                              
                              return `El tiempo total requerido (${calcularTotales().duracionTotal} min) no cabe en la agenda del ${selectedDay}.`
                            })()}
                          </p>

                          {/* SUGERENCIA PARCIAL */}
                          {sugerenciaParcial && (
                            <div className="mt-4 p-3 bg-[var(--bg-secondary)] border border-[var(--accent-color)] rounded-lg text-left animate-pulse">
                              <p className="text-sm font-semibold text-[var(--accent-color)] mb-1">
                                <i className="fas fa-lightbulb mr-2"></i> Sugerencia:
                              </p>
                              <p className="text-sm mb-3">
                                No tenemos espacio para todo, pero sí puedes reservar solo:
                                <br/>
                                <strong className="text-white">{sugerenciaParcial.servicio.nombre} ({sugerenciaParcial.servicio.duracion_minutos} min)</strong>
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setServiciosSeleccionados([sugerenciaParcial.servicio.id])
                                }}
                                className="w-full py-2 bg-[var(--accent-color)] text-[var(--bg-primary)] font-bold rounded hover:opacity-90 transition-opacity text-sm"
                              >
                                Reservar solo {sugerenciaParcial.servicio.nombre}
                              </button>
                            </div>
                          )}

                          <button 
                            type="button"
                            onClick={() => {
                                handleInputChange('fecha', '')
                                if (dateInputRef.current) {
                                    setTimeout(() => {
                                        try {
                                            dateInputRef.current?.showPicker()
                                        } catch (e) {
                                            dateInputRef.current?.focus()
                                        }
                                    }, 100)
                                }
                            }}
                            style={{
                                marginTop: '1rem',
                                padding: '0.5rem 1rem',
                                background: 'transparent',
                                border: '1px solid var(--accent-color)',
                                color: 'var(--accent-color)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(212, 175, 55, 0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            Seleccionar otra fecha
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="time-slots">
                            {availableSlots.map(slot => {
                              const isAvailable = slot.disponible
                              const isSelected = formData.hora === slot.hora
                              
                              return (
                                <div 
                                  key={slot.hora}
                                  className={`time-slot ${isSelected ? 'selected' : ''}`}
                                  onClick={() => isAvailable ? handleInputChange('hora', slot.hora) : null}
                                  title={isAvailable ? "Click para seleccionar" : "Horario no disponible"}
                                  style={{
                                    opacity: isAvailable ? 1 : 0.4,
                                    cursor: isAvailable ? 'pointer' : 'not-allowed',
                                    backgroundColor: isAvailable 
                                      ? (isSelected ? 'var(--accent-color)' : 'rgba(212, 175, 55, 0.05)') // Fondo sutil dorado para disponibles
                                      : 'rgba(255, 255, 255, 0.05)',
                                    borderColor: isAvailable 
                                      ? (isSelected ? 'var(--accent-color)' : 'rgba(212, 175, 55, 0.5)') // Borde dorado visible para coincidir con leyenda
                                      : 'transparent',
                                    transform: isAvailable && isSelected ? 'scale(1.05)' : 'scale(1)',
                                    pointerEvents: isAvailable ? 'auto' : 'none',
                                    color: isAvailable ? (isSelected ? 'var(--bg-primary)' : 'var(--text-primary)') : 'var(--text-secondary)'
                                  }}
                                >
                                  <span style={{ fontWeight: isAvailable ? '600' : '400' }}>{slot.hora}</span>
                                  {isAvailable && isSelected && (
                                    <i className="fas fa-check-circle" style={{ 
                                      fontSize: '0.8rem', 
                                      marginLeft: '0.5rem'
                                    }}></i>
                                  )}
                                  {!isAvailable && (
                                    <span style={{ fontSize: '0.7rem', display: 'block', marginTop: '2px', fontStyle: 'italic' }}>Ocupado</span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
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
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <i className="fab fa-whatsapp" style={{ color: '#25D366' }}></i>
                      Teléfono (WhatsApp) *
                    </label>
                    <input 
                      type="tel"
                      className="form-input"
                      value={formData.cliente_telefono}
                      onChange={(e) => {
                        // Formatear automáticamente mientras escribe
                        const formatted = formatPhoneInput(e.target.value)
                        handleInputChange('cliente_telefono', formatted)
                      }}
                      placeholder={getPhonePlaceholder()}
                      required
                      maxLength={17} // +56 9 1234 5678 = 17 caracteres
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '1.1rem',
                        letterSpacing: '0.05em'
                      }}
                    />
                    <p style={{ 
                      fontSize: '0.85rem', 
                      marginTop: '0.5rem',
                      opacity: 0.8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <i className="fas fa-info-circle" style={{ color: 'var(--accent-color)' }}></i>
                      {getPhoneHint()}
                    </p>
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
                    <div>
                      <strong>Servicio{serviciosSeleccionados.length > 1 ? 's' : ''}:</strong>
                      <ul style={{ margin: '0.5rem 0 0 1.5rem', padding: 0 }}>
                        {calcularTotales().serviciosInfo.map(servicio => (
                          <li key={servicio.id} style={{ marginBottom: '0.25rem' }}>
                            {servicio.nombre} - ${servicio.precio.toLocaleString()} ({servicio.duracion_minutos} min)
                          </li>
                        ))}
                      </ul>
                      <div style={{ marginTop: '0.5rem', fontWeight: '600', color: 'var(--accent-color)' }}>
                        Total: ${calcularTotales().precioTotal.toLocaleString()} - {calcularTotales().duracionTotal} min
                      </div>
                    </div>
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
                    (currentStep === 1 && serviciosSeleccionados.length === 0) ||
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