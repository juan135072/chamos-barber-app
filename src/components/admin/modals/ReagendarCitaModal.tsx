import { useEffect, useState, type FormEvent, type MouseEvent, type ReactNode } from 'react'
import toast from 'react-hot-toast'
import { useBarberos } from '@/hooks/useBarberos'
import { posRequest } from '@/lib/pos-client'
import { BOOKING_WINDOW_DAYS } from '@/lib/bot/validation'
import { addDays, formatFechaSolo, getChileHoy } from '@/lib/date-utils'

const ENDPOINT = '/api/admin/citas/reagendar'

/** What the modal reads from an appointment row. */
export interface CitaReagendable {
  id: string
  fecha: string
  hora: string
  cliente_nombre: string
  barbero_id: string | null
  barberos?: { nombre: string; apellido: string } | null
}

interface Slot {
  hora: string
  disponible: boolean
  motivo?: string
}

interface ReagendarCitaModalProps {
  isOpen: boolean
  cita: CitaReagendable | null
  onClose: () => void
  /** Runs after the server moved the appointment, before the modal closes. */
  onSuccess: () => void
}

/**
 * Moves an appointment to another day, time or barber. The server decides
 * what is free and writes the move (/api/admin/citas/reagendar): this modal
 * only shows its slots and its refusals, and never writes to `citas` itself.
 *
 * Mount it for one appointment at a time, keyed by the appointment id: its
 * state starts from that appointment's barber and day.
 */
