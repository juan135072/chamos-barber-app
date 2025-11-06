import React, { useState, useEffect } from 'react'
import { chamosSupabase } from '../../../../lib/supabase-helpers'
import type { Database } from '../../../../lib/database.types'
import Modal from '../shared/Modal'
import ConfirmDialog from '../shared/ConfirmDialog'
import BarberoModal from '../modals/BarberoModal'
import toast from 'react-hot-toast'

type Barbero = Database['public']['Tables']['barberos']['Row']

const BarberosTab: React.FC = () => {
  const [barberos, setBarberos] = useState<Barbero[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBarbero, setSelectedBarbero] = useState<Barbero | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [barberoToDelete, setBarberoToDelete] = useState<Barbero | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadBarberos()
  }, [])

  const loadBarberos = async () => {
    try {
      setLoading(true)
      const data = await chamosSupabase.getBarberos()
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

    try {
      setDeleting(true)
      await chamosSupabase.deleteBarbero(barberoToDelete.id)
      toast.success('Barbero eliminado exitosamente')
      loadBarberos()
      setShowDeleteDialog(false)
      setBarberoToDelete(null)
    } catch (error: any) {
      console.error('Error deleting barbero:', error)
      toast.error(error.message || 'Error al eliminar barbero')
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleActive = async (barbero: Barbero) => {
    try {
      await chamosSupabase.updateBarbero(barbero.id, {
        activo: !barbero.activo
      })
      toast.success(`Barbero ${!barbero.activo ? 'activado' : 'desactivado'}`)
      loadBarberos()
    } catch (error) {
      console.error('Error toggling barbero:', error)
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
                    transition: 'var(--transition)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        barbero.activo
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {barbero.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(barbero)}
                      className="mr-4"
                      style={{ color: 'var(--accent-color)', transition: 'var(--transition)' }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      title="Editar"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button
                      onClick={() => handleDelete(barbero)}
                      className="text-red-400"
                      style={{ transition: 'var(--transition)' }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      title="Eliminar"
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

      {/* Modal para crear/editar */}
      {showModal && (
        <BarberoModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSuccess={handleModalSuccess}
          barbero={selectedBarbero}
        />
      )}

      {/* Diálogo de confirmación para eliminar */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        title="Eliminar Barbero"
        message={`¿Estás seguro de eliminar a ${barberoToDelete?.nombre} ${barberoToDelete?.apellido}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        type="danger"
        loading={deleting}
      />
    </div>
  )
}

export default BarberosTab
