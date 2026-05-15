import { useState, useEffect } from 'react'
import { useSupabaseClient, useSession } from '@/lib/insforge-react'
import type { Database } from '@/lib/database.types'
import { formatFechaChile } from '@/lib/date-utils'
import NotasClienteModal from './NotasClienteModal'
import toast from 'react-hot-toast'

type Cita = Database['public']['Tables']['citas']['Row'] & {
  servicios?: { nombre: string; precio: number }
}

type NotaCliente = Database['public']['Tables']['notas_clientes']['Row']

interface CitasSectionProps {
  barberoId: string
}

export default function CitasSection({ barberoId }: CitasSectionProps) {
  const supabase = useSupabaseClient<Database>()
  const [citas, setCitas] = useState<Cita[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState<string>('todas')
  const [filtroFecha, setFiltroFecha] = useState<string>('todas')
  const [searchTerm, setSearchTerm] = useState('')
  const [notasClientes, setNotasClientes] = useState<Record<string, number>>({})
  const [modalNotasOpen, setModalNotasOpen] = useState(false)
  const [clienteSeleccionado, setClienteSeleccionado] = useState<{
    email: string
    nombre: string
    telefono: string
    citaId?: string
  } | null>(null)

  useEffect(() => {
    if (barberoId) {
      loadCitas()
      loadNotasCount()
    }
  }, [barberoId])

  // Suscripción Realtime: recarga citas cuando llega una nueva reserva o cambia el estado
  useEffect(() => {
    if (!barberoId) return

    const channel = supabase
      .channel(`citas-barbero-panel-${barberoId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'citas', filter: `barbero_id=eq.${barberoId}` },
        (payload: any) => {
          if (process.env.NODE_ENV !== 'production') {
            console.log('[CitasSection] Realtime cita change:', payload.eventType)
          }
          loadCitas()
          if (payload.eventType === 'INSERT') {
            toast('Nueva cita reservada', { icon: '🔔' })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [barberoId, supabase])

  const loadCitas = async () => {
    try {
      setLoading(true)

      // Solo cargar citas de ESTE barbero
      const { data, error } = await supabase
        .from('citas')
        .select(`
          *,
          servicios:servicio_id (nombre, precio)
        `)
        .eq('barbero_id', barberoId)
        .order('fecha', { ascending: false })
        .order('hora', { ascending: false })

      if (error) throw error

      console.log('Citas del barbero cargadas:', data?.length)
      setCitas(data || [])
    } catch (error) {
      console.error('Error loading citas:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadNotasCount = async () => {
    try {
      const { data, error } = await supabase
        .from('notas_clientes')
        .select('cliente_email')
        .eq('barbero_id', barberoId)

      if (error) throw error

      // Contar notas por cliente
      const counts: Record<string, number> = {}
      data?.forEach((nota: any) => {
        counts[nota.cliente_email] = (counts[nota.cliente_email] || 0) + 1
      })
      setNotasClientes(counts)
    } catch (error) {
      console.error('Error loading notas count:', error)
    }
  }

  const handleOpenNotas = (cita: Cita) => {
    setClienteSeleccionado({
      email: cita.cliente_email || '',
      nombre: cita.cliente_nombre,
      telefono: cita.cliente_telefono,
      citaId: cita.id
    })
    setModalNotasOpen(true)
  }

  const handleCloseNotas = () => {
    setModalNotasOpen(false)
    setClienteSeleccionado(null)
  }

  const handleNotaSaved = () => {
    loadNotasCount()
  }

  const handleUpdateEstado = async (citaId: string, nuevoEstado: string) => {
    try {
      const { error } = await supabase
        .from('citas')
        .update({ estado: nuevoEstado })
        .eq('id', citaId)
        .eq('barbero_id', barberoId) // Verificar que sea su cita

      if (error) throw error

      await loadCitas()
      toast.success('Estado actualizado correctamente')
    } catch (error) {
      console.error('Error updating estado:', error)
      toast.error('Error al actualizar el estado')
    }
  }

  const handleDeleteCita = async (citaId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta cita del historial?')) return

    try {
      const { error } = await supabase
        .from('citas')
        .delete()
        .eq('id', citaId)
        .eq('barbero_id', barberoId) // Verificar que sea su cita

      if (error) throw error

      await loadCitas()
      toast.success('Cita eliminada correctamente')
    } catch (error) {
      console.error('Error deleting cita:', error)
      toast.error('Error al eliminar la cita')
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

    // Búsqueda por nombre, email o teléfono
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const nombreCliente = cita.cliente_nombre?.toLowerCase() || ''
      const emailCliente = cita.cliente_email?.toLowerCase() || ''
      const telefonoCliente = cita.cliente_telefono?.toLowerCase() || ''

      return nombreCliente.includes(searchLower) ||
        emailCliente.includes(searchLower) ||
        telefonoCliente.includes(searchLower)
    }

    return true
  })

  // Estadísticas
  const stats = {
    total: citas.length,
    hoy: citas.filter(c => c.fecha === new Date().toISOString().split('T')[0]).length,
    pendientes: citas.filter(c => c.estado === 'pendiente').length,
    confirmadas: citas.filter(c => c.estado === 'confirmada').length,
    completadas: citas.filter(c => c.estado === 'completada').length,
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="mt-2">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-white uppercase tracking-wider">Mis Citas</h2>
        <button
          onClick={loadCitas}
          className="relative group inline-flex overflow-hidden rounded-xl bg-gold/20 p-[1px] shrink-0"
        >
          <div className="relative bg-[#080808] px-4 py-2 rounded-xl transition-colors duration-300 group-hover:bg-gold/10 flex items-center gap-2">
            <i className="fas fa-sync-alt text-gold group-hover:rotate-180 transition-transform duration-500"></i>
            <span className="relative z-10 text-white font-bold text-sm uppercase">Actualizar</span>
          </div>
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white/[0.02] border border-white/10 p-4 rounded-2xl backdrop-blur-xl">
          <div className="text-xs text-white/50 uppercase tracking-widest mb-1">Total</div>
          <div className="text-2xl font-black text-white">{stats.total}</div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl backdrop-blur-xl">
          <div className="text-xs text-blue-400 uppercase tracking-widest mb-1">Hoy</div>
          <div className="text-2xl font-black text-blue-300">{stats.hoy}</div>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-2xl backdrop-blur-xl">
          <div className="text-xs text-yellow-400 uppercase tracking-widest mb-1">Pendientes</div>
          <div className="text-2xl font-black text-yellow-300">{stats.pendientes}</div>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-2xl backdrop-blur-xl">
          <div className="text-xs text-green-400 uppercase tracking-widest mb-1">Confirmadas</div>
          <div className="text-2xl font-black text-green-300">{stats.confirmadas}</div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl backdrop-blur-xl">
          <div className="text-xs text-blue-400 uppercase tracking-widest mb-1">Completadas</div>
          <div className="text-2xl font-black text-blue-300">{stats.completadas}</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white/[0.02] border border-white/10 p-4 rounded-2xl mb-6 backdrop-blur-xl grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2">
            Buscar
          </label>
          <input
            type="text"
            placeholder="Nombre, email o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-gold transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2">
            Estado
          </label>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="w-full px-4 py-2 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold transition-colors"
          >
            <option value="todas">Todas</option>
            <option value="pendiente">Pendientes</option>
            <option value="confirmada">Confirmadas</option>
            <option value="completada">Completadas</option>
            <option value="cancelada">Canceladas</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2">
            Fecha
          </label>
          <select
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
            className="w-full px-4 py-2 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold transition-colors"
          >
            <option value="todas">Todas</option>
            <option value="hoy">Hoy</option>
            <option value="futuras">Futuras</option>
            <option value="pasadas">Pasadas</option>
          </select>
        </div>
      </div>

      {/* Tabla de Citas */}
      {citasFiltradas.length === 0 ? (
        <div className="bg-white/[0.02] border border-white/10 p-12 text-center rounded-2xl backdrop-blur-xl">
          <p className="text-white/50 text-lg">No tienes citas que coincidan con los filtros</p>
        </div>
      ) : (
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white/5">
                <tr>
                  <th className="p-4 text-xs font-bold text-white/70 uppercase tracking-wider border-b border-white/10">Cliente</th>
                  <th className="p-4 text-xs font-bold text-white/70 uppercase tracking-wider border-b border-white/10">Contacto</th>
                  <th className="p-4 text-xs font-bold text-white/70 uppercase tracking-wider border-b border-white/10">Fecha & Hora</th>
                  <th className="p-4 text-xs font-bold text-white/70 uppercase tracking-wider border-b border-white/10">Servicio</th>
                  <th className="p-4 text-xs font-bold text-white/70 uppercase tracking-wider border-b border-white/10">Estado</th>
                  <th className="p-4 text-xs font-bold text-white/70 uppercase tracking-wider border-b border-white/10 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {citasFiltradas.map((cita) => (
                  <tr key={cita.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white">{cita.cliente_nombre}</div>
                      {cita.notas && (
                        <div className="text-xs text-white/50 mt-1">
                          📝 {cita.notas.substring(0, 50)}{cita.notas.length > 50 ? '...' : ''}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-white/80">{cita.cliente_email}</div>
                      <div className="text-xs text-white/50 mt-1">{cita.cliente_telefono}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-white/80">{formatFechaChile(cita.fecha)}</div>
                      <div className="text-xs text-gold mt-1 font-bold">{cita.hora}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-white/80">{cita.servicios?.nombre || 'N/A'}</div>
                      <div className="text-xs text-gold mt-1 font-bold">${cita.servicios?.precio || 0}</div>
                    </td>
                    <td className="p-4">
                      <select
                        value={cita.estado}
                        onChange={(e) => handleUpdateEstado(cita.id, e.target.value)}
                        className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg border cursor-pointer outline-none transition-colors ${
                          cita.estado === 'confirmada' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                          cita.estado === 'pendiente' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                          cita.estado === 'completada' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                          'bg-red-500/20 text-red-400 border-red-500/30'
                        }`}
                      >
                        <option value="pendiente" className="bg-[#0a0a0a] text-white">Pendiente</option>
                        <option value="confirmada" className="bg-[#0a0a0a] text-white">Confirmada</option>
                        <option value="completada" className="bg-[#0a0a0a] text-white">Completada</option>
                        <option value="cancelada" className="bg-[#0a0a0a] text-white">Cancelada</option>
                      </select>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2 relative">
                        <button
                          onClick={() => handleOpenNotas(cita)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors relative ${
                            notasClientes[cita.cliente_email || '']
                              ? 'bg-gold/20 border border-gold/30 text-gold hover:bg-gold/30'
                              : 'bg-white/[0.03] border border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
                          }`}
                          title={notasClientes[cita.cliente_email || ''] ? `Ver ${notasClientes[cita.cliente_email || '']} nota(s)` : 'Agregar nota'}
                        >
                          <i className="fas fa-sticky-note text-sm"></i>
                          {notasClientes[cita.cliente_email || ''] > 0 && (
                            <span className="absolute -top-2 -right-2 w-5 h-5 bg-gold rounded-full text-[#080808] text-[10px] font-black flex items-center justify-center border-2 border-[#080808]">
                              {notasClientes[cita.cliente_email || '']}
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteCita(cita.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
                          title="Eliminar cita del historial"
                        >
                          <i className="fas fa-trash text-sm"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resumen */}
      <div className="mt-4 text-center text-sm text-white/50">
        Mostrando {citasFiltradas.length} de {citas.length} citas
      </div>

      {/* Modal de Notas */}
      {clienteSeleccionado && (
        <NotasClienteModal
          isOpen={modalNotasOpen}
          onClose={handleCloseNotas}
          barberoId={barberoId}
          clienteEmail={clienteSeleccionado.email}
          clienteNombre={clienteSeleccionado.nombre}
          clienteTelefono={clienteSeleccionado.telefono}
          citaId={clienteSeleccionado.citaId}
          onNotaSaved={handleNotaSaved}
        />
      )}
    </div>
  )
}
