import { useState, useEffect } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import type { Database } from '../../../../lib/database.types'

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

  const handleDeleteCancelled = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // 1. Validar si hay citas canceladas
    const canceladas = citas.filter(c => c.estado === 'cancelada');

    if (canceladas.length === 0) {
      alert('No hay citas canceladas para eliminar.');
      return;
    }

    if (!window.confirm(`¿Estás seguro de que quieres eliminar las ${canceladas.length} citas canceladas?\n\nEsto liberará las facturas asociadas.`)) {
      return;
    }


    try {
      setLoading(true);
      window.alert('¡ORDEN RECIBIDA! Conectando con Supabase...');
      if (!supabase) throw new Error('Cliente Supabase no inicializado');

      // 3. Llamada al RPC (que ahora maneja referencias a facturas)
      const { data, error } = await supabase.rpc('eliminar_citas_canceladas');

      if (error) {
        throw error;
      }

      if (data && data.success) {
        // 4. Éxito: Recargar la lista de citas
        await loadCitas();
        alert(data.message || 'Citas eliminadas con éxito.');
      } else {
        alert('Error del servidor: ' + (data?.error || 'No se pudo completar la operación.'));
      }

    } catch (err: any) {
      console.error('Error en borrado:', err);
      alert('Error al eliminar: ' + (err.message || 'Error de conexión.'));
    } finally {
      setLoading(false);
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
        <div className="animate-spin rounded-full h-12 w-12" style={{ borderBottom: '2px solid var(--accent-color)' }}></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--accent-color)' }}>Gestión de Citas</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={(e) => handleDeleteCancelled(e)}
            className="inline-flex items-center px-4 py-2 rounded-md shadow-sm text-sm font-medium border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white transition-colors animate-pulse"
            style={{ background: 'transparent' }}
            disabled={loading}
          >
            <i className="fas fa-trash-alt mr-2"></i>
            {loading ? 'Borrando...' : `Eliminar Canceladas (${stats.canceladas})`}
          </button>
          <button
            onClick={loadCitas}
            className="inline-flex items-center px-4 py-2 rounded-md shadow-sm text-sm font-medium"
            style={{
              backgroundColor: 'var(--accent-color)',
              color: 'var(--bg-primary)',
              border: 'none'
            }}
          >
            <i className="fas fa-sync-alt mr-2"></i>
            Actualizar
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }} className="p-4 rounded-lg shadow">
          <div className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Total</div>
          <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.total}</div>
        </div>
        <div style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)' }} className="p-4 rounded-lg shadow">
          <div className="text-sm text-yellow-500">Pendientes</div>
          <div className="text-2xl font-bold text-yellow-400">{stats.pendientes}</div>
        </div>
        <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }} className="p-4 rounded-lg shadow">
          <div className="text-sm text-green-500">Confirmadas</div>
          <div className="text-2xl font-bold text-green-400">{stats.confirmadas}</div>
        </div>
        <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }} className="p-4 rounded-lg shadow">
          <div className="text-sm text-blue-500">Completadas</div>
          <div className="text-2xl font-bold text-blue-400">{stats.completadas}</div>
        </div>
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }} className="p-4 rounded-lg shadow">
          <div className="text-sm text-red-500">Canceladas</div>
          <div className="text-2xl font-bold text-red-400">{stats.canceladas}</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }} className="p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)', opacity: 0.9 }}>
              Buscar
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nombre, email, barbero..."
              className="w-full px-3 py-2 rounded-md shadow-sm"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)'
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)', opacity: 0.9 }}>
              Estado
            </label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full px-3 py-2 rounded-md shadow-sm"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="todas">Todas</option>
              <option value="pendiente">Pendientes</option>
              <option value="confirmada">Confirmadas</option>
              <option value="completada">Completadas</option>
              <option value="cancelada">Canceladas</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)', opacity: 0.9 }}>
              Fecha
            </label>
            <select
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              className="w-full px-3 py-2 rounded-md shadow-sm"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)'
              }}
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
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }} className="shadow rounded-lg overflow-x-auto">
        <table className="min-w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead style={{ background: 'var(--bg-tertiary)' }}>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                Cliente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                Barbero
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                Servicio
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                Fecha y Hora
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                Acciones
              </th>
            </tr>
          </thead>
          <tbody style={{ background: 'var(--bg-secondary)' }}>
            {citasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center" style={{ color: 'var(--text-primary)', opacity: 0.7, borderTop: '1px solid var(--border-color)' }}>
                  No se encontraron citas
                </td>
              </tr>
            ) : (
              citasFiltradas.map((cita) => (
                <tr key={cita.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {cita.cliente_nombre}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>{cita.cliente_email}</div>
                    <div className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>{cita.cliente_telefono}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--text-primary)' }}>
                    {cita.barberos
                      ? `${cita.barberos.nombre} ${cita.barberos.apellido}`
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      {cita.servicios?.nombre || 'N/A'}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                      ${cita.servicios?.precio || 0}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--text-primary)' }}>
                    <div>{new Date(cita.fecha).toLocaleDateString('es-ES')}</div>
                    <div style={{ color: 'var(--text-primary)', opacity: 0.7 }}>{cita.hora}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={cita.estado}
                      onChange={(e) => handleUpdateEstado(cita.id, e.target.value)}
                      className={`text-xs font-semibold px-2 py-1 rounded-full border-0 ${cita.estado === 'confirmada' ? 'bg-green-100 text-green-800' :
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

      {/* Resumen */}
      <div className="mt-4 text-sm text-center" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
        Mostrando {citasFiltradas.length} de {citas.length} citas
      </div>
    </div>
  )
}
