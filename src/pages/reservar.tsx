import React, { useRef } from 'react'
import Layout from '../components/Layout'
import { formatPhoneInput, normalizePhone, isValidPhone, getPhonePlaceholder, getPhoneHint } from '@/lib/phone-utils'
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
      <section className="relative overflow-hidden bg-[#080808] pt-24 pb-12">
        {/* Background Orbs */}
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-gold/10 blur-[120px] rounded-full pointer-events-none z-0" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-white/5 blur-[120px] rounded-full pointer-events-none z-0" />

        <div className="relative z-10 container mx-auto text-center px-6">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white mb-4">
            Reservar <span className="italic font-serif font-normal bg-gradient-to-r from-gold to-yellow-300 bg-clip-text text-transparent">Cita</span>
          </h1>
          <p className="text-lg text-white/60 font-medium tracking-wide">
            Sigue los pasos para reservar tu cita con nuestros expertos barberos
          </p>
        </div>
      </section>

      <section className="relative bg-[#080808] pb-24">
        {/* Additional Orb for the form area */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold/5 blur-[150px] rounded-full pointer-events-none z-0" />
        
        <div className="relative z-10 container mx-auto px-4 max-w-4xl">
          <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-6 md:p-10 backdrop-blur-2xl shadow-2xl">
            {/* Progress Bar */}
            <div className="w-full bg-white/5 h-2 rounded-full mb-10 overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-gold to-yellow-400 rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(212,175,55,0.5)]"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              ></div>
            </div>

            {/* Step 1: Servicios (Múltiples) */}
            {currentStep === 1 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-white mb-2">Selecciona tus Servicios</h2>
                  <p className="text-white/60">Puedes seleccionar uno o más servicios</p>
                </div>

                {serviciosSeleccionados.length > 0 && (
                  <div className="mb-6 p-4 bg-gold/10 border border-gold/30 rounded-xl backdrop-blur-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-gold flex items-center gap-2">
                        <i className="fas fa-check-circle"></i> {serviciosSeleccionados.length} servicio{serviciosSeleccionados.length !== 1 ? 's' : ''} seleccionado{serviciosSeleccionados.length !== 1 ? 's' : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => setServiciosSeleccionados([])}
                        className="text-sm text-white/50 hover:text-white underline transition-colors"
                      >
                        Limpiar selección
                      </button>
                    </div>
                    <div className="flex gap-6 text-sm text-white/80">
                      <span><strong className="text-white">Duración:</strong> {calcularTotales().duracionServicios} min</span>
                      <span><strong className="text-white">Precio total:</strong> <span className="text-gold font-semibold">${calcularTotales().precioTotal.toLocaleString()}</span></span>
                    </div>
                  </div>
                )}

                <div className="grid gap-4">
                  {servicios.map(servicio => {
                    const isSelected = serviciosSeleccionados.includes(servicio.id)
                    return (
                      <div
                        key={servicio.id}
                        className={`relative flex gap-4 items-start p-6 rounded-2xl cursor-pointer transition-all duration-300 border ${
                          isSelected 
                            ? 'bg-gold/10 border-gold/50 shadow-[0_0_15px_rgba(212,175,55,0.15)]' 
                            : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04] hover:border-gold/30'
                        } backdrop-blur-sm`}
                        onClick={() => toggleServicio(servicio.id)}
                      >
                        {/* Checkbox */}
                        <div className={`absolute top-4 right-4 w-6 h-6 rounded flex items-center justify-center transition-all duration-300 border-2 ${
                          isSelected ? 'border-gold bg-gold' : 'border-white/20 bg-transparent'
                        }`}>
                          {isSelected && <i className="fas fa-check text-[#080808] text-xs"></i>}
                        </div>

                        {/* Imagen del servicio */}
                        {servicio.imagen_url && (
                          <div className="shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-white/10">
                            <img
                              src={servicio.imagen_url}
                              alt={servicio.nombre}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Fallback si la imagen no carga
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          </div>
                        )}

                        {/* Contenido del servicio */}
                        <div className="flex-1 pr-8">
                          <h3 className="text-xl font-semibold text-gold mb-2">
                            {servicio.nombre}
                          </h3>
                          <p className="text-white/60 text-sm mb-4">
                            {servicio.descripcion}
                          </p>
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-gold text-lg">
                              ${servicio.precio.toLocaleString()}
                            </span>

                            {isSelected ? (
                              <div className="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => actualizarCantidadServicio(servicio.id, -1)}
                                  className="text-white/60 hover:text-white transition-colors p-1"
                                >
                                  <i className="fas fa-minus text-xs"></i>
                                </button>
                                <span className="font-bold text-white min-w-[1.5rem] text-center">
                                  {serviciosSeleccionados.filter(id => id === servicio.id).length}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => actualizarCantidadServicio(servicio.id, 1)}
                                  className="text-gold hover:text-yellow-400 transition-colors p-1"
                                >
                                  <i className="fas fa-plus text-xs"></i>
                                </button>
                              </div>
                            ) : (
                              <span className="text-sm text-white/50 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                                <i className="far fa-clock mr-1.5"></i>
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
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-white mb-2">Elige tu Barbero</h2>
                  <p className="text-white/60">Selecciona con quién prefieres atenderte</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {barberos.map(barbero => {
                    const isSelected = formData.barbero_id === barbero.id;
                    return (
                      <div
                        key={barbero.id}
                        className={`relative flex flex-col items-center p-6 rounded-2xl cursor-pointer transition-all duration-300 border text-center ${
                          isSelected 
                            ? 'bg-gold/10 border-gold/50 shadow-[0_0_15px_rgba(212,175,55,0.15)]' 
                            : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04] hover:border-gold/30'
                        } backdrop-blur-sm`}
                        onClick={() => handleInputChange('barbero_id', barbero.id)}
                      >
                        {/* Selected Indicator */}
                        <div className={`absolute top-4 right-4 w-6 h-6 rounded flex items-center justify-center transition-all duration-300 border-2 ${
                          isSelected ? 'border-gold bg-gold' : 'border-white/20 bg-transparent'
                        }`}>
                          {isSelected && <i className="fas fa-check text-[#080808] text-xs"></i>}
                        </div>

                        <img
                          src={getImageUrl(barbero.imagen_url)}
                          alt={`${barbero.nombre} ${barbero.apellido}`}
                          className="w-24 h-24 rounded-full mb-4 object-cover border-2 border-white/10"
                        />
                        <h3 className="text-lg font-semibold text-gold mb-1">{barbero.nombre} {barbero.apellido}</h3>
                        <p className="text-sm text-white/60">
                          {barbero.especialidades?.join(', ') || 'Barbero profesional'}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Fecha y Hora */}
            {currentStep === 3 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-white mb-2">Fecha y Hora</h2>
                  <p className="text-white/60">¿Cuándo te gustaría venir?</p>
                </div>

                <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-md">
                  <div className="mb-8">
                    <label className="flex items-center gap-2 mb-3 text-white/80 font-medium">
                      <i className="fas fa-calendar-alt text-gold"></i>
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
                    <div className="animate-in fade-in duration-500 mt-8 pt-8 border-t border-white/10">
                      <div className="mb-6">
                        <label className="text-white/80 font-medium block mb-3">Horarios:</label>
                        <div className="flex flex-wrap gap-4 text-xs">
                          <span className="flex items-center gap-2 text-white/60">
                            <div className="w-3 h-3 rounded-full bg-white/5 border border-white/20"></div>
                            Disponible
                          </span>
                          <span className="flex items-center gap-2 text-white/60">
                            <div className="w-3 h-3 rounded-full bg-white/[0.02] border border-white/5"></div>
                            Ocupado
                          </span>
                          <span className="flex items-center gap-2 text-white/60">
                            <div className="w-3 h-3 rounded-full bg-gold border border-gold shadow-[0_0_8px_rgba(212,175,55,0.5)]"></div>
                            Seleccionado
                          </span>
                        </div>
                      </div>

                      {availableSlots.length === 0 || !availableSlots.some(s => s.disponible) ? (
                        <div className="p-8 text-center bg-red-500/10 rounded-2xl border border-red-500/30 backdrop-blur-md">
                          <i className="fas fa-calendar-times text-4xl text-red-400 mb-4 drop-shadow-[0_0_10px_rgba(248,113,113,0.5)]"></i>
                          <p className="font-semibold text-white text-lg">
                            No hay horarios disponibles para todos los servicios seleccionados
                          </p>
                          <p className="mt-2 text-white/70 text-sm">
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
                            <div className="mt-6 p-4 bg-white/5 border border-gold/30 rounded-xl text-left animate-pulse">
                              <p className="text-sm font-semibold text-gold mb-2">
                                <i className="fas fa-lightbulb mr-2"></i> Sugerencia:
                              </p>
                              <p className="text-sm text-white/80 mb-4">
                                No tenemos espacio para todo, pero sí puedes reservar solo:
                                <br />
                                <strong className="text-white block mt-1">{sugerenciaParcial.servicio.nombre} ({sugerenciaParcial.servicio.duracion_minutos} min)</strong>
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setServiciosSeleccionados([sugerenciaParcial.servicio.id])
                                }}
                                className="w-full py-2.5 bg-gradient-to-r from-gold to-yellow-500 text-[#080808] font-bold rounded-lg hover:shadow-[0_0_15px_rgba(212,175,55,0.4)] transition-all text-sm"
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
                            className="mt-6 px-6 py-2.5 bg-transparent border border-gold/50 text-gold hover:bg-gold/10 rounded-lg transition-all text-sm font-medium"
                          >
                            Seleccionar otra fecha
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                            {availableSlots.map(slot => {
                              const isAvailable = slot.disponible
                              const isSelected = formData.hora === slot.hora

                              return (
                                <div
                                  key={slot.hora}
                                  className={`relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-300 ${
                                    isAvailable 
                                      ? isSelected 
                                        ? 'bg-gold border-gold text-[#080808] shadow-[0_0_15px_rgba(212,175,55,0.4)] transform scale-105 z-10' 
                                        : 'bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-gold/30 cursor-pointer'
                                      : 'bg-white/[0.02] border-transparent text-white/30 cursor-not-allowed opacity-60'
                                  }`}
                                  onClick={() => isAvailable ? handleInputChange('hora', slot.hora) : null}
                                  title={isAvailable ? "Click para seleccionar" : "Horario no disponible"}
                                >
                                  <span className={`font-medium ${isSelected ? 'font-bold text-[#080808]' : ''}`}>{slot.hora}</span>
                                  {isAvailable && isSelected && (
                                    <i className="fas fa-check-circle absolute top-1.5 right-1.5 text-xs text-[#080808]"></i>
                                  )}
                                  {isAvailable && !isSelected && (
                                    <span className="text-[10px] uppercase tracking-wider text-gold/80 mt-1">
                                      Disponible
                                    </span>
                                  )}
                                  {!isAvailable && (
                                    <span className="text-[10px] italic text-white/30 mt-1 line-clamp-1 px-1 text-center">
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

                <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-md">
                  <div className="grid gap-6">
                    <div>
                      <label className="block text-white/80 font-medium mb-2">Nombre completo <span className="text-gold">*</span></label>
                      <input
                        type="text"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:border-gold focus:ring-1 focus:ring-gold transition-all"
                        value={formData.cliente_nombre}
                        onChange={(e) => handleInputChange('cliente_nombre', e.target.value)}
                        placeholder="Tu nombre completo"
                        required
                      />
                    </div>

                    <div>
                      <PhoneInput
                        label="Teléfono (WhatsApp) *"
                        value={formData.cliente_telefono}
                        onChange={(val) => handleInputChange('cliente_telefono', val)}
                        required
                      />
                      <p className="flex items-center gap-2 mt-2 text-xs text-white/50">
                        <i className="fas fa-info-circle text-gold"></i>
                        Ingresa tu número de WhatsApp para contactarte.
                      </p>
                    </div>

                    <div>
                      <label className="block text-white/80 font-medium mb-2">Email</label>
                      <input
                        type="email"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:border-gold focus:ring-1 focus:ring-gold transition-all"
                        value={formData.cliente_email}
                        onChange={(e) => handleInputChange('cliente_email', e.target.value)}
                        placeholder="tu@email.com"
                      />
                    </div>

                    <div>
                      <label className="block text-white/80 font-medium mb-2">Notas adicionales</label>
                      <textarea
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:border-gold focus:ring-1 focus:ring-gold transition-all resize-y"
                        value={formData.notas}
                        onChange={(e) => handleInputChange('notas', e.target.value)}
                        placeholder="Algún detalle especial o preferencia..."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Confirmación Premium */}
            {currentStep === 5 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-white mb-2">Confirma tu Reserva</h2>
                  <p className="text-white/60">Todo listo. Revisa tu ticket antes de confirmar.</p>
                </div>

                <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md shadow-2xl">
                  {/* 1. Header del Ticket: Fecha y Hora Visual */}
                  <div className="relative p-6 md:p-8 bg-gradient-to-br from-gold/10 to-transparent border-b border-dashed border-white/20">
                    <div className="flex justify-between items-center mb-6">
                      <div className="bg-gold text-[#080808] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        Reserva Pendiente
                      </div>
                      <div className="text-white/40 text-sm">
                        {new Date().getFullYear()}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="text-center">
                        <span className="block text-xs text-white/50 mb-1 tracking-wider">INICIO</span>
                        <span className="block text-3xl md:text-4xl font-bold text-white tracking-tight">{formData.hora}</span>
                      </div>

                      <div className="flex-1 relative h-[2px] bg-white/10 mx-4">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0a0a0a] px-3 py-1 text-xs text-gold font-semibold rounded-full border border-white/10 whitespace-nowrap">
                          {calcularTotales().duracionTotal} min
                        </div>
                      </div>

                      <div className="text-center">
                        <span className="block text-xs text-white/50 mb-1 tracking-wider">FIN APROX</span>
                        <span className="block text-3xl md:text-4xl font-bold text-white tracking-tight">{calculateEndTime(formData.hora)}</span>
                      </div>
                    </div>

                    <div className="text-center mt-8 text-lg font-medium text-white/90 capitalize">
                      {new Date(formData.fecha + 'T00:00:00').toLocaleDateString('es-ES', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                      })}
                    </div>
                  </div>

                  {/* 2. Cuerpo del Ticket: Barbero y Servicios */}
                  <div className="p-6 md:p-8 bg-black/40">
                    {/* Barbero Info */}
                    <div className="flex items-center gap-4 mb-8">
                      {(() => {
                        const barbero = barberos.find(b => b.id === formData.barbero_id)
                        return barbero ? (
                          <>
                            <img
                              src={getImageUrl(barbero.imagen_url)}
                              alt={barbero.nombre}
                              className="w-16 h-16 rounded-full object-cover border-2 border-gold shadow-[0_0_10px_rgba(212,175,55,0.3)]"
                            />
                            <div>
                              <p className="text-xs text-white/50 tracking-wider mb-1">TU PROFESIONAL</p>
                              <h3 className="text-xl font-bold text-white m-0">{barbero.nombre} {barbero.apellido}</h3>
                            </div>
                          </>
                        ) : null
                      })()}
                    </div>

                    {/* Lista de Servicios */}
                    <div className="mb-8">
                      <p className="text-xs text-white/50 uppercase tracking-widest mb-4">Servicios Seleccionados</p>
                      <div className="space-y-3">
                        {calcularTotales().serviciosInfo.map(servicio => (
                          <div key={servicio.id} className="flex justify-between items-center pb-3 border-b border-white/5">
                            <div>
                              <span className="block font-medium text-white/90">{servicio.nombre}</span>
                              <span className="text-xs text-white/40">{servicio.duracion_minutos} min</span>
                            </div>
                            <span className="font-medium text-white/90">${servicio.precio.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center mt-6 pt-4 border-t border-gold/20 text-xl text-gold">
                        <span className="font-bold tracking-wide">TOTAL A PAGAR</span>
                        <span className="font-bold">${calcularTotales().precioTotal.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Datos de Contacto (Resumen Compacto) */}
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                      <p className="text-xs text-white/50 tracking-wider mb-3">DATOS DE CONTACTO</p>
                      <div className="flex flex-col gap-2 text-white/80">
                        <span className="font-medium"><i className="fas fa-user w-5 text-white/40 text-center mr-2"></i> {formData.cliente_nombre}</span>
                        <span className="font-medium"><i className="fab fa-whatsapp w-5 text-white/40 text-center mr-2"></i> {formData.cliente_telefono}</span>
                        {formData.cliente_email && <span className="text-sm"><i className="fas fa-envelope w-5 text-white/40 text-center mr-2"></i> {formData.cliente_email}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-10 pt-6 border-t border-white/10">
              <button
                type="button"
                className={`px-6 py-3 rounded-xl flex items-center gap-2 font-medium transition-all ${
                  currentStep === 1 
                    ? 'opacity-50 cursor-not-allowed text-white/40 bg-white/5' 
                    : 'text-white/80 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20'
                }`}
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                <i className="fas fa-arrow-left"></i>
                Anterior
              </button>

              <span className="text-sm text-white/50 bg-white/5 px-4 py-2 rounded-full border border-white/10 hidden md:inline-block">
                Paso {currentStep} de {totalSteps}
              </span>

              {currentStep < totalSteps ? (
                <button
                  type="button"
                  className={`px-8 py-3 rounded-xl flex items-center gap-2 font-bold transition-all ${
                    (currentStep === 1 && serviciosSeleccionados.length === 0) ||
                    (currentStep === 2 && !formData.barbero_id) ||
                    (currentStep === 3 && (!formData.fecha || !formData.hora)) ||
                    (currentStep === 4 && (!formData.cliente_nombre || !formData.cliente_telefono))
                      ? 'bg-white/10 text-white/30 cursor-not-allowed'
                      : 'bg-gradient-to-r from-gold to-yellow-500 text-[#080808] hover:shadow-[0_0_15px_rgba(212,175,55,0.4)] hover:scale-105'
                  }`}
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
                  className={`px-8 py-3 rounded-xl flex items-center gap-2 font-bold transition-all ${
                    loading
                      ? 'bg-gold/50 text-[#080808]/50 cursor-not-allowed'
                      : 'bg-gradient-to-r from-gold to-yellow-500 text-[#080808] hover:shadow-[0_0_20px_rgba(212,175,55,0.6)] hover:scale-105'
                  }`}
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-[#080808]/30 border-t-[#080808] rounded-full animate-spin"></div>
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