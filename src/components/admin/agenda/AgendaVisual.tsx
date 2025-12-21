import React from 'react'
import type { Database } from '../../../../lib/database.types'

type Cita = Database['public']['Tables']['citas']['Row'] & {
  servicios: { nombre: string; duracion_minutos: number } | null
}
type HorarioBloqueado = Database['public']['Tables']['horarios_bloqueados']['Row']

interface AgendaVisualProps {
  citas: Cita[]
  bloqueos: HorarioBloqueado[]
  horaInicio: string
  horaFin: string
  onSlotClick: (hora: string) => void
  onCitaClick: (cita: Cita) => void
  onBloqueoClick: (bloqueo: HorarioBloqueado) => void
}

export default function AgendaVisual({
  citas,
  bloqueos,
  horaInicio,
  horaFin,
  onSlotClick,
  onCitaClick,
  onBloqueoClick
}: AgendaVisualProps) {
  
  // Generar slots de 30 minutos
  const generarSlots = () => {
    const slots = []
    const [startHour, startMinute] = horaInicio.split(':').map(Number)
    const [endHour, endMinute] = horaFin.split(':').map(Number)
    
    let current = new Date()
    current.setHours(startHour, startMinute, 0, 0)
    
    const end = new Date()
    end.setHours(endHour, endMinute, 0, 0)
    
    while (current < end) {
      const timeString = current.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false })
      slots.push(timeString)
      current.setMinutes(current.getMinutes() + 30)
    }
    return slots
  }

  const slots = generarSlots()

  // Verificar estado de un slot
  const getSlotState = (hora: string) => {
    // Verificar citas
    const cita = citas.find(c => {
      const inicio = c.hora.substring(0, 5)
      // Duración por defecto 30 si no hay servicio
      const duracion = c.servicios?.duracion_minutos || 30
      
      // Convertir a minutos para comparar rangos
      const [hSlot, mSlot] = hora.split(':').map(Number)
      const minSlot = hSlot * 60 + mSlot
      
      const [hCita, mCita] = inicio.split(':').map(Number)
      const minCitaInicio = hCita * 60 + mCita
      const minCitaFin = minCitaInicio + duracion
      
      return minSlot >= minCitaInicio && minSlot < minCitaFin
    })

    if (cita) return { type: 'cita', data: cita }

    // Verificar bloqueos
    const bloqueo = bloqueos.find(b => {
      // Extraer hora de fechas ISO
      const inicio = new Date(b.fecha_hora_inicio).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false })
      const fin = new Date(b.fecha_hora_fin).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false })
      
      // Lógica simplificada: si coincide la hora de inicio o está dentro
      // Para una implementación robusta se deberían comparar timestamps completos
      // Aquí asumimos que los bloqueos y slots son del mismo día
      const [hSlot, mSlot] = hora.split(':').map(Number)
      const minSlot = hSlot * 60 + mSlot
      
      const [hInicio, mInicio] = inicio.split(':').map(Number)
      const minInicio = hInicio * 60 + mInicio
      
      const [hFin, mFin] = fin.split(':').map(Number)
      const minFin = hFin * 60 + mFin
      
      return minSlot >= minInicio && minSlot < minFin
    })

    if (bloqueo) return { type: 'bloqueo', data: bloqueo }

    return { type: 'libre', data: null }
  }

  return (
    <div className="mt-4 animate-fadeIn">
      {/* Leyenda */}
      <div className="flex gap-4 mb-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[var(--bg-tertiary)] border border-[var(--border-color)]"></div>
          <span className="text-[var(--text-secondary)]">Libre</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[var(--accent-color)] opacity-20 border border-[var(--accent-color)]"></div>
          <span className="text-[var(--text-secondary)]">Reservado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-orange-500/20 border border-orange-500"></div>
          <span className="text-[var(--text-secondary)]">Bloqueado</span>
        </div>
      </div>

      {/* Grilla */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {slots.map(hora => {
          const state = getSlotState(hora)
          
          let className = "relative p-3 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[80px]"
          let content = null
          let onClick = () => onSlotClick(hora)

          if (state.type === 'libre') {
            className += " bg-[var(--bg-tertiary)] border-[var(--border-color)] hover:border-[var(--accent-color)] hover:bg-[var(--bg-secondary)]"
            content = (
              <>
                <span className="text-lg font-bold text-[var(--text-primary)]">{hora}</span>
                <span className="text-[10px] text-[var(--text-secondary)] mt-1">Disponible</span>
              </>
            )
          } else if (state.type === 'cita') {
            const cita = state.data as Cita
            className += " bg-[var(--accent-color)]/10 border-[var(--accent-color)]/30 hover:bg-[var(--accent-color)]/20"
            onClick = () => onCitaClick(cita)
            content = (
              <>
                <span className="text-sm font-bold text-[var(--accent-color)]">{hora}</span>
                <span className="text-xs font-medium text-[var(--text-primary)] truncate w-full px-1">{cita.cliente_nombre.split(' ')[0]}</span>
                <span className="text-[10px] text-[var(--text-secondary)] truncate w-full px-1">{cita.servicios?.nombre || 'Servicio'}</span>
              </>
            )
          } else if (state.type === 'bloqueo') {
            const bloqueo = state.data as HorarioBloqueado
            className += " bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20"
            onClick = () => onBloqueoClick(bloqueo)
            content = (
              <>
                <span className="text-sm font-bold text-orange-500">{hora}</span>
                <span className="text-xs font-medium text-orange-200 truncate w-full px-1">{bloqueo.motivo || 'Bloqueado'}</span>
                <i className="fas fa-ban text-orange-500/50 mt-1"></i>
              </>
            )
          }

          return (
            <div key={hora} className={className} onClick={onClick}>
              {content}
            </div>
          )
        })}
      </div>
    </div>
  )
}