export default function ReagendarCitaModal({ isOpen, cita, onClose, onSuccess }: ReagendarCitaModalProps) {
  const { barberos, loading: loadingBarberos, error: barberosError } = useBarberos({ soloActivos: true })
  // Same window as a new booking: today to 30 days ahead, in Chile.
  const hoy = getChileHoy()
  const ultimoDia = addDays(hoy, BOOKING_WINDOW_DAYS)

  const [barberoId, setBarberoId] = useState(cita?.barbero_id ?? '')
  // The appointment's own day while it can still be booked, otherwise today.
  const [fecha, setFecha] = useState(() => (cita && cita.fecha >= hoy && cita.fecha <= ultimoDia ? cita.fecha : hoy))
  const [hora, setHora] = useState('')
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotsError, setSlotsError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [recarga, setRecarga] = useState(0)

  const citaId = cita?.id
  // Only an active barber can take the appointment. One without a barber, or
  // whose barber was deactivated, has no choice yet: staff must pick one.
  const barberoElegido = barberos.some((barbero) => barbero.id === barberoId) ? barberoId : ''

  useEffect(() => {
    if (!isOpen || !citaId || !barberoElegido || !fecha) return
    // A slower answer for a previous barber or day must not replace this one.
    let vigente = true
    setLoadingSlots(true)
    setSlotsError(null)
    setHora('')
    const query = new URLSearchParams({ cita_id: citaId, fecha, barbero_id: barberoElegido })
    posRequest(`${ENDPOINT}?${query}`)
      .then((result) => {
        if (vigente) setSlots(Array.isArray(result.slots) ? result.slots : [])
      })
      .catch((error: any) => {
        if (!vigente) return
        setSlots([])
        setSlotsError(error?.message || 'No se pudieron cargar los horarios. Intenta de nuevo.')
      })
      .finally(() => {
        if (vigente) setLoadingSlots(false)
      })
    return () => { vigente = false }
  }, [isOpen, citaId, barberoElegido, fecha, recarga])

  if (!isOpen || !cita) return null

  const puedeGuardar = Boolean(barberoElegido && fecha && hora) && !saving && !loadingSlots
  const cerrar = () => {
    if (!saving) onClose()
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    // Also stops a second click while the first request is in flight.
    if (!puedeGuardar) return
    setSaving(true)
    try {
      await posRequest(ENDPOINT, { cita_id: cita.id, fecha, hora, barbero_id: barberoElegido })
      toast.success('Cita reagendada')
      onSuccess()
      onClose()
    } catch (error: any) {
      // The server says why. The list on screen may be stale, so it loads again.
      toast.error(error?.message || 'No se pudo reagendar la cita. Intenta de nuevo.')
      setRecarga((veces) => veces + 1)
    } finally {
      setSaving(false)
    }
  }

  const horaActual = cita.hora.slice(0, 5)
  const barberoActual = cita.barberos ? `${cita.barberos.nombre} ${cita.barberos.apellido}` : null
  const faltaBarbero = !loadingBarberos && !barberosError && !barberoElegido
  const mismoBarberoYDia = barberoElegido === cita.barbero_id && fecha === cita.fecha
  const fieldStyle = { background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }
  const labelStyle = { color: 'var(--text-primary)', opacity: 0.9 }
  const hintStyle = { color: 'var(--text-primary)', opacity: 0.7 }

  let horarios: ReactNode
  if (!fecha) {
    horarios = <p className="text-sm" style={hintStyle}>Elige una fecha para ver los horarios.</p>
  } else if (loadingSlots) {
    horarios = <p className="text-sm" style={hintStyle}><i className="fas fa-spinner fa-spin mr-2"></i>Cargando horarios…</p>
  } else if (slotsError) {
    horarios = <p role="alert" className="text-sm text-red-500">{slotsError}</p>
  } else if (slots.length === 0) {
    horarios = <p className="text-sm" style={hintStyle}>No hay horarios para ese día.</p>
  } else {
    horarios = (
      <>
        <div className="grid grid-cols-4 gap-2">
          {slots.map((slot) => {
            const elegido = slot.hora === hora
            const actual = mismoBarberoYDia && slot.hora === horaActual
            return (
              <button
                key={slot.hora}
                type="button"
                onClick={() => setHora(slot.hora)}
                disabled={!slot.disponible || saving}
                aria-pressed={elegido}
                title={slot.disponible ? undefined : slot.motivo}
                className={`px-2 py-2 rounded-md text-sm font-medium transition-colors ${slot.disponible ? '' : 'cursor-not-allowed'}`}
                style={{
                  backgroundColor: elegido ? 'var(--accent-color)' : 'var(--bg-primary)',
                  color: elegido ? 'var(--bg-primary)' : 'var(--text-primary)',
                  border: actual ? '1px dashed var(--accent-color)' : '1px solid var(--border-color)',
                  opacity: slot.disponible ? 1 : 0.5,
                }}
              >
                {slot.hora}
                {/* Shown in the button: a disabled button gives no tooltip on touch screens. */}
                {!slot.disponible && slot.motivo && <span className="block text-[10px] font-normal leading-tight">{slot.motivo}</span>}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-xs" style={hintStyle}>Los horarios atenuados no se pueden elegir.</p>
      </>
    )
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
      onClick={(event: MouseEvent) => {
        if (event.target === event.currentTarget) cerrar()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reagendar-cita-titulo"
        className="w-full max-w-lg rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <h3 id="reagendar-cita-titulo" className="text-xl font-bold" style={{ color: 'var(--accent-color)' }}>
              <i className="fas fa-calendar-alt mr-2"></i>
              Reagendar cita
            </h3>
            <p className="mt-1 text-sm" style={hintStyle}>
              {cita.cliente_nombre} · {formatFechaSolo(cita.fecha, { weekday: 'long', day: 'numeric', month: 'long' })}, {horaActual}
              {barberoActual ? ` con ${barberoActual}` : ''}
            </p>
          </div>
          <button type="button" onClick={cerrar} disabled={saving} aria-label="Cerrar" style={hintStyle}>
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <div>
            <label htmlFor="reagendar-cita-barbero" className="block text-sm font-medium mb-2" style={labelStyle}>
              Barbero
            </label>
            <select
              id="reagendar-cita-barbero"
              value={barberoElegido}
              onChange={(event) => setBarberoId(event.target.value)}
              disabled={saving || loadingBarberos}
              className="w-full px-3 py-2 rounded-md shadow-sm"
              style={fieldStyle}
            >
              <option value="">Selecciona un barbero</option>
              {barberos.map((barbero) => (
                <option key={barbero.id} value={barbero.id}>{barbero.nombre} {barbero.apellido}</option>
              ))}
            </select>
            {loadingBarberos && <p className="mt-2 text-sm" style={hintStyle}>Cargando barberos…</p>}
            {barberosError && <p role="alert" className="mt-2 text-sm text-red-500">No se pudieron cargar los barberos. Cierra y vuelve a intentarlo.</p>}
            {faltaBarbero && (
              <p className="mt-2 text-sm text-yellow-500">
                {cita.barbero_id
                  ? 'El barbero de esta cita ya no está activo. Elige otro para ver los horarios.'
                  : 'Esta cita no tiene barbero asignado. Elige uno para ver los horarios.'}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="reagendar-cita-fecha" className="block text-sm font-medium mb-2" style={labelStyle}>
              Nueva fecha
            </label>
            <input
              id="reagendar-cita-fecha"
              type="date"
              value={fecha}
              min={hoy}
              max={ultimoDia}
              onChange={(event) => setFecha(event.target.value)}
              disabled={saving}
              required
              className="w-full px-3 py-2 rounded-md shadow-sm"
              style={fieldStyle}
            />
          </div>

          {barberoElegido && (
            <div>
              <p className="block text-sm font-medium mb-2" style={labelStyle}>Nuevo horario</p>
              {horarios}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={cerrar}
              disabled={saving}
              className="px-4 py-2 rounded-md text-sm font-medium"
              style={{ ...fieldStyle, background: 'transparent' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!puedeGuardar}
              className="px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--accent-color)', color: 'var(--bg-primary)', border: 'none' }}
            >
              {saving ? 'Guardando…' : 'Reagendar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
