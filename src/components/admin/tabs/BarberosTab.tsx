import React, { useEffect, useState } from 'react'
import { chamosSupabase } from '@/lib/supabase-helpers'
import type { Database } from '@/lib/database.types'
import ConfirmDialog from '../shared/ConfirmDialog'
import BarberoModal, { CredencialesModal } from '../modals/BarberoModal'
import PermanentDeleteModal from '../modals/PermanentDeleteModal'
import toast from 'react-hot-toast'
import { useBarberos } from '@/hooks/useBarberos'

type Barbero = Database['public']['Tables']['barberos']['Row']
type CuentaBarbero = { barbero_id: string; email: string; activo: boolean; rol: string }
type AccionAcceso = 'crear' | 'nueva'

const BarberosTab: React.FC = () => {
  // Sin soloActivos → devuelve todos (activos e inactivos) para gestión admin
  const { barberos, loading, error: loadError, refetch: loadBarberos } = useBarberos()
  const [selectedBarbero, setSelectedBarbero] = useState<Barbero | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showPermanentDeleteModal, setShowPermanentDeleteModal] = useState(false)
  const [barberoToDelete, setBarberoToDelete] = useState<Barbero | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Login accounts by barbero_id; null until loaded.
  const [cuentas, setCuentas] = useState<Record<string, CuentaBarbero> | null>(null)
  const [cuentasError, setCuentasError] = useState<string | null>(null)
  const [cuentasVersion, setCuentasVersion] = useState(0)
  // "Crear acceso" / "Nueva contraseña" waiting for confirmation, and its result (shown once).
  const [accesoPendiente, setAccesoPendiente] = useState<{ barbero: Barbero; accion: AccionAcceso } | null>(null)
  const [generandoAcceso, setGenerandoAcceso] = useState(false)
  const [credenciales, setCredenciales] = useState<{ email: string; password: string; accion: AccionAcceso; emailEnviado: boolean; nombre: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    chamosSupabase.getCuentasBarberos()
      .then((lista) => {
        if (cancelled) return
        // One account per barber; a barber login wins over another role.
        const porBarbero: Record<string, CuentaBarbero> = {}
        for (const cuenta of lista) {
          const actual = porBarbero[cuenta.barbero_id]
          if (!actual || (actual.rol !== 'barbero' && cuenta.rol === 'barbero')) porBarbero[cuenta.barbero_id] = cuenta
        }
        setCuentas(porBarbero)
        setCuentasError(null)
      })
      .catch((error: any) => {
        if (!cancelled) setCuentasError(error?.message || 'No se pudieron cargar las cuentas de acceso')
      })
    return () => { cancelled = true }
  }, [cuentasVersion])

  const reloadCuentas = () => setCuentasVersion((version) => version + 1)

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
      if (result?.partial) {
        // The barber is gone, but its login account (and email) was left behind.
        toast.error(result.message)
      } else {
        toast.success('Barbero eliminado permanentemente')
      }
      loadBarberos()
      reloadCuentas()
      setShowPermanentDeleteModal(false)
      setBarberoToDelete(null)
    } catch (error: any) {
      console.error('❌ FRONTEND: Error permanently deleting barbero:', error)
      toast.error(error.message || 'Error al eliminar permanentemente el barbero')
    } finally {
      setDeleting(false)
    }
  }

  const confirmAcceso = async () => {
    if (!accesoPendiente) return
    const { barbero, accion } = accesoPendiente
    try {
      setGenerandoAcceso(true)
      const result = await chamosSupabase.generarCredencialesBarbero(barbero.id, accion)
      setCredenciales({ ...result, nombre: `${barbero.nombre} ${barbero.apellido}` })
      setAccesoPendiente(null)
    } catch (error: any) {
      toast.error(error.message || 'No se pudieron generar las credenciales')
      // A refusal usually means the access state shown is stale: reload it.
      setAccesoPendiente(null)
      reloadCuentas()
    } finally {
      setGenerandoAcceso(false)
    }
  }

  const closeCredenciales = () => {
    setCredenciales(null)
    reloadCuentas()
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
    reloadCuentas()
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

      {cuentasError && (
        <div className="mb-4 p-3 rounded-lg text-sm text-red-400" style={{ border: '1px solid rgba(239, 68, 68, 0.4)' }}>
          No se pudo verificar qué barberos tienen acceso: {cuentasError}{' '}
          <button onClick={reloadCuentas} className="underline">Reintentar</button>
        </div>
      )}

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
            {loadError ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-red-400">
                  <p>No se pudieron cargar los barberos: {loadError}</p>
                  <button
                    onClick={() => loadBarberos()}
                    className="mt-2 px-3 py-1 text-sm rounded-md"
                    style={{ border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  >
                    Reintentar
                  </button>
                </td>
              </tr>
            ) : barberos.length === 0 ? (
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

                      {/* Acceso: crear la cuenta o generar una contraseña temporal */}
                      {cuentas && (cuentas[barbero.id] && cuentas[barbero.id].rol !== 'barbero' ? (
                        <span className="text-xs" style={{ color: 'var(--text-primary)', opacity: 0.6 }}>
                          Acceso con rol {cuentas[barbero.id].rol}
                        </span>
                      ) : cuentas[barbero.id] ? (
                        <button
                          onClick={() => setAccesoPendiente({ barbero, accion: 'nueva' })}
                          className="text-blue-400 hover:text-blue-300 text-xs"
                          style={{ transition: 'var(--transition)' }}
                          title="Nueva contraseña"
                        >
                          <i className="fas fa-key mr-1"></i>
                          Nueva contraseña
                        </button>
                      ) : !barbero.activo ? (
                        <span className="text-xs" style={{ color: 'var(--text-primary)', opacity: 0.6 }}>
                          Activa al barbero para crear su acceso
                        </span>
                      ) : barbero.email ? (
                        <button
                          onClick={() => setAccesoPendiente({ barbero, accion: 'crear' })}
                          className="text-blue-400 hover:text-blue-300 text-xs"
                          style={{ transition: 'var(--transition)' }}
                          title="Crear acceso"
                        >
                          <i className="fas fa-user-plus mr-1"></i>
                          Crear acceso
                        </button>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--text-primary)', opacity: 0.6 }}>
                          Agrega un email para crear su acceso
                        </span>
                      ))}
                      
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

      {/* Confirmación de "Crear acceso" / "Nueva contraseña" */}
      <ConfirmDialog
        isOpen={!!accesoPendiente}
        onClose={() => { if (!generandoAcceso) setAccesoPendiente(null) }}
        onConfirm={confirmAcceso}
        title={accesoPendiente?.accion === 'nueva' ? 'Nueva contraseña' : 'Crear acceso'}
        message={accesoPendiente?.accion === 'nueva'
          ? `Se generará una contraseña temporal para ${accesoPendiente.barbero.nombre} ${accesoPendiente.barbero.apellido}. Su contraseña actual dejará de funcionar y la nueva se mostrará una sola vez.`
          : `Se creará el acceso de ${accesoPendiente?.barbero.nombre} ${accesoPendiente?.barbero.apellido} con el email ${accesoPendiente?.barbero.email} y una contraseña temporal que se mostrará una sola vez.`}
        confirmText={accesoPendiente?.accion === 'nueva' ? 'Generar contraseña' : 'Crear acceso'}
        type="info"
        loading={generandoAcceso}
      />

      {/* Credenciales generadas: se muestran una sola vez */}
      {credenciales && (
        <CredencialesModal
          isOpen
          onClose={closeCredenciales}
          titulo={credenciales.accion === 'nueva' ? 'Nueva contraseña generada' : 'Acceso creado'}
          mensaje={`Credenciales de ${credenciales.nombre}`}
          email={credenciales.email}
          password={credenciales.password}
          emailEnviado={credenciales.emailEnviado}
        />
      )}
    </div>
  )
}

export default BarberosTab
