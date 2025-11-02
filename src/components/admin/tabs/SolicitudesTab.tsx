import React, { useState, useEffect } from 'react'
import { chamosSupabase } from '../../../../lib/supabase-helpers'
import type { Database } from '../../../../lib/database.types'

type SolicitudBarbero = Database['public']['Tables']['solicitudes_barberos']['Row']

interface SolicitudesTabProps {
  adminUserId: string
}

// Fix: Null-check added for result.barbero to prevent TypeScript error

const SolicitudesTab: React.FC<SolicitudesTabProps> = ({ adminUserId }) => {
  const [solicitudes, setSolicitudes] = useState<SolicitudBarbero[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSolicitud, setSelectedSolicitud] = useState<SolicitudBarbero | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'aprobar' | 'rechazar' | null>(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [processing, setProcessing] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)
  const [filter, setFilter] = useState<'todas' | 'pendiente' | 'aprobada' | 'rechazada'>('pendiente')

  useEffect(() => {
    loadSolicitudes()
  }, [filter])

  const loadSolicitudes = async () => {
    try {
      setLoading(true)
      const filters = filter === 'todas' ? {} : { estado: filter }
      const data = await chamosSupabase.getSolicitudesBarberos(filters)
      setSolicitudes(data as SolicitudBarbero[])
    } catch (error) {
      console.error('Error loading solicitudes:', error)
      alert('Error al cargar las solicitudes')
    } finally {
      setLoading(false)
    }
  }

  const handleAprobar = (solicitud: SolicitudBarbero) => {
    setSelectedSolicitud(solicitud)
    setModalMode('aprobar')
    setShowModal(true)
  }

  const handleRechazar = (solicitud: SolicitudBarbero) => {
    setSelectedSolicitud(solicitud)
    setModalMode('rechazar')
    setShowModal(true)
  }

  const confirmAprobar = async () => {
    if (!selectedSolicitud) return

    setProcessing(true)
    try {
      const result = await chamosSupabase.aprobarSolicitudBarbero(
        selectedSolicitud.id,
        adminUserId,
        {
          nombre: selectedSolicitud.nombre,
          apellido: selectedSolicitud.apellido,
          email: selectedSolicitud.email,
          telefono: selectedSolicitud.telefono,
          especialidad: selectedSolicitud.especialidades || 'Cortes generales',
          descripcion: selectedSolicitud.biografia || undefined,
          experiencia_anos: selectedSolicitud.anos_experiencia,
          imagen_url: selectedSolicitud.foto_perfil_url || undefined
        }
      )

      // Validar que el barbero fue creado correctamente
      if (!result.barbero) {
        throw new Error('Error al crear el barbero en la base de datos')
      }

      setGeneratedPassword(result.password)
      alert(
        `✅ Solicitud aprobada!\n\n` +
        `Barbero creado: ${result.barbero.nombre} ${result.barbero.apellido}\n` +
        `Email: ${result.barbero.email}\n` +
        `Contraseña: ${result.password}\n\n` +
        `⚠️ IMPORTANTE: Guarda esta contraseña y envíasela al barbero. No se podrá recuperar después.`
      )
      
      setShowModal(false)
      setSelectedSolicitud(null)
      loadSolicitudes()
    } catch (error) {
      console.error('Error aprobando solicitud:', error)
      if (error instanceof Error) {
        alert(`Error: ${error.message}`)
      } else {
        alert('Error al aprobar la solicitud')
      }
    } finally {
      setProcessing(false)
    }
  }

  const confirmRechazar = async () => {
    if (!selectedSolicitud || !motivoRechazo.trim()) {
      alert('Debes proporcionar un motivo de rechazo')
      return
    }

    setProcessing(true)
    try {
      await chamosSupabase.rechazarSolicitudBarbero(
        selectedSolicitud.id,
        adminUserId,
        motivoRechazo
      )

      alert('Solicitud rechazada correctamente')
      setShowModal(false)
      setSelectedSolicitud(null)
      setMotivoRechazo('')
      loadSolicitudes()
    } catch (error) {
      console.error('Error rechazando solicitud:', error)
      alert('Error al rechazar la solicitud')
    } finally {
      setProcessing(false)
    }
  }

  const getEstadoBadge = (estado: string) => {
    const badges = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      aprobada: 'bg-green-100 text-green-800',
      rechazada: 'bg-red-100 text-red-800'
    }
    return badges[estado as keyof typeof badges] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Header con filtros */}
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Solicitudes de Barberos</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('todas')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'todas' 
                ? 'bg-yellow-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilter('pendiente')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'pendiente' 
                ? 'bg-yellow-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Pendientes
          </button>
          <button
            onClick={() => setFilter('aprobada')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'aprobada' 
                ? 'bg-yellow-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Aprobadas
          </button>
          <button
            onClick={() => setFilter('rechazada')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'rechazada' 
                ? 'bg-yellow-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Rechazadas
          </button>
        </div>
      </div>

      {/* Lista de solicitudes */}
      {solicitudes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 text-lg">No hay solicitudes {filter !== 'todas' ? filter + 's' : ''}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {solicitudes.map((solicitud) => (
            <div key={solicitud.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">
                      {solicitud.nombre} {solicitud.apellido}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getEstadoBadge(solicitud.estado)}`}>
                      {solicitud.estado.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">
                        <strong>Email:</strong> {solicitud.email}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Teléfono:</strong> {solicitud.telefono}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Experiencia:</strong> {solicitud.anos_experiencia} años
                      </p>
                    </div>
                    <div>
                      {solicitud.especialidades && (
                        <p className="text-sm text-gray-600">
                          <strong>Especialidades:</strong> {solicitud.especialidades}
                        </p>
                      )}
                      <p className="text-sm text-gray-600">
                        <strong>Fecha:</strong> {new Date(solicitud.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {solicitud.biografia && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-700">
                        <strong>Biografía:</strong><br />
                        {solicitud.biografia}
                      </p>
                    </div>
                  )}

                  {solicitud.motivo_rechazo && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-red-800">
                        <strong>Motivo de rechazo:</strong> {solicitud.motivo_rechazo}
                      </p>
                    </div>
                  )}
                </div>

                {solicitud.estado === 'pendiente' && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleAprobar(solicitud)}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      ✓ Aprobar
                    </button>
                    <button
                      onClick={() => handleRechazar(solicitud)}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      ✗ Rechazar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de confirmación */}
      {showModal && selectedSolicitud && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              {modalMode === 'aprobar' ? '✓ Aprobar Solicitud' : '✗ Rechazar Solicitud'}
            </h3>

            {modalMode === 'aprobar' ? (
              <div>
                <p className="text-gray-700 mb-4">
                  Estás a punto de aprobar la solicitud de:
                </p>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p><strong>Nombre:</strong> {selectedSolicitud.nombre} {selectedSolicitud.apellido}</p>
                  <p><strong>Email:</strong> {selectedSolicitud.email}</p>
                  <p><strong>Experiencia:</strong> {selectedSolicitud.anos_experiencia} años</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-yellow-800">
                    <strong>⚠️ Importante:</strong> Se creará un barbero en el sistema y se generará una contraseña automática. 
                    Asegúrate de guardarla y enviársela al nuevo barbero.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-gray-700 mb-4">
                  Proporciona un motivo de rechazo:
                </p>
                <textarea
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Ej: No cumples con los requisitos mínimos de experiencia..."
                />
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false)
                  setSelectedSolicitud(null)
                  setMotivoRechazo('')
                }}
                disabled={processing}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={modalMode === 'aprobar' ? confirmAprobar : confirmRechazar}
                disabled={processing || (modalMode === 'rechazar' && !motivoRechazo.trim())}
                className={`flex-1 font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 ${
                  modalMode === 'aprobar'
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                {processing ? 'Procesando...' : (modalMode === 'aprobar' ? 'Aprobar' : 'Rechazar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SolicitudesTab
