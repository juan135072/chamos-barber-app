import { useState, useEffect } from 'react'
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react'
import type { Database } from '../../../lib/database.types'
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
      const { error} = await supabase
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

  // Filtrar citas
  const citasFiltradas = citas.filter(cita => {
    if (filtroEstado !== 'todas' && cita.estado !== filtroEstado) return false
    return true
  })

  // Estadísticas
  const stats = {
    total: citas.length,
    pendientes: citas.filter(c => c.estado === 'pendiente').length,
    confirmadas: citas.filter(c => c.estado === 'confirmada').length,
    hoy: citas.filter(c => c.fecha === new Date().toISOString().split('T')[0]).length,
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
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px', color: 'var(--accent-color)' }}>Mis Citas</h2>

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
      </div>

      {/* Filtro */}
      <div style={{ 
        background: 'var(--bg-secondary)', 
        padding: '16px', 
        borderRadius: '8px', 
        marginBottom: '24px', 
        border: '1px solid var(--border-color)' 
      }}>
        <label style={{ 
          display: 'block', 
          fontSize: '14px', 
          fontWeight: '500', 
          marginBottom: '8px',
          color: 'var(--text-primary)',
          opacity: 0.9
        }}>
          Filtrar por Estado
        </label>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          style={{ 
            width: '100%', 
            maxWidth: '300px', 
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

      {/* Lista de Citas */}
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
          <p>No tienes citas {filtroEstado !== 'todas' ? `en estado "${filtroEstado}"` : ''}</p>
        </div>
      ) : (
        <div style={{ 
          background: 'var(--bg-secondary)', 
          borderRadius: '8px', 
          overflow: 'hidden', 
          border: '1px solid var(--border-color)'
        }}>
          {citasFiltradas.map((cita, index) => (
            <div 
              key={cita.id} 
              style={{ 
                padding: '24px', 
                borderBottom: index < citasFiltradas.length - 1 ? '1px solid var(--border-color)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ flex: '1', minWidth: '250px' }}>
                  <div style={{ 
                    fontSize: '18px', 
                    fontWeight: 'bold', 
                    marginBottom: '8px',
                    color: 'var(--text-primary)'
                  }}>
                    {cita.cliente_nombre}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-primary)', opacity: 0.7, marginBottom: '4px' }}>
                    📧 {cita.cliente_email}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-primary)', opacity: 0.7, marginBottom: '4px' }}>
                    📞 {cita.cliente_telefono}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-primary)', opacity: 0.7, marginTop: '8px' }}>
                    📅 {new Date(cita.fecha).toLocaleDateString('es-ES')} a las {cita.hora}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-primary)', opacity: 0.7 }}>
                    ✂️ {cita.servicios?.nombre || 'N/A'} - ${cita.servicios?.precio || 0}
                  </div>
                  {cita.notas && (
                    <div style={{ 
                      fontSize: '13px', 
                      color: 'var(--text-primary)', 
                      opacity: 0.8,
                      marginTop: '8px', 
                      padding: '8px', 
                      background: 'var(--bg-primary)', 
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px' 
                    }}>
                      📝 <strong>Notas:</strong> {cita.notas}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px' }}>
                  <button
                    onClick={() => handleOpenNotas(cita)}
                    style={{
                      padding: '10px 16px',
                      background: notasClientes[cita.cliente_email || ''] 
                        ? 'rgba(212, 175, 55, 0.2)' 
                        : 'var(--bg-primary)',
                      border: notasClientes[cita.cliente_email || '']
                        ? '1px solid rgba(212, 175, 55, 0.4)'
                        : '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: notasClientes[cita.cliente_email || ''] 
                        ? 'var(--accent-color)' 
                        : 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)'
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                    title={notasClientes[cita.cliente_email || ''] 
                      ? `Ver ${notasClientes[cita.cliente_email || '']} nota(s)` 
                      : 'Agregar nota'}
                  >
                    <i className="fas fa-sticky-note"></i>
                    <span>
                      {notasClientes[cita.cliente_email || ''] 
                        ? `${notasClientes[cita.cliente_email || '']} Notas` 
                        : 'Agregar Nota'}
                    </span>
                  </button>
                  <select
                    value={cita.estado}
                    onChange={(e) => handleUpdateEstado(cita.id, e.target.value)}
                    style={{ 
                      padding: '8px 12px', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="confirmada">Confirmada</option>
                    <option value="completada">Completada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
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
