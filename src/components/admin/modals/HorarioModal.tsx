import React, { useState, useEffect } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import type { Database } from '../../../../lib/database.types'
import toast from 'react-hot-toast'

type HorarioAtencion = Database['public']['Tables']['horarios_atencion']['Row']

interface HorarioModalProps {
  isOpen: boolean
  horario: HorarioAtencion | null
  barberoId: string
  onClose: () => void
  onSuccess: () => void
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

const HorarioModal: React.FC<HorarioModalProps> = ({ isOpen, horario, barberoId, onClose, onSuccess }) => {
  const supabase = useSupabaseClient<Database>()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    dia_semana: horario?.dia_semana ?? 1,
    hora_inicio: horario?.hora_inicio ? horario.hora_inicio.substring(0, 5) : '09:00',
    hora_fin: horario?.hora_fin ? horario.hora_fin.substring(0, 5) : '19:00',
    has_colacion: !!(horario?.pausa_inicio || horario?.pausa_fin),
    pausa_inicio: horario?.pausa_inicio ? horario.pausa_inicio.substring(0, 5) : '',
    pausa_fin: horario?.pausa_fin ? horario.pausa_fin.substring(0, 5) : '',
    activo: horario?.activo ?? true
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (horario) {
      setFormData({
        dia_semana: horario.dia_semana,
        hora_inicio: horario.hora_inicio ? horario.hora_inicio.substring(0, 5) : '09:00',
        hora_fin: horario.hora_fin ? horario.hora_fin.substring(0, 5) : '19:00',
        has_colacion: !!(horario.pausa_inicio || horario.pausa_fin),
        pausa_inicio: horario.pausa_inicio ? horario.pausa_inicio.substring(0, 5) : '',
        pausa_fin: horario.pausa_fin ? horario.pausa_fin.substring(0, 5) : '',
        activo: horario.activo
      })
    }
  }, [horario])

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

    if (formData.has_colacion) {
      if (!formData.pausa_inicio) newErrors.pausa_inicio = 'Requerido si hay pausa'
      if (!formData.pausa_fin) newErrors.pausa_fin = 'Requerido si hay pausa'

      if (formData.pausa_inicio && formData.pausa_fin) {
        const pInicio = formData.pausa_inicio.split(':').map(Number)
        const pFin = formData.pausa_fin.split(':').map(Number)
        const minPInicio = pInicio[0] * 60 + pInicio[1]
        const minPFin = pFin[0] * 60 + pFin[1]

        if (minPFin <= minPInicio) {
          newErrors.pausa_fin = 'La pausa fin debe ser mayor al inicio'
        }

        if (formData.hora_inicio && formData.hora_fin) {
          const inicio = formData.hora_inicio.split(':').map(Number)
          const fin = formData.hora_fin.split(':').map(Number)
          const minInicio = inicio[0] * 60 + inicio[1]
          const minFin = fin[0] * 60 + fin[1]

          if (minPInicio < minInicio || minPFin > minFin) {
            newErrors.pausa_inicio = 'La pausa debe estar dentro del horario de atención'
          }
        }
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
        pausa_inicio: (formData.has_colacion && formData.pausa_inicio) ? `${formData.pausa_inicio}:00` : null,
        pausa_fin: (formData.has_colacion && formData.pausa_fin) ? `${formData.pausa_fin}:00` : null,
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

      onSuccess()
    } catch (error: any) {
      console.error('Error guardando horario:', error)
      toast.error(error.message || 'Error al guardar horario')
    } finally {
      setLoading(false)
    }
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
        className="rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
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
            <h3
              className="text-xl font-bold flex items-center gap-2"
              style={{ color: 'var(--accent-color)' }}
            >
              <i className="fas fa-clock"></i>
              {horario?.id ? 'Editar Horario' : 'Nuevo Horario'}
            </h3>
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
          <div className="space-y-8 pt-2">

            {/* --- BLOQUE 1: HORARIO LABORAL --- */}
            <div className="bg-[#111] p-5 rounded-xl border border-[var(--border-color)] relative pt-6 shadow-sm">
              <div className="absolute -top-2.5 left-4 bg-[var(--bg-secondary)] px-2 text-[10px] font-bold text-[var(--accent-color)] uppercase tracking-wider rounded border border-[var(--border-color)]">
                1. Horario Laboral
              </div>
              <p className="text-xs text-gray-400 mb-5 leading-relaxed">
                Define el rango principal de horas en el que se recibirán clientes para el día seleccionado.
              </p>

              <div className="space-y-5">
                {/* Día de la semana */}
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Día de la Semana
                  </label>
                  <select
                    value={formData.dia_semana}
                    onChange={(e) => setFormData({ ...formData, dia_semana: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-lg transition-all focus:ring-1 focus:ring-[var(--accent-color)] outline-none"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      opacity: (loading || !!horario?.id) ? 0.6 : 1
                    }}
                    disabled={loading || !!horario?.id}
                  >
                    {diasSemana.map(dia => (
                      <option key={dia.num} value={dia.num}>{dia.nombre}</option>
                    ))}
                  </select>
                  {horario?.id && (
                    <p
                      className="mt-1.5 text-xs italic"
                      style={{ color: 'var(--text-primary)', opacity: 0.6 }}
                    >
                      <i className="fas fa-info-circle mr-1"></i>
                      No puedes cambiar el día de un horario existente
                    </p>
                  )}
                </div>

                {/* Grid Horas Inicio y Fin */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Hora de inicio */}
                  <div>
                    <label
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <i className="far fa-clock mr-1.5" style={{ color: 'var(--accent-color)' }}></i>
                      Hora de Inicio
                    </label>
                    <input
                      type="time"
                      value={formData.hora_inicio}
                      onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg transition-all focus:ring-1 focus:ring-[var(--accent-color)] outline-none"
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        border: errors.hora_inicio ? '1px solid #EF4444' : '1px solid var(--border-color)'
                      }}
                      disabled={loading}
                    />
                    {errors.hora_inicio && (
                      <p className="mt-1.5 text-xs" style={{ color: '#EF4444' }}>
                        <i className="fas fa-exclamation-circle mr-1"></i>
                        {errors.hora_inicio}
                      </p>
                    )}
                  </div>

                  {/* Hora de fin */}
                  <div>
                    <label
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <i className="far fa-clock mr-1.5" style={{ color: 'var(--accent-color)' }}></i>
                      Hora de Fin
                    </label>
                    <input
                      type="time"
                      value={formData.hora_fin}
                      onChange={(e) => setFormData({ ...formData, hora_fin: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg transition-all focus:ring-1 focus:ring-[var(--accent-color)] outline-none"
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        border: errors.hora_fin ? '1px solid #EF4444' : '1px solid var(--border-color)'
                      }}
                      disabled={loading}
                    />
                    {errors.hora_fin && (
                      <p className="mt-1.5 text-xs" style={{ color: '#EF4444' }}>
                        <i className="fas fa-exclamation-circle mr-1"></i>
                        {errors.hora_fin}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* --- BLOQUE 2: COLACIÓN / DESCANSO --- */}
            <div className="bg-[#111] p-5 rounded-xl border border-[var(--border-color)] relative pt-6 shadow-sm">
              <div className="absolute -top-2.5 left-4 bg-[var(--bg-secondary)] px-2 text-[10px] font-bold text-amber-500 uppercase tracking-wider rounded border border-[var(--border-color)]">
                2. Colación / Descanso
              </div>
              <p className="text-xs text-gray-400 mb-5 leading-relaxed">
                Establece un periodo de receso para el barbero. Durante estas horas no se permitirán nuevas reservas.
              </p>

              <label className="flex items-center space-x-3 cursor-pointer group mb-2 w-fit">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.has_colacion}
                    onChange={(e) => setFormData({ ...formData, has_colacion: e.target.checked })}
                    className="sr-only" /* Importante: Oculta el checkbox nativo */
                    disabled={loading}
                  />
                  {/* Fondo del Switch */}
                  <div className={`block w-10 h-6 rounded-full transition-colors duration-300 ease-in-out ${formData.has_colacion ? 'bg-amber-500' : 'bg-gray-600'}`}></div>
                  {/* Círculo del Switch */}
                  <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ease-in-out ${formData.has_colacion ? 'translate-x-4' : ''}`}></div>
                </div>
                <span className="text-sm font-medium select-none" style={{ color: 'var(--text-primary)' }}>
                  Habilitar bloque de descanso
                </span>
              </label>

              {formData.has_colacion && (
                <div className="grid grid-cols-2 gap-4 animate-fadeIn border-t border-[var(--border-color)] mt-5 pt-5">
                  <div>
                    <label
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <i className="fas fa-coffee mr-1.5 text-amber-500"></i>
                      Inicio Descanso
                    </label>
                    <input
                      type="time"
                      value={formData.pausa_inicio}
                      onChange={(e) => setFormData({ ...formData, pausa_inicio: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg transition-all focus:ring-1 focus:ring-amber-500 outline-none"
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        border: errors.pausa_inicio ? '1px solid #EF4444' : '1px solid var(--border-color)'
                      }}
                      disabled={loading}
                    />
                    {errors.pausa_inicio && (
                      <p className="mt-1.5 text-xs" style={{ color: '#EF4444' }}>
                        <i className="fas fa-exclamation-circle mr-1"></i>
                        {errors.pausa_inicio}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      className="block text-sm font-medium mb-1.5"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <i className="fas fa-clock mr-1.5 text-amber-500"></i>
                      Fin Descanso
                    </label>
                    <input
                      type="time"
                      value={formData.pausa_fin}
                      onChange={(e) => setFormData({ ...formData, pausa_fin: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg transition-all focus:ring-1 focus:ring-amber-500 outline-none"
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        border: errors.pausa_fin ? '1px solid #EF4444' : '1px solid var(--border-color)'
                      }}
                      disabled={loading}
                    />
                    {errors.pausa_fin && (
                      <p className="mt-1.5 text-xs" style={{ color: '#EF4444' }}>
                        <i className="fas fa-exclamation-circle mr-1"></i>
                        {errors.pausa_fin}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* --- BLOQUE 3: ESTADO GENERAL --- */}
            <div className="bg-[#111] p-5 rounded-xl border border-[var(--border-color)] relative pt-6 shadow-sm flex items-start flex-col">
              <div className="absolute -top-2.5 left-4 bg-[var(--bg-secondary)] px-2 text-[10px] font-bold text-emerald-500 uppercase tracking-wider rounded border border-[var(--border-color)]">
                3. Estado General
              </div>
              <p className="text-xs text-gray-400 mb-5 leading-relaxed">
                Determina si el barbero trabajará o no este día. Al desactivarlo, el día completo aparecerá como no disponible.
              </p>

              <label className="flex items-center space-x-3 cursor-pointer group w-fit">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.activo}
                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                    className="sr-only" /* Oculta el checkbox nativo */
                    disabled={loading}
                  />
                  {/* Fondo del Switch */}
                  <div className={`block w-10 h-6 rounded-full transition-colors duration-300 ease-in-out ${formData.activo ? 'bg-emerald-500' : 'bg-gray-600'}`}></div>
                  {/* Círculo del Switch */}
                  <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ease-in-out ${formData.activo ? 'translate-x-4' : ''}`}></div>
                </div>
                <span className="text-sm font-medium select-none" style={{ color: 'var(--text-primary)' }}>
                  Día Laborable {formData.activo ? '(Habilitado)' : '(Deshabilitado)'}
                </span>
              </label>
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

export default HorarioModal
