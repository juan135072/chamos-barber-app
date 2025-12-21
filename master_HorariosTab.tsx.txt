import React, { useState, useEffect } from 'react'
import { chamosSupabase } from '../../../../lib/supabase-helpers'
import type { Database } from '../../../../lib/database.types'
import toast from 'react-hot-toast'

type Barbero = Database['public']['Tables']['barberos']['Row']
type Horario = Database['public']['Tables']['horarios_trabajo']['Row'] & {
  barberos?: { nombre: string; apellido: string }
}

const diasSemana = [
  { num: 0, nombre: 'Domingo' },
  { num: 1, nombre: 'Lunes' },
  { num: 2, nombre: 'Martes' },
  { num: 3, nombre: 'Miércoles' },
  { num: 4, nombre: 'Jueves' },
  { num: 5, nombre: 'Viernes' },
  { num: 6, nombre: 'Sábado' }
]

const HorariosTab: React.FC = () => {
  const [barberos, setBarberos] = useState<Barbero[]>([])
  const [selectedBarbero, setSelectedBarbero] = useState<string>('')
  const [horarios, setHorarios] = useState<Horario[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadBarberos()
  }, [])

  useEffect(() => {
    if (selectedBarbero) {
      loadHorarios()
    }
  }, [selectedBarbero])

  const loadBarberos = async () => {
    try {
      const data = await chamosSupabase.getBarberos()
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

  const loadHorarios = async () => {
    try {
      const data = await chamosSupabase.getHorariosTrabajo(selectedBarbero)
      setHorarios(data || [])
    } catch (error) {
      console.error('Error loading horarios:', error)
      toast.error('Error al cargar horarios')
    }
  }

  const handleToggleActivo = async (horarioId: string, currentActivo: boolean) => {
    try {
      await chamosSupabase.updateHorarioTrabajo(horarioId, {
        activo: !currentActivo
      })
      toast.success('Horario actualizado')
      loadHorarios()
    } catch (error) {
      console.error('Error updating horario:', error)
      toast.error('Error al actualizar horario')
    }
  }

  const handleCreateHorario = async (dia: number) => {
    try {
      setSaving(true)
      await chamosSupabase.createHorarioTrabajo({
        barbero_id: selectedBarbero,
        dia_semana: dia,
        hora_inicio: '09:00',
        hora_fin: '18:00',
        activo: true,
        descanso_inicio: '13:00',
        descanso_fin: '14:00'
      })
      toast.success('Horario creado')
      loadHorarios()
    } catch (error) {
      console.error('Error creating horario:', error)
      toast.error('Error al crear horario')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteHorario = async (horarioId: string) => {
    if (!confirm('¿Eliminar este horario?')) return
    
    try {
      await chamosSupabase.deleteHorarioTrabajo(horarioId)
      toast.success('Horario eliminado')
      loadHorarios()
    } catch (error) {
      console.error('Error deleting horario:', error)
      toast.error('Error al eliminar horario')
    }
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Horarios</h2>
          <p className="text-sm text-gray-600 mt-1">Configura los horarios de trabajo</p>
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

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Día</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horario</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descanso</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {diasSemana.map(dia => {
              const horarioDia = horarios.find(h => h.dia_semana === dia.num)
              
              return (
                <tr key={dia.num} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{dia.nombre}</div>
                  </td>
                  {horarioDia ? (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {horarioDia.hora_inicio} - {horarioDia.hora_fin}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {horarioDia.descanso_inicio && horarioDia.descanso_fin 
                          ? `${horarioDia.descanso_inicio} - ${horarioDia.descanso_fin}`
                          : 'Sin descanso'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleActivo(horarioDia.id, horarioDia.activo)}
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            horarioDia.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {horarioDia.activo ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400" colSpan={2}>
                        Sin horario configurado
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          No disponible
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => handleCreateHorario(dia.num)}
                          disabled={saving}
                          className="text-amber-600 hover:text-amber-900 disabled:opacity-50"
                          title="Agregar horario"
                        >
                          <i className="fas fa-plus-circle"></i>
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <i className="fas fa-info-circle text-blue-400"></i>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Información</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Los horarios por defecto son de 9:00 a 18:00</li>
                <li>El descanso por defecto es de 13:00 a 14:00</li>
                <li>Para editar horarios específicos, elimina y crea uno nuevo</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HorariosTab
