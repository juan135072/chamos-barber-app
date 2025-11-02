import { useState, useEffect } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import type { Database } from '../../../lib/database.types'

type Cita = Database['public']['Tables']['citas']['Row'] & {
  barberos?: { nombre: string; apellido: string }
  servicios?: { nombre: string; precio: number }
}

export default function CitasTab() {
  const supabase = useSupabaseClient<Database>()
  const [citas, setCitas] = useState<Cita[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState<string>('todas')
  const [filtroFecha, setFiltroFecha] = useState<string>('todas')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadCitas()
  }, [])

  const loadCitas = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('citas')
        .select(`
          *,
          barberos:barbero_id (nombre, apellido),
          servicios:servicio_id (nombre, precio)
        `)
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false })

      if (error) throw error
      setCitas(data || [])
    } catch (error) {
      console.error('Error loading citas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateEstado = async (citaId: string, nuevoEstado: string) => {
    try {
      const { error } = await supabase
        .from('citas')
        .update({ estado: nuevoEstado })
        .eq('id', citaId)

      if (error) throw error
      
      // Recargar citas
      await loadCitas()
      alert('Estado actualizado correctamente')
    } catch (error) {
      console.error('Error updating estado:', error)
      alert('Error al actualizar el estado')
    }
  }

  const handleDeleteCita = async (citaId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta cita?')) return

    try {
      const { error } = await supabase
        .from('citas')
        .delete()
        .eq('id', citaId)

      if (error) throw error
      
      await loadCitas()
      alert('Cita eliminada correctamente')
    } catch (error) {
      console.error('Error deleting cita:', error)
      alert('Error al eliminar la cita')
    }
  }

  // Filtrar citas
  const citasFiltradas = citas.filter(cita => {
    // Filtro por estado
    if (filtroEstado !== 'todas' && cita.estado !== filtroEstado) return false

    // Filtro por fecha
    const hoy = new Date().toISOString().split('T')[0]
    if (filtroFecha === 'hoy' && cita.fecha !== hoy) return false
    if (filtroFecha === 'futuras' && cita.fecha < hoy) return false
    if (filtroFecha === 'pasadas' && cita.fecha >= hoy) return false

    // Búsqueda por nombre
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const nombreCliente = cita.cliente_nombre?.toLowerCase() || ''
      const emailCliente = cita.cliente_email?.toLowerCase() || ''
      const nombreBarbero = cita.barberos 
        ? `${cita.barberos.nombre} ${cita.barberos.apellido}`.toLowerCase()
        : ''
      
      return nombreCliente.includes(searchLower) || 
             emailCliente.includes(searchLower) ||
             nombreBarbero.includes(searchLower)
    }

    return true
  })

  // Estadísticas
  const stats = {
    total: citas.length,
    pendientes: citas.filter(c => c.estado === 'pendiente').length,
    confirmadas: citas.filter(c => c.estado === 'confirmada').length,
    canceladas: citas.filter(c => c.estado === 'cancelada').length,
    completadas: citas.filter(c => c.estado === 'completada').length,
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
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Gestión de Citas</h2>
        <button
          onClick={loadCitas}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <i className="fas fa-sync-alt mr-2"></i>
          Actualizar
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Total</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg shadow">
          <div className="text-sm text-yellow-600">Pendientes</div>
          <div className="text-2xl font-bold text-yellow-700">{stats.pendientes}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow">
          <div className="text-sm text-green-600">Confirmadas</div>
          <div className="text-2xl font-bold text-green-700">{stats.confirmadas}</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg shadow">
          <div className="text-sm text-blue-600">Completadas</div>
          <div className="text-2xl font-bold text-blue-700">{stats.completadas}</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg shadow">
          <div className="text-sm text-red-600">Canceladas</div>
          <div className="text-2xl font-bold text-red-700">{stats.canceladas}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nombre, email, barbero..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="todas">Todas</option>
              <option value="pendiente">Pendientes</option>
              <option value="confirmada">Confirmadas</option>
              <option value="completada">Completadas</option>
              <option value="cancelada">Canceladas</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha
            </label>
            <select
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="todas">Todas</option>
              <option value="hoy">Hoy</option>
              <option value="futuras">Futuras</option>
              <option value="pasadas">Pasadas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de Citas */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Barbero
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Servicio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha y Hora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {citasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron citas
                  </td>
                </tr>
              ) : (
                citasFiltradas.map((cita) => (
                  <tr key={cita.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {cita.cliente_nombre}
                      </div>
                      <div className="text-sm text-gray-500">{cita.cliente_email}</div>
                      <div className="text-sm text-gray-500">{cita.cliente_telefono}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {cita.barberos 
                        ? `${cita.barberos.nombre} ${cita.barberos.apellido}`
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {cita.servicios?.nombre || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        ${cita.servicios?.precio || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>{new Date(cita.fecha).toLocaleDateString('es-ES')}</div>
                      <div className="text-gray-500">{cita.hora}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={cita.estado}
                        onChange={(e) => handleUpdateEstado(cita.id, e.target.value)}
                        className={`text-xs font-semibold px-2 py-1 rounded-full border-0 ${
                          cita.estado === 'confirmada' ? 'bg-green-100 text-green-800' :
                          cita.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                          cita.estado === 'completada' ? 'bg-blue-100 text-blue-800' :
                          cita.estado === 'cancelada' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="confirmada">Confirmada</option>
                        <option value="completada">Completada</option>
                        <option value="cancelada">Cancelada</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleDeleteCita(cita.id)}
                        className="text-red-600 hover:text-red-900 ml-4"
                        title="Eliminar cita"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumen */}
      <div className="mt-4 text-sm text-gray-500 text-center">
        Mostrando {citasFiltradas.length} de {citas.length} citas
      </div>
    </div>
  )
}
