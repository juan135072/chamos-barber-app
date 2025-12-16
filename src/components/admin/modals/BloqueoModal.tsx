import React, { useState, useEffect } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import type { Database } from '../../../../lib/database.types'
import toast from 'react-hot-toast'

type HorarioBloqueado = Database['public']['Tables']['horarios_bloqueados']['Row']

interface BloqueoModalProps {
  isOpen: boolean
  bloqueo: HorarioBloqueado | null
  barberoId: string
  onClose: () => void
  onSuccess: () => void
}

const BloqueoModal: React.FC<BloqueoModalProps> = ({ isOpen, bloqueo, barberoId, onClose, onSuccess }) => {
  const supabase = useSupabaseClient<Database>()
  const [loading, setLoading] = useState(false)

  // Función para formatear fecha y hora desde timestamp
  const formatDateTime = (timestamp: string | null) => {
    if (!timestamp) return { date: '', time: '' }
    
    const dt = new Date(timestamp)
    const date = dt.toISOString().split('T')[0]
    const time = dt.toTimeString().split(' ')[0].substring(0, 5)
    
    return { date, time }
  }

  const inicio = formatDateTime(bloqueo?.fecha_hora_inicio || null)
  const fin = formatDateTime(bloqueo?.fecha_hora_fin || null)

  const [formData, setFormData] = useState({
    fecha_inicio: inicio.date || new Date().toISOString().split('T')[0],
    hora_inicio: inicio.time || '09:00',
    fecha_fin: fin.date || new Date().toISOString().split('T')[0],
    hora_fin: fin.time || '19:00',
    motivo: bloqueo?.motivo || ''
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (bloqueo) {
      const inicio = formatDateTime(bloqueo.fecha_hora_inicio)
      const fin = formatDateTime(bloqueo.fecha_hora_fin)
      
      setFormData({
        fecha_inicio: inicio.date,
        hora_inicio: inicio.time,
        fecha_fin: fin.date,
        hora_fin: fin.time,
        motivo: bloqueo.motivo || ''
      })
    }
  }, [bloqueo])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.fecha_inicio) {
      newErrors.fecha_inicio = 'La fecha de inicio es requerida'
    }

    if (!formData.hora_inicio) {
      newErrors.hora_inicio = 'La hora de inicio es requerida'
    }

    if (!formData.fecha_fin) {
      newErrors.fecha_fin = 'La fecha de fin es requerida'
    }

    if (!formData.hora_fin) {
      newErrors.hora_fin = 'La hora de fin es requerida'
    }

    // Validar que fecha/hora fin sea mayor que fecha/hora inicio
    if (formData.fecha_inicio && formData.hora_inicio && formData.fecha_fin && formData.hora_fin) {
      const inicioTimestamp = new Date(`${formData.fecha_inicio}T${formData.hora_inicio}:00`).getTime()
      const finTimestamp = new Date(`${formData.fecha_fin}T${formData.hora_fin}:00`).getTime()

      if (finTimestamp <= inicioTimestamp) {
        newErrors.fecha_fin = 'La fecha/hora de fin debe ser mayor a la de inicio'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Por favor corrige los errores del formulario')
      return
    }

    setLoading(true)

    try {
      const bloqueoData = {
        barbero_id: barberoId,
        fecha_hora_inicio: `${formData.fecha_inicio}T${formData.hora_inicio}:00`,
        fecha_hora_fin: `${formData.fecha_fin}T${formData.hora_fin}:00`,
        motivo: formData.motivo || null
      }

      if (bloqueo?.id) {
        // Actualizar
        const { error } = await supabase
          .from('horarios_bloqueados')
          .update(bloqueoData)
          .eq('id', bloqueo.id)

        if (error) throw error

        toast.success('Bloqueo actualizado correctamente')
      } else {
        // Crear
        const { error } = await supabase
          .from('horarios_bloqueados')
          .insert([bloqueoData])

        if (error) throw error

        toast.success('Bloqueo creado correctamente')
      }

      onSuccess()
    } catch (error: any) {
      console.error('Error guardando bloqueo:', error)
      toast.error(error.message || 'Error al guardar bloqueo')
    } finally {
      setLoading(false)
    }
  }

  // Funciones de accesos rápidos
  const setHoyCompleto = () => {
    const hoy = new Date().toISOString().split('T')[0]
    setFormData({
      ...formData,
      fecha_inicio: hoy,
      hora_inicio: '00:00',
      fecha_fin: hoy,
      hora_fin: '23:59'
    })
  }

  const setProximos3Dias = () => {
    const hoy = new Date()
    const en3Dias = new Date(hoy)
    en3Dias.setDate(hoy.getDate() + 2)
    
    setFormData({
      ...formData,
      fecha_inicio: hoy.toISOString().split('T')[0],
      hora_inicio: '00:00',
      fecha_fin: en3Dias.toISOString().split('T')[0],
      hora_fin: '23:59'
    })
  }

  const setProximaSemana = () => {
    const hoy = new Date()
    const en7Dias = new Date(hoy)
    en7Dias.setDate(hoy.getDate() + 7)
    
    setFormData({
      ...formData,
      fecha_inicio: hoy.toISOString().split('T')[0],
      hora_inicio: '00:00',
      fecha_fin: en7Dias.toISOString().split('T')[0],
      hora_fin: '23:59'
    })
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose()
      }}
    >
      <div 
        className="rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)'
        }}
      >
        {/* Header */}
        <div 
          className="px-6 py-4"
          style={{ borderBottom: '1px solid var(--border-color)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 
                className="text-xl font-bold flex items-center gap-2"
                style={{ color: 'var(--accent-color)' }}
              >
                <i className="fas fa-ban"></i>
                {bloqueo?.id ? 'Editar Bloqueo' : 'Nuevo Bloqueo'}
              </h3>
              <p 
                className="mt-1 text-sm"
                style={{ color: 'var(--text-primary)', opacity: 0.7 }}
              >
                Bloquea fechas y horarios para que no estén disponibles
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="transition-all hover:scale-110"
              style={{ 
                color: 'var(--text-primary)',
                opacity: loading ? 0.5 : 0.7
              }}
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5">
          <div className="space-y-5">
            {/* Accesos rápidos */}
            <div>
              <label 
                className="block text-sm font-medium mb-3"
                style={{ color: 'var(--text-primary)' }}
              >
                <i className="fas fa-bolt mr-2" style={{ color: 'var(--accent-color)' }}></i>
                Accesos Rápidos
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={setHoyCompleto}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
                  style={{
                    backgroundColor: 'rgba(212, 175, 55, 0.2)',
                    color: 'var(--accent-color)',
                    border: '1px solid var(--accent-color)'
                  }}
                >
                  <i className="fas fa-calendar-day mr-2"></i>
                  Todo el día hoy
                </button>
                <button
                  type="button"
                  onClick={setProximos3Dias}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
                  style={{
                    backgroundColor: 'rgba(212, 175, 55, 0.2)',
                    color: 'var(--accent-color)',
                    border: '1px solid var(--accent-color)'
                  }}
                >
                  <i className="fas fa-calendar-week mr-2"></i>
                  Próximos 3 días
                </button>
                <button
                  type="button"
                  onClick={setProximaSemana}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
                  style={{
                    backgroundColor: 'rgba(212, 175, 55, 0.2)',
                    color: 'var(--accent-color)',
                    border: '1px solid var(--accent-color)'
                  }}
                >
                  <i className="fas fa-calendar-alt mr-2"></i>
                  Próxima semana
                </button>
              </div>
            </div>

            {/* Separador */}
            <div style={{ borderTop: '1px solid var(--border-color)' }} />

            {/* Inicio */}
            <div 
              className="rounded-lg p-4"
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)'
              }}
            >
              <h4 
                className="text-sm font-semibold mb-4 flex items-center gap-2"
                style={{ color: 'var(--accent-color)' }}
              >
                <i className="fas fa-play-circle"></i>
                Fecha y Hora de Inicio
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label 
                    className="block text-sm font-medium mb-2"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <i className="far fa-calendar mr-2"></i>
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={formData.fecha_inicio}
                    onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg transition-all"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: errors.fecha_inicio ? '1px solid #EF4444' : '1px solid var(--border-color)'
                    }}
                    disabled={loading}
                  />
                  {errors.fecha_inicio && (
                    <p className="mt-2 text-xs" style={{ color: '#EF4444' }}>
                      {errors.fecha_inicio}
                    </p>
                  )}
                </div>

                <div>
                  <label 
                    className="block text-sm font-medium mb-2"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <i className="far fa-clock mr-2"></i>
                    Hora
                  </label>
                  <input
                    type="time"
                    value={formData.hora_inicio}
                    onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg transition-all"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: errors.hora_inicio ? '1px solid #EF4444' : '1px solid var(--border-color)'
                    }}
                    disabled={loading}
                  />
                  {errors.hora_inicio && (
                    <p className="mt-2 text-xs" style={{ color: '#EF4444' }}>
                      {errors.hora_inicio}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Fin */}
            <div 
              className="rounded-lg p-4"
              style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)'
              }}
            >
              <h4 
                className="text-sm font-semibold mb-4 flex items-center gap-2"
                style={{ color: 'var(--accent-color)' }}
              >
                <i className="fas fa-stop-circle"></i>
                Fecha y Hora de Fin
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label 
                    className="block text-sm font-medium mb-2"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <i className="far fa-calendar mr-2"></i>
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={formData.fecha_fin}
                    onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg transition-all"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: errors.fecha_fin ? '1px solid #EF4444' : '1px solid var(--border-color)'
                    }}
                    disabled={loading}
                  />
                  {errors.fecha_fin && (
                    <p className="mt-2 text-xs" style={{ color: '#EF4444' }}>
                      {errors.fecha_fin}
                    </p>
                  )}
                </div>

                <div>
                  <label 
                    className="block text-sm font-medium mb-2"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <i className="far fa-clock mr-2"></i>
                    Hora
                  </label>
                  <input
                    type="time"
                    value={formData.hora_fin}
                    onChange={(e) => setFormData({ ...formData, hora_fin: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg transition-all"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: errors.hora_fin ? '1px solid #EF4444' : '1px solid var(--border-color)'
                    }}
                    disabled={loading}
                  />
                  {errors.hora_fin && (
                    <p className="mt-2 text-xs" style={{ color: '#EF4444' }}>
                      {errors.hora_fin}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Motivo */}
            <div>
              <label 
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                <i className="fas fa-comment-dots mr-2" style={{ color: 'var(--accent-color)' }}></i>
                Motivo (opcional)
              </label>
              <textarea
                value={formData.motivo}
                onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                placeholder="Ej: Vacaciones, Permiso médico, Evento especial..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg transition-all"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)'
                }}
                disabled={loading}
              />
            </div>

            {/* Info Box */}
            <div 
              className="rounded-lg p-4"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}
            >
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <i className="fas fa-exclamation-triangle" style={{ color: '#EF4444' }}></i>
                </div>
                <p 
                  className="text-xs leading-relaxed"
                  style={{ color: 'var(--text-primary)', opacity: 0.9 }}
                >
                  Durante el período bloqueado, los clientes no podrán reservar citas con este barbero. 
                  El bloqueo puede ser editado o eliminado en cualquier momento.
                </p>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div 
          className="px-6 py-4 flex justify-end gap-3"
          style={{ 
            backgroundColor: 'var(--bg-primary)',
            borderTop: '1px solid var(--border-color)' 
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
            style={{
              backgroundColor: 'transparent',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              opacity: loading ? 0.5 : 1
            }}
          >
            <i className="fas fa-times mr-2"></i>
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
            style={{
              backgroundColor: 'var(--accent-color)',
              color: 'var(--bg-primary)',
              border: 'none',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Guardando...
              </>
            ) : (
              <>
                <i className="fas fa-save mr-2"></i>
                Guardar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default BloqueoModal
