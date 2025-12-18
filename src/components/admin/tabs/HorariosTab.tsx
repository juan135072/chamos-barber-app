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

  // Función para replicar el horario de un día a otro
  const handleReplicarHorario = async (origenHorario: HorarioAtencion, destinoDia: number) => {
    try {
      // Verificar si ya existe un horario para el día destino
      const existente = horariosAtencion.find(h => h.dia_semana === destinoDia)
      
      if (existente) {
        // Actualizar existente
        const { error } = await supabase
          .from('horarios_atencion')
          .update({
            hora_inicio: origenHorario.hora_inicio,
            hora_fin: origenHorario.hora_fin,
            activo: true, // Lo activamos por defecto al copiar
            updated_at: new Date().toISOString()
          })
          .eq('id', existente.id)
        
        if (error) throw error
      } else {
        // Crear nuevo
        const { error } = await supabase
          .from('horarios_atencion')
          .insert({
            barbero_id: selectedBarbero,
            dia_semana: destinoDia,
            hora_inicio: origenHorario.hora_inicio,
            hora_fin: origenHorario.hora_fin,
            activo: true
          })
        
        if (error) throw error
      }
      
      toast.success('Horario copiado exitosamente')
      loadHorariosAtencion()
    } catch (error) {
      console.error('Error replicando horario:', error)
      toast.error('Error al copiar el horario')
    }
  }

  // Función para copiar horario a todos los días laborales (Lunes a Viernes)
  const handleCopiarALunesViernes = async (horarioBase: HorarioAtencion) => {
    if (!confirm('¿Estás seguro? Esto sobrescribirá los horarios de Lunes a Viernes con este horario.')) return
    
    setLoading(true)
    try {
      const diasLaborales = [1, 2, 3, 4, 5] // Lunes a Viernes
      
      // Filtrar el día actual para no "copiarse a sí mismo" innecesariamente, aunque no hace daño
      const diasDestino = diasLaborales.filter(d => d !== horarioBase.dia_semana)
      
      for (const dia of diasDestino) {
        await handleReplicarHorario(horarioBase, dia)
      }
      
      toast.success('Horario aplicado de Lunes a Viernes')
    } catch (error) {
      console.error('Error copying schedule:', error)
      toast.error('Error al copiar horarios')
    } finally {
      setLoading(false)
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
    <div className="fade-in">
      {/* Minimal Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-minimal-h2 mb-1">Horarios</h2>
          <p className="text-minimal-body">Gestiona horarios y bloqueos</p>
        </div>
        
        <select
          value={selectedBarbero}
          onChange={(e) => setSelectedBarbero(e.target.value)}
          className="select-minimal"
          style={{ minWidth: '200px' }}
        >
          {barberos.map(b => (
            <option key={b.id} value={b.id}>
              {b.nombre} {b.apellido}
            </option>
          ))}
        </select>
      </div>

      {/* Minimal Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveView('atencion')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            activeView === 'atencion' ? 'btn-minimal-primary' : 'btn-minimal-ghost'
          }`}
        >
          <i className="fas fa-calendar-week"></i>
          <span className="hidden sm:inline">Horarios</span>
        </button>
        <button
          onClick={() => setActiveView('bloqueados')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            activeView === 'bloqueados' ? 'btn-minimal-primary' : 'btn-minimal-ghost'
          }`}
        >
          <i className="fas fa-ban"></i>
          <span className="hidden sm:inline">Bloqueados</span>
        </button>
      </div>

      {/* Vista de Horarios de Atención */}
      {activeView === 'atencion' && (
        <div>
          <div className="space-y-2">
            {diasSemana.map(dia => {
              const horarioDelDia = horariosAtencion.find(h => h.dia_semana === dia.num)
              
              return (
                <div
                  key={dia.num}
                  className="minimal-card p-4 hover-lift"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {/* Badge del día */}
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-sm flex-shrink-0"
                        style={{
                          backgroundColor: horarioDelDia?.activo ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          color: horarioDelDia?.activo ? '#D4AF37' : '#666',
                          border: horarioDelDia?.activo ? '1px solid rgba(212, 175, 55, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)'
                        }}
                      >
                        {dia.abrev}
                      </div>
                      
                      {/* Información del día */}
                      <div className="flex-1">
                        <h3 className="text-minimal-h3">
                          {dia.nombre}
                        </h3>
                        {horarioDelDia ? (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-minimal-caption" style={{ color: '#888' }}>
                              {formatTime(horarioDelDia.hora_inicio)} - {formatTime(horarioDelDia.hora_fin)}
                            </span>
                            <span className={`badge-minimal ${horarioDelDia.activo ? 'badge-success' : 'badge-error'}`}>
                              {horarioDelDia.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>
                        ) : (
                          <p className="text-minimal-caption mt-1">
                            Sin configurar
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {horarioDelDia ? (
                        <>
                          <div className="relative group">
                            <button
                              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white hover:bg-opacity-10 text-gray-400"
                              title="Copiar horario"
                            >
                              <i className="fas fa-copy text-sm"></i>
                            </button>
                            {/* Dropdown simple para copiar */}
                            <div className="absolute right-0 top-full mt-1 w-48 bg-[#1a1a1a] border border-[#333] rounded-lg shadow-xl z-50 hidden group-hover:block">
                              <button
                                onClick={() => handleCopiarALunesViernes(horarioDelDia)}
                                className="w-full text-left px-4 py-2 text-xs hover:bg-[#333] text-gray-300 rounded-lg"
                              >
                                Aplicar a Lunes-Viernes
                              </button>
                            </div>
                          </div>

                          <button
                            onClick={() => handleToggleActivo(horarioDelDia.id, horarioDelDia.activo)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white hover:bg-opacity-10"
                            style={{ color: horarioDelDia.activo ? '#10B981' : '#EF4444' }}
                            title={horarioDelDia.activo ? 'Desactivar' : 'Activar'}
                          >
                            <i className="fas fa-power-off text-sm"></i>
                          </button>
                          <button
                            onClick={() => handleEditHorario(horarioDelDia)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white hover:bg-opacity-10"
                            style={{ color: '#666' }}
                            title="Editar"
                          >
                            <i className="fas fa-pen text-sm"></i>
                          </button>
                          <button
                            onClick={() => handleDeleteHorario(horarioDelDia.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white hover:bg-opacity-10"
                            style={{ color: '#EF4444' }}
                            title="Eliminar"
                          >
                            <i className="fas fa-trash text-sm"></i>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleCreateHorario(dia.num)}
                          className="btn-minimal btn-minimal-primary"
                        >
                          <i className="fas fa-plus"></i>
                          <span className="hidden sm:inline ml-2">Agregar</span>
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
          <div className="mb-6">
            <button
              onClick={handleCreateBloqueo}
              className="btn-minimal btn-minimal-primary"
            >
              <i className="fas fa-plus"></i>
              <span className="ml-2">Crear Bloqueo</span>
            </button>
          </div>

          {horariosBloqueados.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <i className="fas fa-calendar-check"></i>
              </div>
              <p className="empty-state-text">
                No hay horarios bloqueados
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {horariosBloqueados.map(bloqueo => (
                <div
                  key={bloqueo.id}
                  className="minimal-card p-4 hover-lift"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          color: '#EF4444'
                        }}
                      >
                        <i className="fas fa-ban text-sm"></i>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="text-minimal-h3 truncate">
                          {bloqueo.motivo || 'Bloqueo'}
                        </h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-minimal-caption">
                            {formatDate(bloqueo.fecha_hora_inicio)}
                          </span>
                          <span className="text-minimal-caption">
                            {formatTime(bloqueo.fecha_hora_inicio)} - {formatTime(bloqueo.fecha_hora_fin)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleEditBloqueo(bloqueo)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white hover:bg-opacity-10"
                        style={{ color: '#666' }}
                        title="Editar"
                      >
                        <i className="fas fa-pen text-sm"></i>
                      </button>
                      <button
                        onClick={() => handleDeleteBloqueo(bloqueo.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white hover:bg-opacity-10"
                        style={{ color: '#EF4444' }}
                        title="Eliminar"
                      >
                        <i className="fas fa-trash text-sm"></i>
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
