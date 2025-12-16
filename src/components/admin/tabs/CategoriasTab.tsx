import React, { useState, useEffect } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import type { Database } from '../../../../lib/database.types'
import toast from 'react-hot-toast'
import CategoriaModal from '../modals/CategoriaModal'
import ConfirmDialog from '../shared/ConfirmDialog'

type Categoria = {
  id: string
  nombre: string
  descripcion: string | null
  icono: string | null
  orden: number
  activa: boolean
  created_at: string
}

const CategoriasTab: React.FC = () => {
  const supabase = useSupabaseClient<Database>()
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategoria, setSelectedCategoria] = useState<Categoria | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [categoriaToDelete, setCategoriaToDelete] = useState<Categoria | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    // Verificar sesión y permisos al cargar
    checkPermissions()
    loadCategorias()
  }, [])

  const checkPermissions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        console.error('❌ [CategoriasTab] No hay sesión activa')
        return
      }

      console.log('🔐 [CategoriasTab] Verificando permisos de usuario:', {
        userId: session.user.id,
        email: session.user.email
      })

      // Verificar que el usuario esté en admin_users
      const { data: adminUser, error } = await supabase
        .from('admin_users')
        .select('id, email, rol, activo')
        .eq('id', session.user.id)
        .single()

      if (error) {
        console.error('❌ [CategoriasTab] Error verificando admin_user:', error)
        toast.error('Error al verificar permisos')
        return
      }

      if (!adminUser) {
        console.error('❌ [CategoriasTab] Usuario no encontrado en admin_users')
        toast.error('Usuario no autorizado')
        return
      }

      console.log('👤 [CategoriasTab] Datos del usuario admin:', adminUser)

      if (adminUser.rol !== 'admin') {
        console.warn('⚠️ [CategoriasTab] Usuario no es admin - rol:', adminUser.rol)
        toast.error('No tienes permisos de administrador')
        return
      }

      if (!adminUser.activo) {
        console.error('❌ [CategoriasTab] Usuario admin no está activo')
        toast.error('Tu cuenta de administrador está desactivada')
        return
      }

      console.log('✅ [CategoriasTab] Permisos verificados correctamente')
    } catch (error) {
      console.error('💥 [CategoriasTab] Error verificando permisos:', error)
    }
  }

  const loadCategorias = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('categorias_servicios')
        .select('*')
        .order('orden', { ascending: true })

      if (error) throw error
      setCategorias(data || [])
    } catch (error) {
      console.error('Error loading categorias:', error)
      toast.error('Error al cargar categorías')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setSelectedCategoria(null)
    setShowModal(true)
  }

  const handleEdit = (categoria: Categoria) => {
    setSelectedCategoria(categoria)
    setShowModal(true)
  }

  const handleDelete = (categoria: Categoria) => {
    setCategoriaToDelete(categoria)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!categoriaToDelete) return

    try {
      setDeleting(true)
      
      // Verificar si hay servicios usando esta categoría
      const { data: servicios, error: checkError } = await supabase
        .from('servicios')
        .select('id')
        .eq('categoria', categoriaToDelete.nombre)
        .limit(1)

      if (checkError) throw checkError

      if (servicios && servicios.length > 0) {
        toast.error('No se puede eliminar. Hay servicios usando esta categoría.')
        setShowDeleteDialog(false)
        setCategoriaToDelete(null)
        return
      }

      const { error } = await supabase
        .from('categorias_servicios')
        .delete()
        .eq('id', categoriaToDelete.id)

      if (error) throw error

      toast.success('Categoría eliminada exitosamente')
      loadCategorias()
      setShowDeleteDialog(false)
      setCategoriaToDelete(null)
    } catch (error: any) {
      console.error('Error deleting categoria:', error)
      toast.error(error.message || 'Error al eliminar categoría')
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleActive = async (categoria: Categoria) => {
    try {
      console.log('🔄 [CategoriasTab] Intentando cambiar estado de categoría:', {
        id: categoria.id,
        nombre: categoria.nombre,
        estado_actual: categoria.activa,
        nuevo_estado: !categoria.activa
      })

      const { data, error, count } = await supabase
        .from('categorias_servicios')
        .update({ activa: !categoria.activa })
        .eq('id', categoria.id)
        .select()

      console.log('📋 [CategoriasTab] Respuesta de Supabase:', { data, error, count })

      if (error) {
        console.error('❌ [CategoriasTab] Error de Supabase:', error)
        throw error
      }

      // Verificar si se actualizó alguna fila (puede fallar silenciosamente por RLS)
      if (!data || data.length === 0) {
        console.error('❌ [CategoriasTab] No se actualizó ninguna fila - Posible problema de permisos RLS')
        throw new Error('No se pudo actualizar la categoría. Verifica tus permisos de administrador.')
      }

      console.log('✅ [CategoriasTab] Categoría actualizada exitosamente')
      toast.success(`Categoría ${!categoria.activa ? 'activada' : 'desactivada'}`)
      loadCategorias()
    } catch (error: any) {
      console.error('💥 [CategoriasTab] Error en handleToggleActive:', error)
      toast.error(error.message || 'Error al actualizar categoría')
    }
  }

  const handleMoveUp = async (categoria: Categoria, index: number) => {
    if (index === 0) return

    const prevCategoria = categorias[index - 1]
    
    try {
      // Intercambiar orden
      await supabase
        .from('categorias_servicios')
        .update({ orden: prevCategoria.orden })
        .eq('id', categoria.id)

      await supabase
        .from('categorias_servicios')
        .update({ orden: categoria.orden })
        .eq('id', prevCategoria.id)

      toast.success('Orden actualizado')
      loadCategorias()
    } catch (error) {
      console.error('Error updating order:', error)
      toast.error('Error al actualizar orden')
    }
  }

  const handleMoveDown = async (categoria: Categoria, index: number) => {
    if (index === categorias.length - 1) return

    const nextCategoria = categorias[index + 1]
    
    try {
      // Intercambiar orden
      await supabase
        .from('categorias_servicios')
        .update({ orden: nextCategoria.orden })
        .eq('id', categoria.id)

      await supabase
        .from('categorias_servicios')
        .update({ orden: categoria.orden })
        .eq('id', nextCategoria.id)

      toast.success('Orden actualizado')
      loadCategorias()
    } catch (error) {
      console.error('Error updating order:', error)
      toast.error('Error al actualizar orden')
    }
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
        <div>
          <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--accent-color)' }}>
            Gestión de Categorías
          </h2>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
            {categorias.length} categorías totales
          </p>
        </div>
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
          Nueva Categoría
        </button>
      </div>

      <div 
        style={{ 
          background: 'var(--bg-secondary)', 
          border: '1px solid var(--border-color)' 
        }} 
        className="shadow rounded-lg overflow-x-auto"
      >
        <table className="min-w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead style={{ background: 'var(--bg-tertiary)' }}>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                Orden
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                Categoría
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                Descripción
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                Estado
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                Acciones
              </th>
            </tr>
          </thead>
          <tbody style={{ background: 'var(--bg-secondary)' }}>
            {categorias.length === 0 ? (
              <tr>
                <td 
                  colSpan={5} 
                  className="px-6 py-4 text-center" 
                  style={{ 
                    color: 'var(--text-primary)', 
                    opacity: 0.7, 
                    borderTop: '1px solid var(--border-color)' 
                  }}
                >
                  No hay categorías registradas
                </td>
              </tr>
            ) : (
              categorias.map((categoria, index) => (
                <tr key={categoria.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleMoveUp(categoria, index)}
                        disabled={index === 0}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Subir"
                      >
                        <i className="fas fa-chevron-up"></i>
                      </button>
                      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {categoria.orden}
                      </span>
                      <button
                        onClick={() => handleMoveDown(categoria, index)}
                        disabled={index === categorias.length - 1}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Bajar"
                      >
                        <i className="fas fa-chevron-down"></i>
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {categoria.icono && (
                        <span className="text-2xl">{categoria.icono}</span>
                      )}
                      <div>
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {categoria.nombre}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                      {categoria.descripcion || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(categoria)}
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        categoria.activa ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {categoria.activa ? 'Activa' : 'Inactiva'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => handleEdit(categoria)}
                      className="text-amber-600 hover:text-amber-900 mr-3"
                      title="Editar"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button
                      onClick={() => handleDelete(categoria)}
                      className="text-red-600 hover:text-red-900"
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

      {showModal && (
        <CategoriaModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            loadCategorias()
          }}
          categoria={selectedCategoria}
        />
      )}

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        title="Eliminar Categoría"
        message={`¿Estás seguro de eliminar la categoría "${categoriaToDelete?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        type="danger"
        loading={deleting}
      />
    </div>
  )
}

export default CategoriasTab
