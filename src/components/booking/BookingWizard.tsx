/**
 * BookingWizard - Componente moderno para sistema de reservas
 * 
 * Flujo de 5 pasos:
 * 1. Selección de Servicio
 * 2. Selección de Barbero
 * 3. Fecha y Hora
 * 4. Datos del Cliente
 * 5. Confirmación
 */

import React, { useState, useEffect } from 'react';
import { chamosSupabase } from '../../../lib/supabase-helpers';
import type { Database } from '../../../lib/database.types';
import styles from './BookingWizard.module.css';

// Types
type Barbero = Database['public']['Tables']['barberos']['Row'];
type Servicio = Database['public']['Tables']['servicios']['Row'];

interface TimeSlot {
  hora: string;
  disponible: boolean;
}

interface BookingFormData {
  servicio_id: string;
  barbero_id: string;
  fecha: string;
  hora: string;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_email: string;
  notas: string;
}

interface BookingWizardProps {
  onComplete?: (data: BookingFormData) => void;
  onCancel?: () => void;
}

const TOTAL_STEPS = 5;

const BookingWizard: React.FC<BookingWizardProps> = ({ onComplete, onCancel }) => {
  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof BookingFormData, string>>>({});
  
  const [formData, setFormData] = useState<BookingFormData>({
    servicio_id: '',
    barbero_id: '',
    fecha: '',
    hora: '',
    cliente_nombre: '',
    cliente_telefono: '',
    cliente_email: '',
    notas: ''
  });

  // Load data on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load available slots when barbero and fecha change
  useEffect(() => {
    if (formData.fecha && formData.barbero_id) {
      loadAvailableSlots();
    }
  }, [formData.fecha, formData.barbero_id]);

  // Load barberos and servicios
  const loadInitialData = async () => {
    try {
      const [barberosData, serviciosData] = await Promise.all([
        chamosSupabase.getBarberos(true),
        chamosSupabase.getServicios(true)
      ]);
      
      setBarberos(barberosData || []);
      setServicios(serviciosData || []);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  // Load available time slots
  const loadAvailableSlots = async () => {
    try {
      const data = await chamosSupabase.getHorariosDisponibles(
        formData.barbero_id,
        formData.fecha
      );
      setAvailableSlots(data || getDefaultSlots());
    } catch (error) {
      console.error('Error loading slots:', error);
      setAvailableSlots(getDefaultSlots());
    }
  };

  // Default time slots (fallback)
  const getDefaultSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    for (let hour = 9; hour <= 18; hour++) {
      slots.push({ hora: `${hour.toString().padStart(2, '0')}:00`, disponible: true });
      if (hour < 18) {
        slots.push({ hora: `${hour.toString().padStart(2, '0')}:30`, disponible: true });
      }
    }
    return slots;
  };

  // Navigation
  const nextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setErrors({});
  };

  // Validation
  const validateCurrentStep = (): boolean => {
    const newErrors: Partial<Record<keyof BookingFormData, string>> = {};

    switch (currentStep) {
      case 1:
        if (!formData.servicio_id) {
          newErrors.servicio_id = 'Debes seleccionar un servicio';
        }
        break;
      case 2:
        if (!formData.barbero_id) {
          newErrors.barbero_id = 'Debes seleccionar un barbero';
        }
        break;
      case 3:
        if (!formData.fecha) {
          newErrors.fecha = 'Debes seleccionar una fecha';
        }
        if (!formData.hora) {
          newErrors.hora = 'Debes seleccionar una hora';
        }
        break;
      case 4:
        if (!formData.cliente_nombre.trim()) {
          newErrors.cliente_nombre = 'El nombre es requerido';
        }
        if (!formData.cliente_telefono.trim()) {
          newErrors.cliente_telefono = 'El teléfono es requerido';
        } else if (!/^\+?56\s?9\s?\d{4}\s?\d{4}$/.test(formData.cliente_telefono.replace(/\s/g, ''))) {
          newErrors.cliente_telefono = 'Formato de teléfono inválido (ej: +56 9 1234 5678)';
        }
        if (formData.cliente_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.cliente_email)) {
          newErrors.cliente_email = 'Email inválido';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form changes
  const handleChange = (field: keyof BookingFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  // Submit booking
  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setLoading(true);
    try {
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
      });

      if (onComplete) {
        onComplete(formData);
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Error al crear la reserva. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Get selected data for display
  const selectedServicio = servicios.find(s => s.id === formData.servicio_id);
  const selectedBarbero = barberos.find(b => b.id === formData.barbero_id);

  // Date constraints
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    return maxDate.toISOString().split('T')[0];
  };

  // Progress percentage
  const progress = (currentStep / TOTAL_STEPS) * 100;

  return (
    <div className={styles.wizardContainer}>
      {/* Progress Bar */}
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
        <div className={styles.progressSteps}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`${styles.progressStep} ${
                i + 1 < currentStep ? styles.completed : ''
              } ${i + 1 === currentStep ? styles.active : ''}`}
            >
              {i + 1 < currentStep ? '✓' : i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className={styles.stepContent}>
        {/* Step 1: Servicio */}
        {currentStep === 1 && (
          <StepServicio
            servicios={servicios}
            selected={formData.servicio_id}
            onSelect={(id) => handleChange('servicio_id', id)}
            error={errors.servicio_id}
          />
        )}

        {/* Step 2: Barbero */}
        {currentStep === 2 && (
          <StepBarbero
            barberos={barberos}
            selected={formData.barbero_id}
            onSelect={(id) => handleChange('barbero_id', id)}
            error={errors.barbero_id}
          />
        )}

        {/* Step 3: Fecha y Hora */}
        {currentStep === 3 && (
          <StepDateTime
            fecha={formData.fecha}
            hora={formData.hora}
            onFechaChange={(value) => handleChange('fecha', value)}
            onHoraChange={(value) => handleChange('hora', value)}
            availableSlots={availableSlots}
            minDate={getMinDate()}
            maxDate={getMaxDate()}
            errors={{ fecha: errors.fecha, hora: errors.hora }}
          />
        )}

        {/* Step 4: Datos Cliente */}
        {currentStep === 4 && (
          <StepClienteInfo
            formData={formData}
            onChange={handleChange}
            errors={errors}
          />
        )}

        {/* Step 5: Confirmación */}
        {currentStep === 5 && (
          <StepConfirmacion
            formData={formData}
            servicio={selectedServicio}
            barbero={selectedBarbero}
          />
        )}
      </div>

      {/* Navigation */}
      <div className={styles.navigation}>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          ← Anterior
        </button>

        <span className={styles.stepIndicator}>
          Paso {currentStep} de {TOTAL_STEPS}
        </span>

        {currentStep < TOTAL_STEPS ? (
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={nextStep}
          >
            Siguiente →
          </button>
        ) : (
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Confirmando...' : '✓ Confirmar Reserva'}
          </button>
        )}
      </div>
    </div>
  );
};

// Step Components (to be defined next)
const StepServicio = ({ servicios, selected, onSelect, error }: any) => (
  <div className={styles.step}>
    <h2 className={styles.stepTitle}>Selecciona un Servicio</h2>
    <p className={styles.stepSubtitle}>¿Qué servicio necesitas hoy?</p>
    {error && <p className={styles.error}>{error}</p>}
    <div className={styles.servicesGrid}>
      {servicios.map((servicio: Servicio) => (
        <div
          key={servicio.id}
          className={`${styles.serviceCard} ${selected === servicio.id ? styles.selected : ''}`}
          onClick={() => onSelect(servicio.id)}
        >
          <h3>{servicio.nombre}</h3>
          <p>{servicio.descripcion}</p>
          <div className={styles.serviceInfo}>
            <span className={styles.price}>${servicio.precio.toLocaleString()}</span>
            <span className={styles.duration}>{servicio.duracion_minutos} min</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const StepBarbero = ({ barberos, selected, onSelect, error }: any) => (
  <div className={styles.step}>
    <h2 className={styles.stepTitle}>Elige tu Barbero</h2>
    <p className={styles.stepSubtitle}>Selecciona con quién prefieres atenderte</p>
    {error && <p className={styles.error}>{error}</p>}
    <div className={styles.barbersGrid}>
      {barberos.map((barbero: Barbero) => (
        <div
          key={barbero.id}
          className={`${styles.barberCard} ${selected === barbero.id ? styles.selected : ''}`}
          onClick={() => onSelect(barbero.id)}
        >
          <div className={styles.barberAvatar}>
            {barbero.nombre.charAt(0)}{barbero.apellido.charAt(0)}
          </div>
          <h3>{barbero.nombre} {barbero.apellido}</h3>
          <p>{barbero.especialidad}</p>
          <div className={styles.barberStats}>
            <span>⭐ {barbero.calificacion}</span>
            <span>{barbero.experiencia_anos} años</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const StepDateTime = ({ fecha, hora, onFechaChange, onHoraChange, availableSlots, minDate, maxDate, errors }: any) => (
  <div className={styles.step}>
    <h2 className={styles.stepTitle}>Fecha y Hora</h2>
    <p className={styles.stepSubtitle}>¿Cuándo te gustaría venir?</p>
    
    <div className={styles.dateTimeContainer}>
      <div className={styles.datePickerWrapper}>
        <label>Selecciona una fecha:</label>
        {errors.fecha && <p className={styles.error}>{errors.fecha}</p>}
        <input
          type="date"
          value={fecha}
          onChange={(e) => onFechaChange(e.target.value)}
          min={minDate}
          max={maxDate}
          className={styles.dateInput}
        />
      </div>

      {fecha && (
        <div className={styles.timeSlotsWrapper}>
          <label>Horarios disponibles:</label>
          {errors.hora && <p className={styles.error}>{errors.hora}</p>}
          <div className={styles.timeSlots}>
            {availableSlots.filter((slot: TimeSlot) => slot.disponible).map((slot: TimeSlot) => (
              <button
                key={slot.hora}
                type="button"
                className={`${styles.timeSlot} ${hora === slot.hora ? styles.selected : ''}`}
                onClick={() => onHoraChange(slot.hora)}
              >
                {slot.hora}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
);

const StepClienteInfo = ({ formData, onChange, errors }: any) => (
  <div className={styles.step}>
    <h2 className={styles.stepTitle}>Tus Datos</h2>
    <p className={styles.stepSubtitle}>Necesitamos tu información de contacto</p>
    
    <div className={styles.formGrid}>
      <div className={styles.formGroup}>
        <label>Nombre completo *</label>
        {errors.cliente_nombre && <p className={styles.error}>{errors.cliente_nombre}</p>}
        <input
          type="text"
          value={formData.cliente_nombre}
          onChange={(e) => onChange('cliente_nombre', e.target.value)}
          placeholder="Tu nombre completo"
          className={styles.input}
        />
      </div>

      <div className={styles.formGroup}>
        <label>Teléfono (WhatsApp) *</label>
        {errors.cliente_telefono && <p className={styles.error}>{errors.cliente_telefono}</p>}
        <input
          type="tel"
          value={formData.cliente_telefono}
          onChange={(e) => onChange('cliente_telefono', e.target.value)}
          placeholder="+56 9 1234 5678"
          className={styles.input}
        />
      </div>

      <div className={styles.formGroup}>
        <label>Email (opcional)</label>
        {errors.cliente_email && <p className={styles.error}>{errors.cliente_email}</p>}
        <input
          type="email"
          value={formData.cliente_email}
          onChange={(e) => onChange('cliente_email', e.target.value)}
          placeholder="tu@email.com"
          className={styles.input}
        />
      </div>

      <div className={styles.formGroup}>
        <label>Notas adicionales</label>
        <textarea
          value={formData.notas}
          onChange={(e) => onChange('notas', e.target.value)}
          placeholder="Algún detalle especial o preferencia..."
          rows={3}
          className={styles.textarea}
        />
      </div>
    </div>
  </div>
);

const StepConfirmacion = ({ formData, servicio, barbero }: any) => (
  <div className={styles.step}>
    <h2 className={styles.stepTitle}>Confirma tu Reserva</h2>
    <p className={styles.stepSubtitle}>Revisa los detalles antes de confirmar</p>
    
    <div className={styles.confirmationCard}>
      <h3>Resumen de tu cita:</h3>
      
      <div className={styles.confirmationDetails}>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Servicio:</span>
          <span className={styles.detailValue}>{servicio?.nombre}</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Barbero:</span>
          <span className={styles.detailValue}>{barbero?.nombre} {barbero?.apellido}</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Fecha:</span>
          <span className={styles.detailValue}>
            {new Date(formData.fecha + 'T00:00:00').toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Hora:</span>
          <span className={styles.detailValue}>{formData.hora}</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Cliente:</span>
          <span className={styles.detailValue}>{formData.cliente_nombre}</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Teléfono:</span>
          <span className={styles.detailValue}>{formData.cliente_telefono}</span>
        </div>
        {formData.cliente_email && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Email:</span>
            <span className={styles.detailValue}>{formData.cliente_email}</span>
          </div>
        )}
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Precio:</span>
          <span className={styles.detailValue}>${servicio?.precio.toLocaleString()}</span>
        </div>
      </div>

      <div className={styles.confirmationNote}>
        <strong>Nota:</strong> Te contactaremos por WhatsApp para confirmar tu cita.
        Si necesitas cancelar o reprogramar, hazlo con al menos 2 horas de anticipación.
      </div>
    </div>
  </div>
);

export default BookingWizard;
