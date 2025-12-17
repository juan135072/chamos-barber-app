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
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [weekDays, setWeekDays] = useState<Date[]>([])
  const [citasPorBarbero, setCitasPorBarbero] = useState<Record<string, Cita[]>>({})
  const [loading, setLoading] = useState(true)

  // Generar los 7 días de la semana actual
  useEffect(() => {
    const startOfWeek = new Date(selectedDate)
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
    
    // Seleccionar el día actual por defecto
    const today = new Date()
    const todayInWeek = days.find(d => d.toDateString() === today.toDateString())
    if (todayInWeek) {
      setSelectedDay(todayInWeek)
    } else {
      setSelectedDay(days[0])
    }
  }, [selectedDate])

  // Cargar citas del día seleccionado
  useEffect(() => {
    if (!selectedDay) return
    loadCitas()
  }, [selectedDay, barberos])

  const loadCitas = async () => {
    setLoading(true)
    try {
      const dateStr = selectedDay.toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('citas')
        .select(`
          *,
          barberos (nombre, apellido),
          servicios (nombre, duracion_minutos)
        `)
        .eq('fecha', dateStr)
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

  // Generar franjas horarias (8:00 - 20:00)
  const generateTimeSlots = () => {
    const slots: string[] = []
    for (let hour = 8; hour <= 20; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`)
    }
    return slots
  }

  const timeSlots = generateTimeSlots()

  const getCitaForTime = (barberoId: string, timeSlot: string): Cita | null => {
    const citas = citasPorBarbero[barberoId] || []
    // Buscar cita que coincida con esta hora
    return citas.find(cita => {
      const citaHour = cita.hora.substring(0, 5)
      const slotHour = timeSlot.substring(0, 2)
      return citaHour.startsWith(slotHour)
    }) || null
  }

  const previousWeek = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 7)
    setSelectedDate(newDate)
  }

  const nextWeek = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 7)
    setSelectedDate(newDate)
  }

  const goToToday = () => {
    setSelectedDate(new Date())
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

  const isSelectedDay = (date: Date) => {
    return date.toDateString() === selectedDay.toDateString()
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
            {selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
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

      {/* Selector de días de la semana */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {weekDays.map((day, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedDay(day)}
            className="flex-shrink-0 px-4 py-3 rounded-lg transition-all"
            style={{
              backgroundColor: isSelectedDay(day) 
                ? '#D4AF37' 
                : isToday(day)
                ? 'rgba(212, 175, 55, 0.1)'
                : 'rgba(255, 255, 255, 0.05)',
              border: isSelectedDay(day) 
                ? '1px solid #D4AF37' 
                : '1px solid rgba(255, 255, 255, 0.05)',
              minWidth: '80px'
            }}
          >
            <div className="flex flex-col items-center gap-1">
              <span 
                className="text-xs font-medium uppercase tracking-wider" 
                style={{ color: isSelectedDay(day) ? '#121212' : '#666' }}
              >
                {getDayName(day)}
              </span>
              <span 
                className="text-lg font-bold" 
                style={{ color: isSelectedDay(day) ? '#121212' : isToday(day) ? '#D4AF37' : '#888' }}
              >
                {getDayNumber(day)}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Vista de calendario por horas */}
      <div className="overflow-x-auto overflow-y-auto rounded-lg" style={{ border: '1px solid rgba(255, 255, 255, 0.05)', maxHeight: '70vh' }}>
        <table className="w-full" style={{ minWidth: '800px' }}>
          <thead className="sticky top-0 z-20">
            <tr>
              <th 
                className="text-left p-4 sticky left-0 z-30"
                style={{ 
                  backgroundColor: '#0A0A0A',
                  minWidth: '100px',
                  borderBottom: '2px solid rgba(212, 175, 55, 0.3)',
                  borderRight: '2px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <span className="text-sm font-bold" style={{ color: '#D4AF37' }}>Hora</span>
              </th>
              {barberos.map((barbero, idx) => (
                <th
                  key={barbero.id}
                  className="p-4 text-center"
                  style={{ 
                    backgroundColor: '#0A0A0A',
                    borderBottom: '2px solid rgba(212, 175, 55, 0.3)',
                    borderRight: idx < barberos.length - 1 ? '2px solid rgba(255, 255, 255, 0.1)' : 'none',
                    minWidth: '200px'
                  }}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
                      style={{
                        backgroundColor: 'rgba(212, 175, 55, 0.15)',
                        color: '#D4AF37',
                        border: '2px solid rgba(212, 175, 55, 0.3)'
                      }}
                    >
                      <i className="fas fa-user-tie text-lg"></i>
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: '#FFF' }}>
                        {barbero.nombre}
                      </p>
                      <p className="text-xs font-medium" style={{ color: '#D4AF37' }}>
                        {barbero.apellido}
                      </p>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((timeSlot, rowIdx) => (
              <tr key={timeSlot} className="hover:bg-white hover:bg-opacity-[0.015] transition-all group">
                <td 
                  className="p-4 sticky left-0 z-10"
                  style={{ 
                    backgroundColor: '#0A0A0A',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRight: '2px solid rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color: '#D4AF37' }}>
                      {timeSlot}
                    </span>
                  </div>
                </td>
                {barberos.map((barbero, colIdx) => {
                  const cita = getCitaForTime(barbero.id, timeSlot)
                  return (
                    <td
                      key={barbero.id}
                      className="p-3 align-top"
                      style={{ 
                        backgroundColor: colIdx % 2 === 0 ? 'rgba(212, 175, 55, 0.02)' : 'transparent',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRight: colIdx < barberos.length - 1 ? '2px solid rgba(255, 255, 255, 0.1)' : 'none'
                      }}
                    >
                      {cita ? (
                        <div
                          className="p-3 rounded-lg text-xs transition-all hover:scale-[1.03] hover:shadow-xl cursor-pointer"
                          style={{
                            backgroundColor: `${getEstadoColor(cita.estado)}15`,
                            borderLeft: `4px solid ${getEstadoColor(cita.estado)}`,
                            border: '1px solid rgba(255, 255, 255, 0.08)'
                          }}
                          onClick={() => onDateSelect && onDateSelect(selectedDay)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-sm" style={{ color: '#FFF' }}>
                              {cita.hora.substring(0, 5)}
                            </span>
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full font-bold"
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
                          <p className="truncate font-semibold mb-1" style={{ color: '#FFF' }}>
                            {cita.cliente_nombre}
                          </p>
                          {cita.servicios && (
                            <p className="text-[11px] truncate" style={{ color: '#AAA' }}>
                              {cita.servicios.nombre}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-16">
                          <span className="text-xs" style={{ color: '#1A1A1A' }}>—</span>
                        </div>
                      )}
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
