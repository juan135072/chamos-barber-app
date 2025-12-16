import React, { useState, useEffect } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import type { Database } from '../../../../lib/database.types'
import toast from 'react-hot-toast'

type HorarioAtencion = Database['public']['Tables']['horarios_atencion']['Row']

interface HorarioModalProps {
  horario: HorarioAtencion | null
  barberoId: string
  onClose: () => void
  onSave: () => void
}

const diasSemana = [
  { num: 1, nombre: 'Lunes' },
  { num: 2, nombre: 'Martes' },
  { num: 3, nombre: 'Miércoles' },
  { num: 4, nombre: 'Jueves' },
  { num: 5, nombre: 'Viernes' },
  { num: 6, nombre: 'Sábado' },
  { num: 0, nombre: 'Domingo' }
]

const HorarioModal: React.FC<HorarioModalProps> = ({ horario, barberoId, onClose, onSave }) => {
  const supabase = useSupabaseClient<Database>()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    dia_semana: horario?.dia_semana ?? 1,
    hora_inicio: horario?.hora_inicio ? horario.hora_inicio.substring(0, 5) : '09:00',
    hora_fin: horario?.hora_fin ? horario.hora_fin.substring(0, 5) : '19:00',
    activo: horario?.activo ?? true
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.hora_inicio) {
      newErrors.hora_inicio = 'La hora de inicio es requerida'
    }

    if (!formData.hora_fin) {
      newErrors.hora_fin = 'La hora de fin es requerida'
    }

    if (formData.hora_inicio && formData.hora_fin) {
      const inicio = formData.hora_inicio.split(':').map(Number)
      const fin = formData.hora_fin.split(':').map(Number)
      
      const minutosInicio = inicio[0] * 60 + inicio[1]
      const minutosFin = fin[0] * 60 + fin[1]

      if (minutosFin <= minutosInicio) {
        newErrors.hora_fin = 'La hora de fin debe ser mayor a la hora de inicio'
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
      const horarioData = {
        barbero_id: barberoId,
        dia_semana: formData.dia_semana,
        hora_inicio: `${formData.hora_inicio}:00`,
        hora_fin: `${formData.hora_fin}:00`,
        activo: formData.activo
      }

      if (horario?.id) {
        // Actualizar
        const { error } = await supabase
          .from('horarios_atencion')
          .update(horarioData)
          .eq('id', horario.id)

        if (error) throw error

        toast.success('Horario actualizado correctamente')
      } else {
        // Crear
        const { error } = await supabase
          .from('horarios_atencion')
          .insert([horarioData])

        if (error) throw error

        toast.success('Horario creado correctamente')
      }

      onSave()
    } catch (error: any) {
      console.error('Error guardando horario:', error)
      toast.error(error.message || 'Error al guardar horario')
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
              {horario?.id ? 'Editar Horario' : 'Nuevo Horario'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
              disabled={loading}
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-4">
          <div className="space-y-4">
            {/* Día de la semana */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Día de la Semana
              </label>
              <select
                value={formData.dia_semana}
                onChange={(e) => setFormData({ ...formData, dia_semana: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                disabled={loading || !!horario?.id}
              >
                {diasSemana.map(dia => (
                  <option key={dia.num} value={dia.num}>{dia.nombre}</option>
                ))}
              </select>
              {horario?.id && (
                <p className="mt-1 text-xs text-gray-500">
                  No puedes cambiar el día de un horario existente
                </p>
              )}
            </div>

            {/* Hora de inicio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hora de Inicio
              </label>
              <input
                type="time"
                value={formData.hora_inicio}
                onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  errors.hora_inicio ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              {errors.hora_inicio && (
                <p className="mt-1 text-xs text-red-600">{errors.hora_inicio}</p>
              )}
            </div>

            {/* Hora de fin */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hora de Fin
              </label>
              <input
                type="time"
                value={formData.hora_fin}
                onChange={(e) => setFormData({ ...formData, hora_fin: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  errors.hora_fin ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
              />
              {errors.hora_fin && (
                <p className="mt-1 text-xs text-red-600">{errors.hora_fin}</p>
              )}
            </div>

            {/* Estado */}
            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                  disabled={loading}
                />
                <span className="text-sm font-medium text-gray-700">
                  Horario activo
                </span>
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Los horarios inactivos no estarán disponibles para reservas
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <i className="fas fa-info-circle text-blue-400"></i>
                </div>
                <div className="ml-2 text-xs text-blue-700">
                  Los clientes podrán reservar citas en este rango horario los días seleccionados.
                </div>
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

export default HorarioModal
