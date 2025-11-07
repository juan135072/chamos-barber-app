import React, { useState, useEffect } from 'react'
import { chamosSupabase } from '../../../../lib/supabase-helpers'
import type { Database } from '../../../../lib/database.types'
import Modal from '../shared/Modal'
import ConfirmDialog from '../shared/ConfirmDialog'
import BarberoModal from '../modals/BarberoModal'
import PermanentDeleteModal from '../modals/PermanentDeleteModal'
import toast from 'react-hot-toast'

type Barbero = Database['public']['Tables']['barberos']['Row']

const BarberosTab: React.FC = () => {
  const [barberos, setBarberos] = useState<Barbero[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBarbero, setSelectedBarbero] = useState<Barbero | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showPermanentDeleteModal, setShowPermanentDeleteModal] = useState(false)
  const [barberoToDelete, setBarberoToDelete] = useState<Barbero | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadBarberos()
  }, [])

  const loadBarberos = async () => {
    try {
      setLoading(true)
      // Obtener TODOS los barberos (activos e inactivos) para el panel admin
      // No pasar parámetro para obtener todos sin filtrar
      const data = await chamosSupabase.getBarberos()
      console.log('📊 Barberos cargados:', data?.length, 'barberos')
      setBarberos(data || [])
    } catch (error) {
      console.error('Error loading barberos:', error)
      toast.error('Error al cargar barberos')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setSelectedBarbero(null)
    setShowModal(true)
  }

  const handleEdit = (barbero: Barbero) => {
    setSelectedBarbero(barbero)
    setShowModal(true)
  }

  const handleDelete = (barbero: Barbero) => {
    setBarberoToDelete(barbero)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!barberoToDelete) return

    console.log('🎯 FRONTEND: Desactivando barbero:', {
      id: barberoToDelete.id,
      nombre: barberoToDelete.nombre,
      apellido: barberoToDelete.apellido
    })

    try {
      setDeleting(true)
      const result = await chamosSupabase.deleteBarbero(barberoToDelete.id)
      console.log('✅ FRONTEND: Resultado de desactivación:', result)
      toast.success('Barbero desactivado exitosamente')
      loadBarberos()
      setShowDeleteDialog(false)
      setBarberoToDelete(null)
    } catch (error: any) {
      console.error('❌ FRONTEND: Error deleting barbero:', error)
      toast.error(error.message || 'Error al desactivar barbero')
    } finally {
      setDeleting(false)
    }
  }

  const handlePermanentDelete = (barbero: Barbero) => {
    setBarberoToDelete(barbero)
    setShowPermanentDeleteModal(true)
  }

  const confirmPermanentDelete = async () => {
    if (!barberoToDelete) return

    console.log('🎯 FRONTEND: Eliminando barbero:', {
      id: barberoToDelete.id,
      nombre: barberoToDelete.nombre,
      apellido: barberoToDelete.apellido
    })

    try {
      setDeleting(true)
      const result = await chamosSupabase.permanentlyDeleteBarbero(barberoToDelete.id)
      console.log('✅ FRONTEND: Resultado de eliminación:', result)
      toast.success('Barbero eliminado permanentemente')
      loadBarberos()
      setShowPermanentDeleteModal(false)
      setBarberoToDelete(null)
    } catch (error: any) {
      console.error('❌ FRONTEND: Error permanently deleting barbero:', error)
      toast.error(error.message || 'Error al eliminar permanentemente el barbero')
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleActive = async (barbero: Barbero) => {
    console.log('🎯 FRONTEND: Toggle active barbero:', {
      id: barbero.id,
      nombre: barbero.nombre,
      apellido: barbero.apellido,
      activoActual: barbero.activo,
      nuevoActivo: !barbero.activo
    })

    try {
      const result = await chamosSupabase.updateBarbero(barbero.id, {
        activo: !barbero.activo
      })
      console.log('✅ FRONTEND: Resultado toggle:', result)
      toast.success(`Barbero ${!barbero.activo ? 'activado' : 'desactivado'}`)
      loadBarberos()
    } catch (error) {
      console.error('❌ FRONTEND: Error toggling barbero:', error)
      toast.error('Error al actualizar barbero')
    }
  }

  const handleModalSuccess = () => {
    setShowModal(false)
    loadBarberos()
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--accent-color)' }}>Gestión de Barberos</h2>
        <button
          onClick={handleCreate}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md"
          style={{ 
            backgroundColor: 'var(--accent-color)', 
            color: 'var(--bg-primary)',
            transition: 'var(--transition)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#B8941F'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-color)'}
        >
          <i className="fas fa-plus mr-2"></i>
          Nuevo Barbero
        </button>
      </div>

      <div className="shadow rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <table className="min-w-full" style={{ borderTop: '1px solid var(--border-color)' }}>
          <thead style={{ backgroundColor: 'var(--bg-primary)' }}>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                Barbero
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                Especialidad
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                Contacto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                Experiencia
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                Estado
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {barberos.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                  No hay barberos registrados
                </td>
              </tr>
            ) : (
              barberos.map((barbero, index) => (
                <tr 
                  key={barbero.id}
                  style={{ 
                    borderTop: index > 0 ? '1px solid var(--border-color)' : 'none',
                    transition: 'var(--transition)',
                    opacity: barbero.activo ? 1 : 0.6,
                    backgroundColor: barbero.activo ? 'transparent' : 'rgba(255, 0, 0, 0.02)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.05)'}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = barbero.activo ? 'transparent' : 'rgba(255, 0, 0, 0.02)'
                  }}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <img
                          className="h-10 w-10 rounded-full object-cover"
                          style={{ border: '2px solid var(--border-color)' }}
                          src={barbero.imagen_url || 'https://via.placeholder.com/40'}
                          alt={`${barbero.nombre} ${barbero.apellido}`}
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {barbero.nombre} {barbero.apellido}
                        </div>
                        {barbero.instagram && (
                          <div className="text-sm" style={{ color: 'var(--accent-color)', opacity: 0.8 }}>
                            <i className="fab fa-instagram mr-1"></i>
                            {barbero.instagram}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{barbero.especialidad}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{barbero.telefono || 'N/A'}</div>
                    <div className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>{barbero.email || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{barbero.experiencia_anos} años</div>
                    <div className="flex items-center">
                      <i className="fas fa-star text-yellow-400 text-xs mr-1"></i>
                      <span className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>{barbero.calificacion.toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(barbero)}
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full transition-all ${
                        barbero.activo
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                      title={barbero.activo ? 'Click para desactivar' : 'Click para reactivar'}
                    >
                      <i className={`fas ${barbero.activo ? 'fa-check-circle' : 'fa-times-circle'} mr-1`}></i>
                      {barbero.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(barbero)}
                        style={{ color: 'var(--accent-color)', transition: 'var(--transition)' }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                        title="Editar"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      
                      {/* Dropdown Menu for Delete Options */}
                      <div className="relative group">
                        <button
                          className="text-red-400 px-2 py-1 rounded"
                          style={{ transition: 'var(--transition)' }}
                          title="Opciones de Eliminación"
                        >
                          <i className="fas fa-trash"></i>
                          <i className="fas fa-caret-down ml-1 text-xs"></i>
                        </button>
                        
                        {/* Dropdown Menu */}
                        <div 
                          className="absolute right-0 mt-1 w-56 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50"
                          style={{ 
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)'
                          }}
                        >
                          <div className="py-1">
                            <button
                              onClick={() => handleDelete(barbero)}
                              className="w-full text-left px-4 py-2 text-sm flex items-start"
                              style={{ 
                                color: 'var(--text-primary)',
                                transition: 'var(--transition)'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.1)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <i className="fas fa-toggle-off mr-2 mt-0.5" style={{ color: 'var(--accent-color)' }}></i>
                              <div>
                                <div className="font-medium">Desactivar</div>
                                <div className="text-xs opacity-70">Marcar como inactivo (recomendado)</div>
                              </div>
                            </button>
                            
                            <div className="border-t" style={{ borderColor: 'var(--border-color)' }}></div>
                            
                            <button
                              onClick={() => handlePermanentDelete(barbero)}
                              className="w-full text-left px-4 py-2 text-sm flex items-start text-red-400"
                              style={{ transition: 'var(--transition)' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.1)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <i className="fas fa-exclamation-triangle mr-2 mt-0.5"></i>
                              <div>
                                <div className="font-medium">Eliminar Permanentemente</div>
                                <div className="text-xs opacity-70">No se puede deshacer</div>
                              </div>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal para crear/editar */}
      {showModal && (
        <BarberoModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSuccess={handleModalSuccess}
          barbero={selectedBarbero}
        />
      )}

      {/* Diálogo de confirmación para desactivar */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        title="Desactivar Barbero"
        message={`¿Estás seguro de desactivar a ${barberoToDelete?.nombre} ${barberoToDelete?.apellido}? El barbero dejará de aparecer como disponible pero sus datos se preservarán. Puedes reactivarlo en cualquier momento.`}
        confirmText="Desactivar"
        type="danger"
        loading={deleting}
      />

      {/* Modal educativo para eliminación permanente */}
      <PermanentDeleteModal
        isOpen={showPermanentDeleteModal}
        onClose={() => setShowPermanentDeleteModal(false)}
        onConfirm={confirmPermanentDelete}
        barberoNombre={`${barberoToDelete?.nombre} ${barberoToDelete?.apellido}`}
        loading={deleting}
      />
    </div>
  )
}

export default BarberosTab
