import { useState, useEffect } from 'react'
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react'
import type { Database } from '../../../lib/database.types'
import { formatFechaChile } from '../../lib/date-utils'
import NotasClienteModal from './NotasClienteModal'

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
      data?.forEach(nota => {
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
      alert('Estado actualizado correctamente')
    } catch (error) {
      console.error('Error updating estado:', error)
      alert('Error al actualizar el estado')
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '48px 0' }}>
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div style={{ marginTop: '40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--accent-color)' }}>Mis Citas</h2>
        <button
          onClick={loadCitas}
          style={{
            padding: '10px 16px',
            backgroundColor: 'var(--accent-color)',
            color: 'var(--bg-primary)',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fas fa-sync-alt"></i>
          Actualizar
        </button>
      </div>

      {/* Estadísticas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{
          background: 'var(--bg-secondary)',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ fontSize: '14px', color: 'var(--text-primary)', opacity: 0.7 }}>Total</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{stats.total}</div>
        </div>
        <div style={{
          background: 'var(--bg-secondary)',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)'
        }}>
          <div style={{ fontSize: '14px', color: '#60A5FA' }}>Hoy</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#93C5FD' }}>{stats.hoy}</div>
        </div>
        <div style={{
          background: 'var(--bg-secondary)',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid rgba(234, 179, 8, 0.3)',
          backgroundColor: 'rgba(234, 179, 8, 0.1)'
        }}>
          <div style={{ fontSize: '14px', color: '#FACC15' }}>Pendientes</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FDE047' }}>{stats.pendientes}</div>
        </div>
        <div style={{
          background: 'var(--bg-secondary)',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)'
        }}>
          <div style={{ fontSize: '14px', color: '#4ADE80' }}>Confirmadas</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#86EFAC' }}>{stats.confirmadas}</div>
        </div>
        <div style={{
          background: 'var(--bg-secondary)',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)'
        }}>
          <div style={{ fontSize: '14px', color: '#60A5FA' }}>Completadas</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#93C5FD' }}>{stats.completadas}</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{
        background: 'var(--bg-secondary)',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '24px',
        border: '1px solid var(--border-color)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px'
      }}>
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '8px',
            color: 'var(--text-primary)',
            opacity: 0.9
          }}>
            Buscar
          </label>
          <input
            type="text"
            placeholder="Nombre, email o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)'
            }}
          />
        </div>
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '8px',
            color: 'var(--text-primary)',
            opacity: 0.9
          }}>
            Estado
          </label>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-primary)',
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
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '8px',
            color: 'var(--text-primary)',
            opacity: 0.9
          }}>
            Fecha
          </label>
          <select
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-primary)',
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

      {/* Tabla de Citas */}
      {citasFiltradas.length === 0 ? (
        <div style={{
          background: 'var(--bg-secondary)',
          padding: '48px',
          textAlign: 'center',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          color: 'var(--text-primary)',
          opacity: 0.7
        }}>
          <p>No tienes citas que coincidan con los filtros</p>
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-secondary)',
          borderRadius: '8px',
          overflow: 'auto',
          border: '1px solid var(--border-color)'
        }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead style={{ background: 'var(--bg-tertiary)' }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-primary)', opacity: 0.7, fontSize: '14px', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>
                  Cliente
                </th>
                <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-primary)', opacity: 0.7, fontSize: '14px', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>
                  Contacto
                </th>
                <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-primary)', opacity: 0.7, fontSize: '14px', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>
                  Fecha & Hora
                </th>
                <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-primary)', opacity: 0.7, fontSize: '14px', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>
                  Servicio
                </th>
                <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-primary)', opacity: 0.7, fontSize: '14px', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>
                  Estado
                </th>
                <th style={{ padding: '12px', textAlign: 'center', color: 'var(--text-primary)', opacity: 0.7, fontSize: '14px', fontWeight: '600', borderBottom: '1px solid var(--border-color)' }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {citasFiltradas.map((cita, index) => (
                <tr
                  key={cita.id}
                  style={{
                    borderBottom: index < citasFiltradas.length - 1 ? '1px solid var(--border-color)' : 'none',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '12px' }}>
                    <div style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{cita.cliente_nombre}</div>
                    {cita.notas && (
                      <div style={{
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                        opacity: 0.6,
                        marginTop: '4px'
                      }}>
                        📝 {cita.notas.substring(0, 50)}{cita.notas.length > 50 ? '...' : ''}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontSize: '14px', color: 'var(--text-primary)', opacity: 0.8 }}>
                      {cita.cliente_email}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)', opacity: 0.6, marginTop: '2px' }}>
                      {cita.cliente_telefono}
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontSize: '14px', color: 'var(--text-primary)', opacity: 0.8 }}>
                      {formatFechaChile(cita.fecha)}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)', opacity: 0.6, marginTop: '2px' }}>
                      {cita.hora}
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontSize: '14px', color: 'var(--text-primary)', opacity: 0.8 }}>
                      {cita.servicios?.nombre || 'N/A'}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--accent-color)', marginTop: '2px' }}>
                      ${cita.servicios?.precio || 0}
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <select
                      value={cita.estado}
                      onChange={(e) => handleUpdateEstado(cita.id, e.target.value)}
                      style={{
                        padding: '6px 10px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontWeight: '500',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="confirmada">Confirmada</option>
                      <option value="completada">Completada</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleOpenNotas(cita)}
                        style={{
                          padding: '8px 12px',
                          background: notasClientes[cita.cliente_email || '']
                            ? 'rgba(212, 175, 55, 0.2)'
                            : 'var(--bg-primary)',
                          border: notasClientes[cita.cliente_email || '']
                            ? '1px solid rgba(212, 175, 55, 0.4)'
                            : '1px solid var(--border-color)',
                          borderRadius: '4px',
                          color: notasClientes[cita.cliente_email || '']
                            ? 'var(--accent-color)'
                            : 'var(--text-primary)',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '500'
                        }}
                        title={notasClientes[cita.cliente_email || '']
                          ? `Ver ${notasClientes[cita.cliente_email || '']} nota(s)`
                          : 'Agregar nota'}
                      >
                        <i className="fas fa-sticky-note"></i>
                        {notasClientes[cita.cliente_email || ''] > 0 && (
                          <span style={{ marginLeft: '4px' }}>{notasClientes[cita.cliente_email || '']}</span>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteCita(cita.id)}
                        style={{
                          padding: '8px 12px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '4px',
                          color: '#EF4444',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                        title="Eliminar cita del historial"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Resumen */}
      <div style={{
        marginTop: '16px',
        textAlign: 'center',
        fontSize: '14px',
        color: 'var(--text-primary)',
        opacity: 0.7
      }}>
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
