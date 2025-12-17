import React, { useState, useEffect } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import type { Database } from '../../../../lib/database.types'

type Barbero = Database['public']['Tables']['barberos']['Row']
type Cita = Database['public']['Tables']['citas']['Row'] & {
  barberos?: { nombre: string; apellido: string }
  servicios?: { nombre: string; duracion_minutos: number }
}

interface CalendarViewProps {
  barberos: Barbero[]
  onDateSelect?: (date: Date) => void
}

const CalendarView: React.FC<CalendarViewProps> = ({ barberos, onDateSelect }) => {
  const supabase = useSupabaseClient<Database>()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [weekDays, setWeekDays] = useState<Date[]>([])
  const [citasPorBarbero, setCitasPorBarbero] = useState<Record<string, Cita[]>>({})
  const [loading, setLoading] = useState(true)

  // Generar los 7 días de la semana actual
  useEffect(() => {
    const startOfWeek = new Date(currentDate)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // Lunes como inicio
    startOfWeek.setDate(diff)

    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      days.push(date)
    }
    setWeekDays(days)
  }, [currentDate])

  // Cargar citas de la semana
  useEffect(() => {
    if (weekDays.length === 0) return
    loadCitas()
  }, [weekDays, barberos])

  const loadCitas = async () => {
    setLoading(true)
    try {
      const startDate = weekDays[0].toISOString().split('T')[0]
      const endDate = weekDays[6].toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('citas')
        .select(`
          *,
          barberos (nombre, apellido),
          servicios (nombre, duracion_minutos)
        `)
        .gte('fecha', startDate)
        .lte('fecha', endDate)
        .order('hora')

      if (error) throw error

      // Agrupar citas por barbero
      const citasAgrupadas: Record<string, Cita[]> = {}
      barberos.forEach(barbero => {
        citasAgrupadas[barbero.id] = (data || []).filter(
          (cita: any) => cita.barbero_id === barbero.id
        )
      })

      setCitasPorBarbero(citasAgrupadas)
    } catch (error) {
      console.error('Error loading citas:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCitasForDay = (barberoId: string, date: Date): Cita[] => {
    const dateStr = date.toISOString().split('T')[0]
    return (citasPorBarbero[barberoId] || []).filter(cita => cita.fecha === dateStr)
  }

  const previousWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() - 7)
    setCurrentDate(newDate)
  }

  const nextWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + 7)
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const getDayName = (date: Date) => {
    return date.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()
  }

  const getDayNumber = (date: Date) => {
    return date.getDate()
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'confirmada': return '#10B981'
      case 'pendiente': return '#F59E0B'
      case 'cancelada': return '#EF4444'
      case 'completada': return '#3B82F6'
      default: return '#666'
    }
  }

  if (loading && weekDays.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con navegación */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold mb-1" style={{ color: '#FFF' }}>
            Calendario de Reservas
          </h2>
          <p className="text-sm" style={{ color: '#666' }}>
            {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: 'rgba(212, 175, 55, 0.1)',
              color: '#D4AF37',
              border: '1px solid rgba(212, 175, 55, 0.2)'
            }}
          >
            Hoy
          </button>
          <button
            onClick={previousWeek}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:bg-white hover:bg-opacity-5"
            style={{ color: '#666', border: '1px solid rgba(255, 255, 255, 0.05)' }}
          >
            <i className="fas fa-chevron-left"></i>
          </button>
          <button
            onClick={nextWeek}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:bg-white hover:bg-opacity-5"
            style={{ color: '#666', border: '1px solid rgba(255, 255, 255, 0.05)' }}
          >
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>

      {/* Calendario */}
      <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <table className="w-full" style={{ minWidth: '800px' }}>
          <thead>
            <tr>
              <th 
                className="text-left p-4 sticky left-0 z-10"
                style={{ 
                  backgroundColor: '#0A0A0A',
                  minWidth: '180px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                <span className="text-sm font-medium" style={{ color: '#888' }}>Barbero</span>
              </th>
              {weekDays.map((day, idx) => (
                <th
                  key={idx}
                  className="p-4 text-center"
                  style={{ 
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    minWidth: '140px',
                    backgroundColor: isToday(day) ? 'rgba(212, 175, 55, 0.03)' : 'transparent'
                  }}
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#666' }}>
                      {getDayName(day)}
                    </span>
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold transition-all"
                      style={{
                        color: isToday(day) ? '#121212' : '#888',
                        backgroundColor: isToday(day) ? '#D4AF37' : 'rgba(255, 255, 255, 0.05)'
                      }}
                    >
                      {getDayNumber(day)}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {barberos.map((barbero) => (
              <tr key={barbero.id} className="hover:bg-white hover:bg-opacity-[0.02] transition-all">
                <td 
                  className="p-4 sticky left-0 z-10"
                  style={{ 
                    backgroundColor: '#0A0A0A',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: 'rgba(212, 175, 55, 0.1)',
                        color: '#D4AF37'
                      }}
                    >
                      <i className="fas fa-user-tie text-base"></i>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: '#FFF' }}>
                        {barbero.nombre}
                      </p>
                      <p className="text-xs truncate" style={{ color: '#666' }}>
                        {barbero.apellido}
                      </p>
                    </div>
                  </div>
                </td>
                {weekDays.map((day, dayIdx) => {
                  const citas = getCitasForDay(barbero.id, day)
                  return (
                    <td
                      key={dayIdx}
                      className="p-3 align-top"
                      style={{ 
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        backgroundColor: isToday(day) ? 'rgba(212, 175, 55, 0.03)' : 'transparent'
                      }}
                    >
                      <div className="space-y-2 min-h-[80px]">
                        {citas.length === 0 ? (
                          <div className="flex items-center justify-center h-full py-6">
                            <span className="text-xs" style={{ color: '#333' }}>—</span>
                          </div>
                        ) : (
                          citas.map((cita) => (
                            <div
                              key={cita.id}
                              className="p-3 rounded-lg text-xs transition-all hover:scale-[1.02] cursor-pointer group"
                              style={{
                                backgroundColor: `${getEstadoColor(cita.estado)}10`,
                                borderLeft: `2px solid ${getEstadoColor(cita.estado)}`,
                                border: '1px solid rgba(255, 255, 255, 0.05)'
                              }}
                              onClick={() => onDateSelect && onDateSelect(day)}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-sm" style={{ color: '#FFF' }}>
                                  {cita.hora.substring(0, 5)}
                                </span>
                                <span
                                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                  style={{
                                    backgroundColor: getEstadoColor(cita.estado),
                                    color: '#FFF'
                                  }}
                                >
                                  {cita.estado === 'confirmada' ? '✓' : 
                                   cita.estado === 'pendiente' ? '⋯' :
                                   cita.estado === 'cancelada' ? '×' : '✓'}
                                </span>
                              </div>
                              <p className="truncate font-medium mb-1" style={{ color: '#DDD' }}>
                                {cita.cliente_nombre}
                              </p>
                              {cita.servicios && (
                                <p className="text-[11px] truncate" style={{ color: '#888' }}>
                                  {cita.servicios.nombre}
                                </p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-6 flex-wrap pt-2">
        <span className="text-sm font-medium" style={{ color: '#888' }}>Estados:</span>
        {[
          { estado: 'confirmada', label: 'Confirmada', icon: '✓' },
          { estado: 'pendiente', label: 'Pendiente', icon: '⋯' },
          { estado: 'completada', label: 'Completada', icon: '✓' },
          { estado: 'cancelada', label: 'Cancelada', icon: '×' },
        ].map(({ estado, label, icon }) => (
          <div key={estado} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: getEstadoColor(estado) }}
            />
            <span className="text-sm" style={{ color: '#888' }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CalendarView
