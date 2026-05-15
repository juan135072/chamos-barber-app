import React, { useState } from 'react'
import { chamosSupabase } from '@/lib/supabase-helpers'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import Modal from '../shared/Modal'
import ConfirmDialog from '../shared/ConfirmDialog'
import BarberoModal from '../modals/BarberoModal'
import PermanentDeleteModal from '../modals/PermanentDeleteModal'
import toast from 'react-hot-toast'
import { useBarberos } from '@/hooks/useBarberos'

type Barbero = Database['public']['Tables']['barberos']['Row']

const BarberosTab: React.FC = () => {
  // Sin soloActivos → devuelve todos (activos e inactivos) para gestión admin
  const { barberos, loading, refetch: loadBarberos } = useBarberos()
  const [selectedBarbero, setSelectedBarbero] = useState<Barbero | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showPermanentDeleteModal, setShowPermanentDeleteModal] = useState(false)
  const [barberoToDelete, setBarberoToDelete] = useState<Barbero | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Estados para Reset Password
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false)
  const [barberoToReset, setBarberoToReset] = useState<Barbero | null>(null)
  const [resettingPassword, setResettingPassword] = useState(false)
  const [resetSent, setResetSent] = useState(false)

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

  const handleResetPassword = (barbero: Barbero) => {
    setBarberoToReset(barbero)
    setResetSent(false)
    setShowResetPasswordModal(true)
  }

  const confirmResetPassword = async () => {
    if (!barberoToReset) return

    console.log('🔑 FRONTEND: Reseteando contraseña para barbero:', barberoToReset.id)

    try {
      setResettingPassword(true)
      
      // Obtener el admin user ID actual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('No se pudo obtener el usuario admin')
      }

      const response = await fetch('/api/barberos/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberoId: barberoToReset.id
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error enviando email de reset')
      }

      setResetSent(true)
      toast.success('Email de reseteo enviado al barbero')
    } catch (error: any) {
      console.error('❌ FRONTEND: Error resetting password:', error)
      toast.error(error.message || 'Error al resetear contraseña')
      setShowResetPasswordModal(false)
      setBarberoToReset(null)
    } finally {
      setResettingPassword(false)
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--accent-color)' }}>Gestión de Barberos</h2>
        <button
          onClick={handleCreate}
          className="inline-flex items-center px-3 sm:px-4 py-2 border border-transparent text-sm font-medium rounded-md w-full sm:w-auto justify-center"
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

      <div className="shadow rounded-lg overflow-x-auto" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
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
                    <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{barbero.especialidades?.join(', ') || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{barbero.telefono || 'N/A'}</div>
                    <div className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>{barbero.email || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{barbero.porcentaje_comision}% comisión</div>
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

                      {/* Botón Reset Password */}
                      {barbero.email && (
                        <button
                          onClick={() => handleResetPassword(barbero)}
                          className="text-blue-400 hover:text-blue-300"
                          style={{ transition: 'var(--transition)' }}
                          title="Resetear Contraseña"
                        >
                          <i className="fas fa-key"></i>
                        </button>
                      )}
                      
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

      {/* Modal para Reset Password */}
      {showResetPasswordModal && barberoToReset && (
        <Modal
          isOpen={showResetPasswordModal}
          onClose={() => {
            setShowResetPasswordModal(false)
            setBarberoToReset(null)
            setResetSent(false)
          }}
          title="Resetear Contraseña"
        >
          <div className="space-y-4">
            {!resetSent ? (
              <>
                <p style={{ color: 'var(--text-primary)' }}>
                  ¿Estás seguro de resetear la contraseña de:
                </p>
                <div 
                  className="p-4 rounded-lg"
                  style={{ 
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={barberoToReset.imagen_url || 'https://via.placeholder.com/40'}
                      alt={`${barberoToReset.nombre} ${barberoToReset.apellido}`}
                      className="w-12 h-12 rounded-full object-cover"
                      style={{ border: '2px solid var(--border-color)' }}
                    />
                    <div>
                      <div className="font-bold" style={{ color: 'var(--text-primary)' }}>
                        {barberoToReset.nombre} {barberoToReset.apellido}
                      </div>
                      <div className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                        {barberoToReset.email}
                      </div>
                    </div>
                  </div>
                </div>
                <div 
                  className="p-3 rounded-lg flex items-start space-x-2"
                  style={{ 
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)'
                  }}
                >
                  <i className="fas fa-info-circle text-blue-400 mt-0.5"></i>
                  <div className="text-sm text-blue-400">
                    Se generará una nueva contraseña segura automáticamente.
                    La contraseña actual dejará de funcionar.
                  </div>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <button
                    onClick={() => {
                      setShowResetPasswordModal(false)
                      setBarberoToReset(null)
                    }}
                    className="px-4 py-2 rounded-lg"
                    style={{ 
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)'
                    }}
                    disabled={resettingPassword}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmResetPassword}
                    className="px-4 py-2 rounded-lg text-white"
                    style={{ backgroundColor: '#3b82f6' }}
                    disabled={resettingPassword}
                  >
                    {resettingPassword ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Reseteando...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-key mr-2"></i>
                        Resetear Contraseña
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div
                  className="p-4 rounded-lg text-center"
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)'
                  }}
                >
                  <i className="fas fa-envelope-circle-check text-blue-400 text-4xl mb-3"></i>
                  <h3 className="text-lg font-bold text-blue-400 mb-2">
                    Email enviado
                  </h3>
                  <p className="text-sm text-blue-300">
                    Se envió un email a <strong>{barberoToReset.email}</strong> con instrucciones para crear una nueva contraseña.
                  </p>
                </div>

                <div
                  className="p-3 rounded-lg flex items-start space-x-2"
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                    border: '1px solid rgba(59, 130, 246, 0.2)'
                  }}
                >
                  <i className="fas fa-info-circle text-blue-400 mt-0.5"></i>
                  <div className="text-sm text-blue-300">
                    Si el barbero no recibe el email, revisá la carpeta de spam.
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => {
                      setResetSent(false)
                      setShowResetPasswordModal(false)
                      setBarberoToReset(null)
                    }}
                    className="px-4 py-2 rounded-lg"
                    style={{
                      backgroundColor: 'var(--accent-color)',
                      color: '#000'
                    }}
                  >
                    <i className="fas fa-check mr-2"></i>
                    Entendido
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

export default BarberosTab
