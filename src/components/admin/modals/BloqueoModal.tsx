import React, { useState } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import type { Database } from '../../../../lib/database.types'
import toast from 'react-hot-toast'

type HorarioBloqueado = Database['public']['Tables']['horarios_bloqueados']['Row']

interface BloqueoModalProps {
  bloqueo: HorarioBloqueado | null
  barberoId: string
  onClose: () => void
  onSave: () => void
}

const BloqueoModal: React.FC<BloqueoModalProps> = ({ bloqueo, barberoId, onClose, onSave }) => {
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

      onSave()
    } catch (error: any) {
      console.error('Error guardando bloqueo:', error)
      toast.error(error.message || 'Error al guardar bloqueo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              {bloqueo?.id ? 'Editar Bloqueo' : 'Nuevo Bloqueo'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
              disabled={loading}
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Bloquea fechas y horarios para que no estén disponibles
          </p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="space-y-4">
            {/* Inicio */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <i className="fas fa-play-circle text-green-500 mr-2"></i>
                Inicio del Bloqueo
              </h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={formData.fecha_inicio}
                    onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm ${
                      errors.fecha_inicio ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={loading}
                  />
                  {errors.fecha_inicio && (
                    <p className="mt-1 text-xs text-red-600">{errors.fecha_inicio}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hora
                  </label>
                  <input
                    type="time"
                    value={formData.hora_inicio}
                    onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm ${
                      errors.hora_inicio ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={loading}
                  />
                  {errors.hora_inicio && (
                    <p className="mt-1 text-xs text-red-600">{errors.hora_inicio}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Fin */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <i className="fas fa-stop-circle text-red-500 mr-2"></i>
                Fin del Bloqueo
              </h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={formData.fecha_fin}
                    onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm ${
                      errors.fecha_fin ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={loading}
                  />
                  {errors.fecha_fin && (
                    <p className="mt-1 text-xs text-red-600">{errors.fecha_fin}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hora
                  </label>
                  <input
                    type="time"
                    value={formData.hora_fin}
                    onChange={(e) => setFormData({ ...formData, hora_fin: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm ${
                      errors.hora_fin ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={loading}
                  />
                  {errors.hora_fin && (
                    <p className="mt-1 text-xs text-red-600">{errors.hora_fin}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Motivo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo del Bloqueo (opcional)
              </label>
              <textarea
                value={formData.motivo}
                onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                rows={3}
                placeholder="Ej: Vacaciones, Permiso médico, Evento especial..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-500">
                Este motivo es para tu referencia interna
              </p>
            </div>

            {/* Quick Actions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-800 mb-2">
                <i className="fas fa-magic mr-1"></i>
                Acciones Rápidas
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0]
                    setFormData({
                      ...formData,
                      fecha_inicio: today,
                      fecha_fin: today,
                      hora_inicio: '00:00',
                      hora_fin: '23:59'
                    })
                  }}
                  className="text-xs px-2 py-1 bg-white border border-blue-300 rounded text-blue-700 hover:bg-blue-50"
                  disabled={loading}
                >
                  Todo el día hoy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date()
                    const nextWeek = new Date(today)
                    nextWeek.setDate(today.getDate() + 7)
                    
                    setFormData({
                      ...formData,
                      fecha_inicio: today.toISOString().split('T')[0],
                      fecha_fin: nextWeek.toISOString().split('T')[0],
                      hora_inicio: '00:00',
                      hora_fin: '23:59'
                    })
                  }}
                  className="text-xs px-2 py-1 bg-white border border-blue-300 rounded text-blue-700 hover:bg-blue-50"
                  disabled={loading}
                >
                  Próxima semana
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-amber-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
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
