import React, { useState, useEffect } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import type { Database } from '../../../../lib/database.types'
import toast from 'react-hot-toast'
import HorarioModal from '../modals/HorarioModal'
import BloqueoModal from '../modals/BloqueoModal'

type Barbero = Database['public']['Tables']['barberos']['Row']
type HorarioAtencion = Database['public']['Tables']['horarios_atencion']['Row']
type HorarioBloqueado = Database['public']['Tables']['horarios_bloqueados']['Row']

const diasSemana = [
  { num: 1, nombre: 'Lunes', abrev: 'L' },
  { num: 2, nombre: 'Martes', abrev: 'M' },
  { num: 3, nombre: 'Miércoles', abrev: 'X' },
  { num: 4, nombre: 'Jueves', abrev: 'J' },
  { num: 5, nombre: 'Viernes', abrev: 'V' },
  { num: 6, nombre: 'Sábado', abrev: 'S' },
  { num: 0, nombre: 'Domingo', abrev: 'D' }
]

const HorariosTab: React.FC = () => {
  const supabase = useSupabaseClient<Database>()
  const [activeView, setActiveView] = useState<'atencion' | 'bloqueados'>('atencion')
  
  // Estado para horarios de atención
  const [barberos, setBarberos] = useState<Barbero[]>([])
  const [selectedBarbero, setSelectedBarbero] = useState<string>('')
  const [horariosAtencion, setHorariosAtencion] = useState<HorarioAtencion[]>([])
  
  // Estado para horarios bloqueados
  const [horariosBloqueados, setHorariosBloqueados] = useState<HorarioBloqueado[]>([])
  
  // Estado general
  const [loading, setLoading] = useState(true)
  const [showHorarioModal, setShowHorarioModal] = useState(false)
  const [showBloqueoModal, setShowBloqueoModal] = useState(false)
  const [editingHorario, setEditingHorario] = useState<HorarioAtencion | null>(null)
  const [editingBloqueo, setEditingBloqueo] = useState<HorarioBloqueado | null>(null)

  useEffect(() => {
    loadBarberos()
  }, [])

  useEffect(() => {
    if (selectedBarbero) {
      loadHorariosAtencion()
      if (activeView === 'bloqueados') {
        loadHorariosBloqueados()
      }
    }
  }, [selectedBarbero, activeView])

  const loadBarberos = async () => {
    try {
      const { data, error } = await supabase
        .from('barberos')
        .select('*')
        .eq('activo', true)
        .order('nombre')

      if (error) throw error

      setBarberos(data || [])
      if (data && data.length > 0) {
        setSelectedBarbero(data[0].id)
      }
    } catch (error) {
      console.error('Error loading barberos:', error)
      toast.error('Error al cargar barberos')
    } finally {
      setLoading(false)
    }
  }

  const loadHorariosAtencion = async () => {
    if (!selectedBarbero) return

    try {
      const { data, error } = await supabase
        .from('horarios_atencion')
        .select('*')
        .eq('barbero_id', selectedBarbero)
        .order('dia_semana')

      if (error) throw error

      setHorariosAtencion(data || [])
    } catch (error) {
      console.error('Error loading horarios atención:', error)
      toast.error('Error al cargar horarios de atención')
    }
  }

  const loadHorariosBloqueados = async () => {
    if (!selectedBarbero) return

    try {
      const { data, error } = await supabase
        .from('horarios_bloqueados')
        .select('*')
        .eq('barbero_id', selectedBarbero)
        .order('fecha_hora_inicio', { ascending: false })

      if (error) throw error

      setHorariosBloqueados(data || [])
    } catch (error) {
      console.error('Error loading horarios bloqueados:', error)
      toast.error('Error al cargar horarios bloqueados')
    }
  }

  const handleToggleActivo = async (horarioId: string, currentActivo: boolean) => {
    try {
      const { error } = await supabase
        .from('horarios_atencion')
        .update({ activo: !currentActivo })
        .eq('id', horarioId)

      if (error) throw error

      toast.success(`Horario ${!currentActivo ? 'activado' : 'desactivado'}`)
      loadHorariosAtencion()
    } catch (error) {
      console.error('Error updating horario:', error)
      toast.error('Error al actualizar horario')
    }
  }

  const handleCreateHorario = (dia: number) => {
    setEditingHorario({
      id: '',
      barbero_id: selectedBarbero,
      dia_semana: dia,
      hora_inicio: '09:00:00',
      hora_fin: '19:00:00',
      activo: true,
      created_at: new Date().toISOString()
    } as HorarioAtencion)
    setShowHorarioModal(true)
  }

  const handleEditHorario = (horario: HorarioAtencion) => {
    setEditingHorario(horario)
    setShowHorarioModal(true)
  }

  const handleDeleteHorario = async (horarioId: string) => {
    if (!confirm('¿Estás seguro de eliminar este horario?')) return

    try {
      const { error } = await supabase
        .from('horarios_atencion')
        .delete()
        .eq('id', horarioId)

      if (error) throw error

      toast.success('Horario eliminado')
      loadHorariosAtencion()
    } catch (error) {
      console.error('Error deleting horario:', error)
      toast.error('Error al eliminar horario')
    }
  }

  const handleCreateBloqueo = () => {
    setEditingBloqueo(null)
    setShowBloqueoModal(true)
  }

  const handleEditBloqueo = (bloqueo: HorarioBloqueado) => {
    setEditingBloqueo(bloqueo)
    setShowBloqueoModal(true)
  }

  const handleDeleteBloqueo = async (bloqueoId: string) => {
    if (!confirm('¿Estás seguro de eliminar este bloqueo?')) return

    try {
      const { error } = await supabase
        .from('horarios_bloqueados')
        .delete()
        .eq('id', bloqueoId)

      if (error) throw error

      toast.success('Bloqueo eliminado')
      loadHorariosBloqueados()
    } catch (error) {
      console.error('Error deleting bloqueo:', error)
      toast.error('Error al eliminar bloqueo')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatTime = (timeString: string) => {
    if (!timeString) return ''
    // Si viene con formato completo de timestamp
    if (timeString.includes('T')) {
      const date = new Date(timeString)
      return date.toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    }
    // Si es solo hora HH:MM:SS
    return timeString.substring(0, 5)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div 
          className="animate-spin rounded-full h-12 w-12 border-b-2" 
          style={{ borderColor: 'var(--accent-color)' }}
        ></div>
      </div>
    )
  }

  return (
    <div>
      {/* Header con estilo mejorado */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h2 
              className="text-2xl sm:text-3xl font-bold mb-2" 
              style={{ color: 'var(--accent-color)' }}
            >
              <i className="fas fa-clock mr-3"></i>
              Gestión de Horarios
            </h2>
            <p style={{ color: 'var(--text-primary)', opacity: 0.7 }} className="text-sm">
              Configura los horarios de atención y bloqueos
            </p>
          </div>
          
          {/* Selector de barbero mejorado */}
          <div className="flex-shrink-0">
            <label 
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--accent-color)' }}
            >
              <i className="fas fa-user-tie mr-2"></i>
              Barbero
            </label>
            <select
              value={selectedBarbero}
              onChange={(e) => setSelectedBarbero(e.target.value)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg transition-all"
              style={{
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                minWidth: '250px'
              }}
            >
              {barberos.map(b => (
                <option key={b.id} value={b.id}>
                  {b.nombre} {b.apellido}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs de navegación mejorados */}
      <div 
        className="flex space-x-1 rounded-lg p-1 mb-6"
        style={{ 
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-color)'
        }}
      >
        <button
          onClick={() => setActiveView('atencion')}
          className="flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
          style={{
            backgroundColor: activeView === 'atencion' ? 'var(--accent-color)' : 'transparent',
            color: activeView === 'atencion' ? 'var(--bg-primary)' : 'var(--text-primary)',
            border: activeView === 'atencion' ? 'none' : '1px solid transparent'
          }}
        >
          <i className="fas fa-calendar-week"></i>
          <span className="hidden sm:inline">Horarios de Atención</span>
          <span className="sm:hidden">Atención</span>
        </button>
        <button
          onClick={() => setActiveView('bloqueados')}
          className="flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
          style={{
            backgroundColor: activeView === 'bloqueados' ? 'var(--accent-color)' : 'transparent',
            color: activeView === 'bloqueados' ? 'var(--bg-primary)' : 'var(--text-primary)',
            border: activeView === 'bloqueados' ? 'none' : '1px solid transparent'
          }}
        >
          <i className="fas fa-ban"></i>
          <span className="hidden sm:inline">Horarios Bloqueados</span>
          <span className="sm:hidden">Bloqueados</span>
        </button>
      </div>

      {/* Vista de Horarios de Atención */}
      {activeView === 'atencion' && (
        <div>
          <div className="grid gap-3">
            {diasSemana.map(dia => {
              const horarioDelDia = horariosAtencion.find(h => h.dia_semana === dia.num)
              
              return (
                <div
                  key={dia.num}
                  className="rounded-lg p-4 sm:p-5 transition-all hover:shadow-lg"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {/* Badge del día */}
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0"
                        style={{
                          backgroundColor: horarioDelDia?.activo ? 'var(--accent-color)' : 'var(--bg-primary)',
                          color: horarioDelDia?.activo ? 'var(--bg-primary)' : 'var(--text-primary)',
                          border: !horarioDelDia?.activo ? '2px solid var(--border-color)' : 'none'
                        }}
                      >
                        {dia.abrev}
                      </div>
                      
                      {/* Información del día */}
                      <div className="flex-1">
                        <h3 
                          className="font-semibold text-lg"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {dia.nombre}
                        </h3>
                        {horarioDelDia ? (
                          <div className="flex items-center gap-3 mt-1">
                            <span 
                              className="text-sm font-medium"
                              style={{ color: 'var(--accent-color)' }}
                            >
                              <i className="far fa-clock mr-1"></i>
                              {formatTime(horarioDelDia.hora_inicio)} - {formatTime(horarioDelDia.hora_fin)}
                            </span>
                            <span
                              className="text-xs px-2 py-1 rounded-full font-medium"
                              style={{
                                backgroundColor: horarioDelDia.activo 
                                  ? 'rgba(16, 185, 129, 0.2)' 
                                  : 'rgba(239, 68, 68, 0.2)',
                                color: horarioDelDia.activo ? '#10B981' : '#EF4444'
                              }}
                            >
                              {horarioDelDia.activo ? 'Disponible' : 'No disponible'}
                            </span>
                          </div>
                        ) : (
                          <p 
                            className="text-sm italic mt-1"
                            style={{ color: 'var(--text-primary)', opacity: 0.6 }}
                          >
                            Sin horario configurado
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {horarioDelDia ? (
                        <>
                          {/* Toggle activo */}
                          <button
                            onClick={() => handleToggleActivo(horarioDelDia.id, horarioDelDia.activo)}
                            className="p-2.5 rounded-lg transition-all hover:scale-105"
                            style={{
                              backgroundColor: horarioDelDia.activo ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                              color: horarioDelDia.activo ? '#10B981' : '#EF4444',
                              border: '1px solid ' + (horarioDelDia.activo ? '#10B981' : '#EF4444')
                            }}
                            title={horarioDelDia.activo ? 'Desactivar' : 'Activar'}
                          >
                            <i className={`fas ${horarioDelDia.activo ? 'fa-toggle-on' : 'fa-toggle-off'}`}></i>
                          </button>
                          
                          {/* Editar */}
                          <button
                            onClick={() => handleEditHorario(horarioDelDia)}
                            className="p-2.5 rounded-lg transition-all hover:scale-105"
                            style={{
                              backgroundColor: 'rgba(59, 130, 246, 0.2)',
                              color: '#3B82F6',
                              border: '1px solid #3B82F6'
                            }}
                            title="Editar horario"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          
                          {/* Eliminar */}
                          <button
                            onClick={() => handleDeleteHorario(horarioDelDia.id)}
                            className="p-2.5 rounded-lg transition-all hover:scale-105"
                            style={{
                              backgroundColor: 'rgba(239, 68, 68, 0.2)',
                              color: '#EF4444',
                              border: '1px solid #EF4444'
                            }}
                            title="Eliminar horario"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleCreateHorario(dia.num)}
                          className="px-4 py-2.5 rounded-lg font-medium transition-all hover:scale-105 flex items-center gap-2"
                          style={{
                            backgroundColor: 'var(--accent-color)',
                            color: 'var(--bg-primary)'
                          }}
                        >
                          <i className="fas fa-plus"></i>
                          <span className="hidden sm:inline">Agregar</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Vista de Horarios Bloqueados */}
      {activeView === 'bloqueados' && (
        <div>
          {/* Botón crear bloqueo */}
          <div className="mb-6">
            <button
              onClick={handleCreateBloqueo}
              className="px-6 py-3 rounded-lg font-medium transition-all hover:scale-105 flex items-center gap-2"
              style={{
                backgroundColor: 'var(--accent-color)',
                color: 'var(--bg-primary)'
              }}
            >
              <i className="fas fa-plus-circle"></i>
              Crear Bloqueo
            </button>
          </div>

          {/* Lista de bloqueos */}
          {horariosBloqueados.length === 0 ? (
            <div 
              className="text-center py-12 rounded-lg"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)'
              }}
            >
              <i 
                className="fas fa-calendar-check text-6xl mb-4"
                style={{ color: 'var(--accent-color)', opacity: 0.3 }}
              ></i>
              <p 
                className="text-lg"
                style={{ color: 'var(--text-primary)', opacity: 0.7 }}
              >
                No hay horarios bloqueados
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {horariosBloqueados.map(bloqueo => (
                <div
                  key={bloqueo.id}
                  className="rounded-lg p-4 sm:p-5 transition-all hover:shadow-lg"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {/* Icono */}
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.2)',
                          color: '#EF4444'
                        }}
                      >
                        <i className="fas fa-ban"></i>
                      </div>
                      
                      {/* Información del bloqueo */}
                      <div className="flex-1">
                        <h4 
                          className="font-semibold text-base mb-1"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {bloqueo.motivo || 'Bloqueo sin motivo'}
                        </h4>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                          <span 
                            className="text-sm"
                            style={{ color: 'var(--accent-color)' }}
                          >
                            <i className="far fa-calendar mr-1"></i>
                            {formatDate(bloqueo.fecha_hora_inicio)}
                          </span>
                          <span 
                            className="text-sm"
                            style={{ color: 'var(--text-primary)', opacity: 0.7 }}
                          >
                            <i className="far fa-clock mr-1"></i>
                            {formatTime(bloqueo.fecha_hora_inicio)} - {formatTime(bloqueo.fecha_hora_fin)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleEditBloqueo(bloqueo)}
                        className="p-2.5 rounded-lg transition-all hover:scale-105"
                        style={{
                          backgroundColor: 'rgba(59, 130, 246, 0.2)',
                          color: '#3B82F6',
                          border: '1px solid #3B82F6'
                        }}
                        title="Editar bloqueo"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button
                        onClick={() => handleDeleteBloqueo(bloqueo.id)}
                        className="p-2.5 rounded-lg transition-all hover:scale-105"
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.2)',
                          color: '#EF4444',
                          border: '1px solid #EF4444'
                        }}
                        title="Eliminar bloqueo"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modales */}
      {showHorarioModal && (
        <HorarioModal
          isOpen={showHorarioModal}
          onClose={() => {
            setShowHorarioModal(false)
            setEditingHorario(null)
          }}
          onSuccess={() => {
            setShowHorarioModal(false)
            setEditingHorario(null)
            loadHorariosAtencion()
          }}
          barberoId={selectedBarbero}
          horario={editingHorario}
        />
      )}

      {showBloqueoModal && (
        <BloqueoModal
          isOpen={showBloqueoModal}
          onClose={() => {
            setShowBloqueoModal(false)
            setEditingBloqueo(null)
          }}
          onSuccess={() => {
            setShowBloqueoModal(false)
            setEditingBloqueo(null)
            loadHorariosBloqueados()
          }}
          barberoId={selectedBarbero}
          bloqueo={editingBloqueo}
        />
      )}
    </div>
  )
}

export default HorariosTab
