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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Horarios</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configura los horarios de atención y bloqueos
          </p>
        </div>
        <select
          value={selectedBarbero}
          onChange={(e) => setSelectedBarbero(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          {barberos.map(b => (
            <option key={b.id} value={b.id}>{b.nombre} {b.apellido}</option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveView('atencion')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeView === 'atencion'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <i className="fas fa-clock mr-2"></i>
            Horarios de Atención
          </button>
          <button
            onClick={() => setActiveView('bloqueados')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeView === 'bloqueados'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <i className="fas fa-ban mr-2"></i>
            Horarios Bloqueados
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeView === 'atencion' ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Día de la Semana
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Horario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {diasSemana.map(dia => {
                const horarioDia = horariosAtencion.find(h => h.dia_semana === dia.num)
                
                return (
                  <tr key={dia.num} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                            <span className="text-amber-600 font-semibold">{dia.abrev}</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{dia.nombre}</div>
                        </div>
                      </div>
                    </td>
                    {horarioDia ? (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatTime(horarioDia.hora_inicio)} - {formatTime(horarioDia.hora_fin)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleActivo(horarioDia.id, horarioDia.activo)}
                            className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                              horarioDia.activo 
                                ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                : 'bg-red-100 text-red-800 hover:bg-red-200'
                            }`}
                          >
                            {horarioDia.activo ? 'Activo' : 'Inactivo'}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEditHorario(horarioDia)}
                            className="text-amber-600 hover:text-amber-900 mr-3"
                            title="Editar"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            onClick={() => handleDeleteHorario(horarioDia.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Eliminar"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-400 italic">Sin horario configurado</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            No disponible
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleCreateHorario(dia.num)}
                            className="text-amber-600 hover:text-amber-900"
                            title="Agregar horario"
                          >
                            <i className="fas fa-plus-circle mr-1"></i>
                            Agregar
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Info Box */}
          <div className="bg-blue-50 border-t border-blue-100 px-6 py-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <i className="fas fa-info-circle text-blue-400 text-lg"></i>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Información sobre horarios</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Los horarios se aplican semanalmente para el barbero seleccionado</li>
                    <li>Puedes activar/desactivar días específicos según necesites</li>
                    <li>Los clientes solo verán disponibles los días con horario activo</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {/* Header de bloqueados */}
          <div className="flex justify-end mb-4">
            <button
              onClick={handleCreateBloqueo}
              className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors"
            >
              <i className="fas fa-plus mr-2"></i>
              Nuevo Bloqueo
            </button>
          </div>

          {/* Tabla de bloqueados */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {horariosBloqueados.length === 0 ? (
              <div className="text-center py-12">
                <i className="fas fa-calendar-times text-gray-400 text-5xl mb-4"></i>
                <p className="text-gray-500 text-lg">No hay horarios bloqueados</p>
                <p className="text-gray-400 text-sm mt-2">
                  Crea un bloqueo para marcar fechas u horarios no disponibles
                </p>
                <button
                  onClick={handleCreateBloqueo}
                  className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Crear Primer Bloqueo
                </button>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha y Hora Inicio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha y Hora Fin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Motivo
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {horariosBloqueados.map(bloqueo => (
                    <tr key={bloqueo.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatDate(bloqueo.fecha_hora_inicio)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatTime(bloqueo.fecha_hora_inicio)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatDate(bloqueo.fecha_hora_fin)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatTime(bloqueo.fecha_hora_fin)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {bloqueo.motivo || <span className="text-gray-400 italic">Sin motivo</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditBloqueo(bloqueo)}
                          className="text-amber-600 hover:text-amber-900 mr-3"
                          title="Editar"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          onClick={() => handleDeleteBloqueo(bloqueo.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Info Box */}
          <div className="mt-4 bg-orange-50 border border-orange-100 rounded-lg px-6 py-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <i className="fas fa-exclamation-triangle text-orange-400 text-lg"></i>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-orange-800">Información sobre bloqueos</h3>
                <div className="mt-2 text-sm text-orange-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Los bloqueos impiden que los clientes reserven en esos horarios</li>
                    <li>Útil para vacaciones, permisos médicos, o eventos especiales</li>
                    <li>Puedes bloquear desde minutos hasta días completos</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showHorarioModal && (
        <HorarioModal
          horario={editingHorario}
          barberoId={selectedBarbero}
          onClose={() => {
            setShowHorarioModal(false)
            setEditingHorario(null)
          }}
          onSave={() => {
            setShowHorarioModal(false)
            setEditingHorario(null)
            loadHorariosAtencion()
          }}
        />
      )}

      {showBloqueoModal && (
        <BloqueoModal
          bloqueo={editingBloqueo}
          barberoId={selectedBarbero}
          onClose={() => {
            setShowBloqueoModal(false)
            setEditingBloqueo(null)
          }}
          onSave={() => {
            setShowBloqueoModal(false)
            setEditingBloqueo(null)
            loadHorariosBloqueados()
          }}
        />
      )}
    </div>
  )
}

export default HorariosTab
