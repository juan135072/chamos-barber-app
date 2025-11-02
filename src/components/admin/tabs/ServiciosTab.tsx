import React, { useState, useEffect } from 'react'
import { chamosSupabase } from '../../../../lib/supabase-helpers'
import type { Database } from '../../../../lib/database.types'
import ServicioModal from '../modals/ServicioModal'
import ConfirmDialog from '../shared/ConfirmDialog'
import toast from 'react-hot-toast'

type Servicio = Database['public']['Tables']['servicios']['Row']

const ServiciosTab: React.FC = () => {
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedServicio, setSelectedServicio] = useState<Servicio | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [servicioToDelete, setServicioToDelete] = useState<Servicio | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [filterCategoria, setFilterCategoria] = useState<string>('all')

  const categorias = ['all', 'cortes', 'barbas', 'tintes', 'tratamientos', 'combos']

  useEffect(() => {
    loadServicios()
  }, [])

  const loadServicios = async () => {
    try {
      setLoading(true)
      const data = await chamosSupabase.getServicios()
      setServicios(data || [])
    } catch (error) {
      console.error('Error loading servicios:', error)
      toast.error('Error al cargar servicios')
    } finally {
      setLoading(false)
    }
  }

  const filteredServicios = filterCategoria === 'all' 
    ? servicios 
    : servicios.filter(s => s.categoria === filterCategoria)

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

  const handleTogglePopular = async (servicio: Servicio) => {
    try {
      await chamosSupabase.updateServicio(servicio.id, {
        popular: !servicio.popular
      })
      toast.success(`Servicio ${!servicio.popular ? 'marcado como popular' : 'desmarcado'}`)
      loadServicios()
    } catch (error) {
      console.error('Error toggling popular:', error)
      toast.error('Error al actualizar servicio')
    }
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestión de Servicios</h2>
          <p className="text-sm text-gray-600 mt-1">
            {servicios.length} servicios totales
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700"
        >
          <i className="fas fa-plus mr-2"></i>
          Nuevo Servicio
        </button>
      </div>

      {/* Filtros */}
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {categorias.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategoria(cat)}
            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
              filterCategoria === cat
                ? 'bg-amber-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {cat === 'all' ? 'Todos' : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Servicio</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duración</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredServicios.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  No hay servicios en esta categoría
                </td>
              </tr>
            ) : (
              filteredServicios.map((servicio) => (
                <tr key={servicio.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{servicio.nombre}</div>
                        <div className="text-sm text-gray-500 line-clamp-1">{servicio.descripcion}</div>
                        {servicio.popular && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                            <i className="fas fa-star mr-1"></i>
                            Popular
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {servicio.categoria}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${servicio.precio.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {servicio.duracion_minutos} min
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(servicio)}
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        servicio.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {servicio.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => handleTogglePopular(servicio)}
                      className="text-yellow-600 hover:text-yellow-900 mr-3"
                      title={servicio.popular ? 'Desmarcar popular' : 'Marcar como popular'}
                    >
                      <i className={`fas fa-star ${servicio.popular ? '' : 'far'}`}></i>
                    </button>
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
