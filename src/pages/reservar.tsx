import React, { useRef } from 'react'
import Layout from '../components/Layout'
import { formatPhoneInput, normalizePhone, isValidPhone, getPhonePlaceholder, getPhoneHint } from '../../lib/phone-utils'
import PhoneInput from '../components/PhoneInput'
import { useReservaWizard } from '../hooks/useReservaWizard'

const ReservarPage: React.FC = () => {
  const {
    currentStep,
    totalSteps,
    nextStep,
    prevStep,
    barberos,
    servicios,
    serviciosSeleccionados,
    setServiciosSeleccionados,
    formData,
    handleInputChange,
    availableSlots,
    sugerenciaParcial,
    loading,
    toggleServicio,
    actualizarCantidadServicio,
    calcularTotales,
    calculateEndTime,
    handleSubmit,
    getImageUrl,
    getMinDate,
    getMaxDate,
  } = useReservaWizard()

  const dateInputRef = useRef<HTMLInputElement>(null)

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
                      <span><strong>Servicio:</strong> {calcularTotales().duracionServicios} min</span>
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
                        <div style={{ flex: 1, paddingRight: '2rem' }}>
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

                            {isSelected ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); actualizarCantidadServicio(servicio.id, -1); }}
                                  style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '0.25rem' }}
                                >
                                  <i className="fas fa-minus" style={{ fontSize: '0.7rem' }}></i>
                                </button>
                                <span style={{ fontWeight: 'bold', minWidth: '1.5rem', textAlign: 'center' }}>
                                  {serviciosSeleccionados.filter(id => id === servicio.id).length}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); actualizarCantidadServicio(servicio.id, 1); }}
                                  style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', padding: '0.25rem' }}
                                >
                                  <i className="fas fa-plus" style={{ fontSize: '0.7rem' }}></i>
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.9rem', opacity: '0.8' }}>
                                {servicio.duracion_minutos} min
                              </span>
                            )}
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
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}></div>
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
                                <br />
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
                                      ? (isSelected ? 'var(--accent-color)' : 'var(--border-color)') // Borde neutro para disponibles no seleccionados
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
                                  {isAvailable && !isSelected && (
                                    <span style={{ fontSize: '0.6rem', display: 'block', marginTop: '2px', color: 'var(--text-secondary)', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                      Disponible
                                    </span>
                                  )}
                                  {!isAvailable && (
                                    <span style={{ fontSize: '0.65rem', display: 'block', marginTop: '2px', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
                                      {slot.motivo || 'No disponible'}
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                          </div>

                          {/* Feedback de hora de finalización */}
                          {formData.hora && (
                            <div className="mt-4 p-3 rounded-lg border border-[var(--accent-color)] bg-[var(--bg-secondary)] text-center animate-fadeIn">
                              <p className="text-sm">
                                <span className="opacity-80">Finaliza apróx.: </span>
                                <strong className="text-[var(--accent-color)] text-lg ml-1">
                                  {calculateEndTime(formData.hora)}
                                </strong>
                              </p>
                              <p className="text-xs opacity-60 mt-1">
                                Duración: {calcularTotales().duracionServicios} minutos
                              </p>
                            </div>
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

                  <PhoneInput
                    label="Teléfono (WhatsApp) *"
                    value={formData.cliente_telefono}
                    onChange={(val) => handleInputChange('cliente_telefono', val)}
                    required
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
                    Ingresa tu número de WhatsApp para contactarte.
                  </p>

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

            {/* Step 5: Confirmación Premium */}
            {currentStep === 5 && (
              <div className="form-step active animate-fadeIn">
                <div className="step-header">
                  <h2 className="step-title">Confirma tu Reserva</h2>
                  <p className="step-subtitle">Todo listo. Revisa tu ticket antes de confirmar.</p>
                </div>

                <div style={{
                  background: 'var(--bg-secondary)',
                  borderRadius: '16px',
                  border: '1px solid var(--border-color)',
                  overflow: 'hidden',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                }}>
                  {/* 1. Header del Ticket: Fecha y Hora Visual */}
                  <div style={{
                    background: 'linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-tertiary) 100%)',
                    padding: '2rem',
                    borderBottom: '1px dashed var(--border-color)',
                    position: 'relative'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <div style={{
                        background: 'var(--accent-color)',
                        color: 'var(--bg-primary)',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                      }}>
                        Reserva Pendiente
                      </div>
                      <div style={{ fontSize: '0.9rem', opacity: 0.6 }}>
                        {new Date().getFullYear()}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ display: 'block', fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.25rem' }}>INICIO</span>
                        <span style={{ display: 'block', fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{formData.hora}</span>
                      </div>

                      <div style={{ flex: 1, position: 'relative', height: '2px', background: 'var(--border-color)', margin: '0 1rem' }}>
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          background: 'var(--bg-secondary)',
                          padding: '0 0.5rem',
                          fontSize: '0.75rem',
                          color: 'var(--accent-color)',
                          fontWeight: '600',
                          whiteSpace: 'nowrap'
                        }}>
                          {calcularTotales().duracionTotal} min
                        </div>
                      </div>

                      <div style={{ textAlign: 'center' }}>
                        <span style={{ display: 'block', fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.25rem' }}>FIN APROX</span>
                        <span style={{ display: 'block', fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{calculateEndTime(formData.hora)}</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '1.1rem', fontWeight: '500' }}>
                      {new Date(formData.fecha + 'T00:00:00').toLocaleDateString('es-ES', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                      })}
                    </div>
                  </div>

                  {/* 2. Cuerpo del Ticket: Barbero y Servicios */}
                  <div style={{ padding: '2rem' }}>
                    {/* Barbero Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                      {(() => {
                        const barbero = barberos.find(b => b.id === formData.barbero_id)
                        return barbero ? (
                          <>
                            <img
                              src={getImageUrl(barbero.imagen_url)}
                              alt={barbero.nombre}
                              style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-color)' }}
                            />
                            <div>
                              <p style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.2rem' }}>TU PROFESIONAL</p>
                              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>{barbero.nombre} {barbero.apellido}</h3>
                            </div>
                          </>
                        ) : null
                      })()}
                    </div>

                    {/* Lista de Servicios */}
                    <div style={{ marginBottom: '2rem' }}>
                      <p style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Servicios Seleccionados</p>
                      {calcularTotales().serviciosInfo.map(servicio => (
                        <div key={servicio.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                          <div>
                            <span style={{ display: 'block', fontWeight: '500' }}>{servicio.nombre}</span>
                            <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{servicio.duracion_minutos} min</span>
                          </div>
                          <span style={{ fontWeight: '500' }}>${servicio.precio.toLocaleString()}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', fontSize: '1.2rem', color: 'var(--accent-color)' }}>
                        <span style={{ fontWeight: 'bold' }}>TOTAL A PAGAR</span>
                        <span style={{ fontWeight: 'bold' }}>${calcularTotales().precioTotal.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Datos de Contacto (Resumen Compacto) */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '8px' }}>
                      <p style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.5rem' }}>DATOS DE CONTACTO</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={{ fontWeight: '500' }}><i className="fas fa-user mr-2 opacity-50"></i> {formData.cliente_nombre}</span>
                        <span style={{ fontWeight: '500' }}><i className="fab fa-whatsapp mr-2 opacity-50"></i> {formData.cliente_telefono}</span>
                        {formData.cliente_email && <span style={{ fontSize: '0.9rem', opacity: 0.8 }}><i className="fas fa-envelope mr-2 opacity-50"></i> {formData.cliente_email}</span>}
                      </div>
                    </div>
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