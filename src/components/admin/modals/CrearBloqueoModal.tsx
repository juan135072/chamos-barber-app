import React, { useState } from 'react'
import { X, Clock, Coffee, AlertTriangle } from 'lucide-react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import type { Database } from '../../../../lib/database.types'
import toast from 'react-hot-toast'

interface CrearBloqueoModalProps {
  isOpen: boolean
  barberoId: string
  fecha: string
  horaInicio?: string
  onClose: () => void
  onSuccess: () => void
}

const DURACIONES = [
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 hora', value: 60 },
  { label: '1.5 horas', value: 90 },
  { label: '2 horas', value: 120 },
]

const TIPOS = [
  { label: 'Almuerzo', icon: <i className="fas fa-utensils"></i>, value: 'Almuerzo' },
  { label: 'Descanso', icon: <i className="fas fa-coffee"></i>, value: 'Descanso' },
  { label: 'Personal', icon: <i className="fas fa-user-clock"></i>, value: 'Personal' },
  { label: 'Otro', icon: <i className="fas fa-question-circle"></i>, value: 'Otro' }
]

export default function CrearBloqueoModal({
  isOpen,
  barberoId,
  fecha,
  horaInicio: horaInicioProp,
  onClose,
  onSuccess
}: CrearBloqueoModalProps) {
  const supabase = useSupabaseClient<Database>()
  const [horaInicio, setHoraInicio] = useState(horaInicioProp || '13:00')
  const [duracion, setDuracion] = useState(60)
  const [tipo, setTipo] = useState('Almuerzo')
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Calcular fecha fin
      const fechaHoraInicio = new Date(`${fecha}T${horaInicio}:00`)
      const fechaHoraFin = new Date(fechaHoraInicio.getTime() + duracion * 60000)

      // Formato para DB: YYYY-MM-DDTHH:mm:ss
      const inicioISO = fechaHoraInicio.toISOString().slice(0, 19) // Sin timezone para simplificar local
      const finISO = fechaHoraFin.toISOString().slice(0, 19)

      // Insertar en horarios_bloqueados
      const { error } = await supabase
        .from('horarios_bloqueados')
        .insert({
          barbero_id: barberoId,
          fecha_hora_inicio: inicioISO,
          fecha_hora_fin: finISO,
          motivo: tipo + (notas ? `: ${notas}` : '')
        })

      if (error) throw error

      toast.success('Bloqueo creado exitosamente')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error creando bloqueo:', error)
      toast.error('Error al crear bloqueo')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-lg shadow-xl my-8 flex flex-col"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/20 text-orange-500">
              <Coffee size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                Agregar Bloqueo
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Reservar tiempo personal para {fecha}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Tipo de Bloqueo */}
          <div>
            <label className="block text-sm font-medium mb-3 text-[var(--text-primary)]">Tipo de Bloqueo</label>
            <div className="grid grid-cols-2 gap-3">
              {TIPOS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTipo(t.value)}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-sm transition-all ${tipo === t.value
                      ? 'border-orange-500 bg-orange-500/10 text-orange-500'
                      : 'border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:border-orange-500/50'
                    }`}
                >
                  <span className="text-lg">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Hora y Duración */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--text-primary)]">
                <Clock className="inline w-4 h-4 mr-1" /> Hora Inicio
              </label>
              <input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-orange-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--text-primary)]">
                <i className="fas fa-hourglass-half mr-1"></i> Duración
              </label>
              <select
                value={duracion}
                onChange={(e) => setDuracion(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-orange-500"
              >
                {DURACIONES.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--text-primary)]">Notas (Opcional)</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Detalles adicionales..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Warning */}
          <div className="flex gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-200 text-sm">
            <AlertTriangle className="shrink-0 w-5 h-5 text-orange-500" />
            <p>Este horario no estará disponible para reservas online.</p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Coffee className="w-4 h-4" />
                  Crear Bloqueo
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
