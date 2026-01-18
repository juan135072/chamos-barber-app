import React, { useState, useEffect } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import { chamosSupabase } from '../../../../lib/supabase-helpers'
import type { Database } from '../../../../lib/database.types'
import ServicioModal from '../modals/ServicioModal'
import ConfirmDialog from '../shared/ConfirmDialog'
import toast from 'react-hot-toast'

type Servicio = Database['public']['Tables']['servicios']['Row']

const ServiciosTab: React.FC = () => {
  const supabase = useSupabaseClient<Database>()
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedServicio, setSelectedServicio] = useState<Servicio | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [servicioToDelete, setServicioToDelete] = useState<Servicio | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [filterCategoria, setFilterCategoria] = useState<string>('all')
  const [categorias, setCategorias] = useState<Array<{ nombre: string }>>([])

  useEffect(() => {
    loadServicios()
    loadCategorias()
  }, [])

  const loadServicios = async () => {
    try {
      setLoading(true)
      // No pasar parámetro para obtener TODOS los servicios (activos e inactivos)
      const data = await chamosSupabase.getServicios()
      setServicios(data || [])
    } catch (error) {
      console.error('Error loading servicios:', error)
      toast.error('Error al cargar servicios')
    } finally {
      setLoading(false)
    }
  }

  const loadCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias_servicios')
        .select('nombre')
        .eq('activo', true)
        .order('orden', { ascending: true })

      if (error) throw error
      setCategorias(data || [])
    } catch (error) {
      console.error('Error loading categorias:', error)
      // Fallback a categorías por defecto si hay error
      setCategorias([
        { nombre: 'cortes' },
        { nombre: 'barbas' },
        { nombre: 'tintes' },
        { nombre: 'tratamientos' },
        { nombre: 'combos' }
      ])
    }
  }

  const filteredServicios = filterCategoria === 'all'
    ? servicios
    : servicios.filter(s => {
      if (!s.categoria) return false
      const servicioCategoria = s.categoria.toLowerCase().trim()
      const filtroCategoria = filterCategoria.toLowerCase().trim()

      // Intenta match exacto primero
      if (servicioCategoria === filtroCategoria) return true

      // Intenta match sin considerar singular/plural
      // "barba" vs "barbas", "tratamiento" vs "tratamientos"
      const singularServicio = servicioCategoria.replace(/s$/, '')
      const singularFiltro = filtroCategoria.replace(/s$/, '')

      return singularServicio === singularFiltro
    })

  const handleCreate = () => {
    setSelectedServicio(null)
    setShowModal(true)
  }

  const handleEdit = (servicio: Servicio) => {
    setSelectedServicio(servicio)
    setShowModal(true)
  }

  const handleDelete = (servicio: Servicio) => {
    setServicioToDelete(servicio)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!servicioToDelete) return

    try {
      setDeleting(true)
      await chamosSupabase.deleteServicio(servicioToDelete.id)
      toast.success('Servicio eliminado exitosamente')
      loadServicios()
      setShowDeleteDialog(false)
      setServicioToDelete(null)
    } catch (error: any) {
      console.error('Error deleting servicio:', error)
      toast.error(error.message || 'Error al eliminar servicio')
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleActive = async (servicio: Servicio) => {
    try {
      await chamosSupabase.updateServicio(servicio.id, {
        activo: !servicio.activo
      })
      toast.success(`Servicio ${!servicio.activo ? 'activado' : 'desactivado'}`)
      loadServicios()
    } catch (error) {
      console.error('Error toggling servicio:', error)
      toast.error('Error al actualizar servicio')
    }
  }

  // NOTA: La columna 'popular' no existe en la tabla servicios
  // const handleTogglePopular = async (servicio: Servicio) => {
  //   try {
  //     await chamosSupabase.updateServicio(servicio.id, {
  //       popular: !servicio.popular
  //     })
  //     toast.success(`Servicio ${!servicio.popular ? 'marcado como popular' : 'desmarcado'}`)
  //     loadServicios()
  //   } catch (error) {
  //     console.error('Error toggling popular:', error)
  //     toast.error('Error al actualizar servicio')
  //   }
  // }

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
          <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--accent-color)' }}>Gestión de Servicios</h2>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
            {servicios.length} servicios totales
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center px-3 sm:px-4 py-2 border border-transparent text-sm font-medium rounded-md w-full sm:w-auto justify-center"
          style={{ backgroundColor: 'var(--accent-color)', color: 'var(--bg-primary)', transition: 'var(--transition)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#B8941F'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-color)'}
        >
          <i className="fas fa-plus mr-2"></i>
          Nuevo Servicio
        </button>
      </div>

      {/* Filtros */}
      <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-hide pb-2">
        <button
          key="all"
          onClick={() => setFilterCategoria('all')}
          className="px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap"
          style={filterCategoria === 'all' ? {
            backgroundColor: 'var(--accent-color)',
            color: 'var(--bg-primary)'
          } : {
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)'
          }}
        >
          Todos
        </button>
        {categorias.map(cat => (
          <button
            key={cat.nombre}
            onClick={() => setFilterCategoria(cat.nombre)}
            className="px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap flex items-center gap-2"
            style={filterCategoria === cat.nombre ? {
              backgroundColor: 'var(--accent-color)',
              color: 'var(--bg-primary)'
            } : {
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)'
            }}
          >
            <span>{cat.nombre.charAt(0).toUpperCase() + cat.nombre.slice(1)}</span>
          </button>
        ))}
      </div>

      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }} className="shadow rounded-lg overflow-x-auto">
        <table className="min-w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead style={{ background: 'var(--bg-tertiary)' }}>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Servicio</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Categoría</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Precio</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Duración</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Estado</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Acciones</th>
            </tr>
          </thead>
          <tbody style={{ background: 'var(--bg-secondary)' }}>
            {filteredServicios.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center" style={{ color: 'var(--text-primary)', opacity: 0.7, borderTop: '1px solid var(--border-color)' }}>
                  No hay servicios en esta categoría
                </td>
              </tr>
            ) : (
              filteredServicios.map((servicio) => (
                <tr key={servicio.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 mr-3">
                        <img
                          className="h-10 w-10 rounded-md object-cover border border-gray-700"
                          src={servicio.imagen_url || "/images/servicios/corte_cabello_premium_1768743529185.png"}
                          alt=""
                        />
                      </div>
                      <div>
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{servicio.nombre}</div>
                        <div className="text-sm line-clamp-1" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>{servicio.descripcion}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {servicio.categoria}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--text-primary)' }}>
                    ${servicio.precio.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
                    {servicio.duracion_minutos} min
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(servicio)}
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${servicio.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                    >
                      {servicio.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    {/* Popular button removed - column doesn't exist in DB */}
                    <button
                      onClick={() => handleEdit(servicio)}
                      className="text-amber-600 hover:text-amber-900 mr-3"
                      title="Editar"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button
                      onClick={() => handleDelete(servicio)}
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
        <ServicioModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            loadServicios()
          }}
          servicio={selectedServicio}
        />
      )}

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDelete}
        title="Eliminar Servicio"
        message={`¿Estás seguro de eliminar el servicio "${servicioToDelete?.nombre}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        type="danger"
        loading={deleting}
      />
    </div>
  )
}

export default ServiciosTab
