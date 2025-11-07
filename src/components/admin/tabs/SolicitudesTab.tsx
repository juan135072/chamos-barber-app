import { useState, useEffect } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import type { Database } from '../../../../lib/database.types'
import toast from 'react-hot-toast'

type Solicitud = Database['public']['Tables']['solicitudes_barberos']['Row']

interface ModalAprobacion {
  isOpen: boolean
  solicitud: Solicitud | null
  loading: boolean
  success: boolean
  password: string
}

export default function SolicitudesTab() {
  const supabase = useSupabaseClient<Database>()
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState<string>('pendiente')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSolicitud, setSelectedSolicitud] = useState<Solicitud | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [adminUserId, setAdminUserId] = useState<string | null>(null)
  const [modalAprobacion, setModalAprobacion] = useState<ModalAprobacion>({
    isOpen: false,
    solicitud: null,
    loading: false,
    success: false,
    password: ''
  })

  useEffect(() => {
    loadAdminUser()
    loadSolicitudes()
  }, [])

  const loadAdminUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setAdminUserId(user.id)
      }
    } catch (error) {
      console.error('Error loading admin user:', error)
    }
  }

  const loadSolicitudes = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('solicitudes_barberos')
        .select('*')
        .order('fecha_solicitud', { ascending: false })

      if (error) throw error
      setSolicitudes(data || [])
    } catch (error) {
      console.error('Error loading solicitudes:', error)
      toast.error('Error al cargar solicitudes')
    } finally {
      setLoading(false)
    }
  }

  const handleVerDetalles = (solicitud: Solicitud) => {
    setSelectedSolicitud(solicitud)
    setShowDetailModal(true)
  }

  const handleIniciarAprobacion = (solicitud: Solicitud) => {
    setModalAprobacion({
      isOpen: true,
      solicitud,
      loading: false,
      success: false,
      password: ''
    })
  }

  const handleAprobar = async () => {
    if (!modalAprobacion.solicitud) return
    if (!adminUserId) {
      toast.error('No se pudo obtener el ID del administrador')
      return
    }

    setModalAprobacion(prev => ({ ...prev, loading: true }))

    try {
      const response = await fetch('/api/solicitudes/aprobar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solicitudId: modalAprobacion.solicitud.id,
          adminId: adminUserId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al aprobar solicitud')
      }

      setModalAprobacion(prev => ({
        ...prev,
        loading: false,
        success: true,
        password: data.password
      }))

      toast.success('Barbero aprobado exitosamente')
      
      // Recargar solicitudes después de 3 segundos
      setTimeout(() => {
        loadSolicitudes()
      }, 3000)

    } catch (error: any) {
      console.error('Error aprobando solicitud:', error)
      toast.error(error.message || 'Error al aprobar solicitud')
      setModalAprobacion(prev => ({ ...prev, loading: false }))
    }
  }

  const handleRechazar = async (solicitudId: string) => {
    if (!confirm('¿Estás seguro de rechazar esta solicitud?')) return

    try {
      const { error } = await supabase
        .from('solicitudes_barberos')
        .update({
          estado: 'rechazada',
          fecha_revision: new Date().toISOString()
        })
        .eq('id', solicitudId)

      if (error) throw error

      toast.success('Solicitud rechazada')
      loadSolicitudes()
    } catch (error) {
      console.error('Error rechazando solicitud:', error)
      toast.error('Error al rechazar solicitud')
    }
  }

  const cerrarModalAprobacion = () => {
    setModalAprobacion({
      isOpen: false,
      solicitud: null,
      loading: false,
      success: false,
      password: ''
    })
  }

  // Filtrar solicitudes
  const solicitudesFiltradas = solicitudes.filter(solicitud => {
    // Filtro por estado
    if (filtroEstado !== 'todas' && solicitud.estado !== filtroEstado) return false

    // Búsqueda por nombre o email
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const nombreCompleto = `${solicitud.nombre} ${solicitud.apellido}`.toLowerCase()
      const email = solicitud.email.toLowerCase()
      
      return nombreCompleto.includes(searchLower) || email.includes(searchLower)
    }

    return true
  })

  // Estadísticas
  const stats = {
    total: solicitudes.length,
    pendientes: solicitudes.filter(s => s.estado === 'pendiente').length,
    aprobadas: solicitudes.filter(s => s.estado === 'aprobada').length,
    rechazadas: solicitudes.filter(s => s.estado === 'rechazada').length,
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
        <h2 className="text-2xl font-bold" style={{ color: 'var(--accent-color)' }}>Solicitudes de Barberos</h2>
        <button
          onClick={loadSolicitudes}
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

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }} className="p-4 rounded-lg shadow">
          <div className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Total</div>
          <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.total}</div>
        </div>
        <div style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)' }} className="p-4 rounded-lg shadow">
          <div className="text-sm text-yellow-500">Pendientes</div>
          <div className="text-2xl font-bold text-yellow-400">{stats.pendientes}</div>
        </div>
        <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }} className="p-4 rounded-lg shadow">
          <div className="text-sm text-green-500">Aprobadas</div>
          <div className="text-2xl font-bold text-green-400">{stats.aprobadas}</div>
        </div>
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }} className="p-4 rounded-lg shadow">
          <div className="text-sm text-red-500">Rechazadas</div>
          <div className="text-2xl font-bold text-red-400">{stats.rechazadas}</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }} className="p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)', opacity: 0.9 }}>
              Buscar
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nombre o email..."
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
              <option value="aprobada">Aprobadas</option>
              <option value="rechazada">Rechazadas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de Solicitudes */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }} className="shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead style={{ background: 'var(--bg-tertiary)' }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                  Barbero
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                  Contacto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                  Especialidad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                  Experiencia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody style={{ background: 'var(--bg-secondary)' }}>
              {solicitudesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center" style={{ color: 'var(--text-primary)', opacity: 0.7, borderTop: '1px solid var(--border-color)' }}>
                    No se encontraron solicitudes
                  </td>
                </tr>
              ) : (
                solicitudesFiltradas.map((solicitud) => (
                  <tr key={solicitud.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {solicitud.nombre} {solicitud.apellido}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{solicitud.email}</div>
                      <div className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>{solicitud.telefono}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{solicitud.especialidad}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--text-primary)' }}>
                      {solicitud.experiencia_anos} años
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                      {new Date(solicitud.fecha_solicitud).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        solicitud.estado === 'aprobada' ? 'bg-green-100 text-green-800' :
                        solicitud.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                        solicitud.estado === 'rechazada' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {solicitud.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleVerDetalles(solicitud)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                        title="Ver detalles"
                      >
                        <i className="fas fa-eye"></i>
                      </button>
                      {solicitud.estado === 'pendiente' && (
                        <>
                          <button
                            onClick={() => handleIniciarAprobacion(solicitud)}
                            className="text-green-600 hover:text-green-900 mr-3"
                            title="Aprobar"
                          >
                            <i className="fas fa-check-circle"></i>
                          </button>
                          <button
                            onClick={() => handleRechazar(solicitud.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Rechazar"
                          >
                            <i className="fas fa-times-circle"></i>
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumen */}
      <div className="mt-4 text-sm text-center" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
        Mostrando {solicitudesFiltradas.length} de {solicitudes.length} solicitudes
      </div>

      {/* Modal de Detalles */}
      {showDetailModal && selectedSolicitud && (
        <div className="fixed inset-0 overflow-y-auto h-full w-full z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
          <div className="relative top-20 mx-auto p-5 w-full max-w-2xl shadow-lg rounded-md" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
                  Detalles de la Solicitud
                </h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  style={{ color: 'var(--text-primary)', opacity: 0.6 }}
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)', opacity: 0.9 }}>Nombre</label>
                    <p className="mt-1 text-sm" style={{ color: 'var(--text-primary)' }}>{selectedSolicitud.nombre}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)', opacity: 0.9 }}>Apellido</label>
                    <p className="mt-1 text-sm" style={{ color: 'var(--text-primary)' }}>{selectedSolicitud.apellido}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)', opacity: 0.9 }}>Email</label>
                  <p className="mt-1 text-sm" style={{ color: 'var(--text-primary)' }}>{selectedSolicitud.email}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)', opacity: 0.9 }}>Teléfono</label>
                  <p className="mt-1 text-sm" style={{ color: 'var(--text-primary)' }}>{selectedSolicitud.telefono}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)', opacity: 0.9 }}>Especialidad</label>
                  <p className="mt-1 text-sm" style={{ color: 'var(--text-primary)' }}>{selectedSolicitud.especialidad}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)', opacity: 0.9 }}>Años de Experiencia</label>
                  <p className="mt-1 text-sm" style={{ color: 'var(--text-primary)' }}>{selectedSolicitud.experiencia_anos} años</p>
                </div>

                {selectedSolicitud.descripcion && (
                  <div>
                    <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)', opacity: 0.9 }}>Descripción</label>
                    <p className="mt-1 text-sm" style={{ color: 'var(--text-primary)' }}>{selectedSolicitud.descripcion}</p>
                  </div>
                )}

                {selectedSolicitud.imagen_url && (
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)', opacity: 0.9 }}>Foto</label>
                    <img
                      src={selectedSolicitud.imagen_url}
                      alt={`${selectedSolicitud.nombre} ${selectedSolicitud.apellido}`}
                      className="w-32 h-32 rounded-full object-cover"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)', opacity: 0.9 }}>Estado</label>
                    <span className={`mt-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedSolicitud.estado === 'aprobada' ? 'bg-green-100 text-green-800' :
                      selectedSolicitud.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                      selectedSolicitud.estado === 'rechazada' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedSolicitud.estado}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)', opacity: 0.9 }}>Fecha de Solicitud</label>
                    <p className="mt-1 text-sm" style={{ color: 'var(--text-primary)' }}>
                      {new Date(selectedSolicitud.fecha_solicitud).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                </div>

                {selectedSolicitud.notas_revision && (
                  <div>
                    <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)', opacity: 0.9 }}>Notas de Revisión</label>
                    <p className="mt-1 text-sm" style={{ color: 'var(--text-primary)' }}>{selectedSolicitud.notas_revision}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                {selectedSolicitud.estado === 'pendiente' && (
                  <>
                    <button
                      onClick={() => {
                        setShowDetailModal(false)
                        handleIniciarAprobacion(selectedSolicitud)
                      }}
                      className="px-4 py-2 rounded-md"
                      style={{ backgroundColor: '#22C55E', color: 'white' }}
                    >
                      Aprobar
                    </button>
                    <button
                      onClick={() => {
                        setShowDetailModal(false)
                        handleRechazar(selectedSolicitud.id)
                      }}
                      className="px-4 py-2 rounded-md"
                      style={{ backgroundColor: '#EF4444', color: 'white' }}
                    >
                      Rechazar
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 rounded-md"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Aprobación */}
      {modalAprobacion.isOpen && modalAprobacion.solicitud && (
        <div className="fixed inset-0 overflow-y-auto h-full w-full z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
          <div className="relative top-20 mx-auto p-5 w-full max-w-md shadow-lg rounded-md" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div className="mt-3">
              {!modalAprobacion.success ? (
                <>
                  <div className="flex items-center justify-center w-12 h-12 mx-auto bg-green-100 rounded-full">
                    <i className="fas fa-check text-green-600 text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-center mt-4" style={{ color: 'var(--text-primary)' }}>
                    Aprobar Solicitud
                  </h3>
                  <p className="text-sm text-center mt-2" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                    ¿Estás seguro de aprobar a <strong>{modalAprobacion.solicitud.nombre} {modalAprobacion.solicitud.apellido}</strong>?
                  </p>
                  <p className="text-sm text-center mt-2" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                    Se creará una cuenta de barbero con acceso al sistema.
                  </p>

                  <div className="mt-6 flex space-x-3">
                    <button
                      onClick={cerrarModalAprobacion}
                      disabled={modalAprobacion.loading}
                      className="flex-1 px-4 py-2 rounded-md disabled:opacity-50"
                      style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAprobar}
                      disabled={modalAprobacion.loading}
                      className="flex-1 px-4 py-2 rounded-md disabled:opacity-50 flex items-center justify-center"
                      style={{ backgroundColor: '#22C55E', color: 'white' }}
                    >
                      {modalAprobacion.loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Aprobando...
                        </>
                      ) : (
                        'Confirmar'
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center w-12 h-12 mx-auto bg-green-100 rounded-full">
                    <i className="fas fa-check-circle text-green-600 text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-center mt-4" style={{ color: 'var(--text-primary)' }}>
                    ¡Barbero Aprobado!
                  </h3>
                  <p className="text-sm text-center mt-2" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                    La cuenta ha sido creada exitosamente.
                  </p>

                  <div className="mt-4 p-4 rounded-md" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                    <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                      Credenciales de acceso:
                    </p>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Email:</label>
                        <p className="text-sm font-mono p-2 rounded" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                          {modalAprobacion.solicitud.email}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Contraseña:</label>
                        <p className="text-sm font-mono p-2 rounded" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                          {modalAprobacion.password}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs mt-2" style={{ color: 'var(--text-primary)', opacity: 0.6 }}>
                      ⚠️ Guarda esta contraseña. Debe ser comunicada al barbero de forma segura.
                    </p>
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={cerrarModalAprobacion}
                      className="w-full px-4 py-2 rounded-md"
                      style={{ backgroundColor: '#22C55E', color: 'white' }}
                    >
                      Entendido
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
