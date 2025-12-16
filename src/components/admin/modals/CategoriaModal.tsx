import React, { useState, useEffect } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import type { Database } from '../../../../lib/database.types'
import toast from 'react-hot-toast'

type Categoria = {
  id: string
  nombre: string
  descripcion: string | null
  icono: string | null
  orden: number
  activo: boolean
}

interface CategoriaModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  categoria: Categoria | null
}

// Iconos sugeridos para categorías
const iconosSugeridos = [
  { emoji: '✂️', nombre: 'Tijeras' },
  { emoji: '💈', nombre: 'Barbería' },
  { emoji: '🎨', nombre: 'Arte' },
  { emoji: '⭐', nombre: 'Estrella' },
  { emoji: '💇', nombre: 'Corte' },
  { emoji: '🧔', nombre: 'Barba' },
  { emoji: '💆', nombre: 'Tratamiento' },
  { emoji: '🎭', nombre: 'Estilo' },
  { emoji: '✨', nombre: 'Especial' },
  { emoji: '🔥', nombre: 'Popular' },
]

const CategoriaModal: React.FC<CategoriaModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  categoria
}) => {
  const supabase = useSupabaseClient<Database>()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    icono: '💈',
    activo: true
  })

  useEffect(() => {
    if (categoria) {
      setFormData({
        nombre: categoria.nombre,
        descripcion: categoria.descripcion || '',
        icono: categoria.icono || '💈',
        activo: categoria.activo
      })
    } else {
      setFormData({
        nombre: '',
        descripcion: '',
        icono: '💈',
        activo: true
      })
    }
  }, [categoria, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nombre.trim()) {
      toast.error('El nombre es requerido')
      return
    }

    try {
      setLoading(true)

      if (categoria) {
        // Actualizar categoría existente
        const { error } = await supabase
          .from('categorias_servicios')
          .update({
            nombre: formData.nombre.trim().toLowerCase(),
            descripcion: formData.descripcion.trim() || null,
            icono: formData.icono || null,
            activo: formData.activo
          })
          .eq('id', categoria.id)

        if (error) throw error
        toast.success('Categoría actualizada exitosamente')
      } else {
        // Obtener el máximo orden actual
        const { data: maxOrden, error: maxError } = await supabase
          .from('categorias_servicios')
          .select('orden')
          .order('orden', { ascending: false })
          .limit(1)
          .single()

        const nuevoOrden = maxOrden ? maxOrden.orden + 1 : 1

        // Crear nueva categoría
        const { error } = await supabase
          .from('categorias_servicios')
          .insert({
            nombre: formData.nombre.trim().toLowerCase(),
            descripcion: formData.descripcion.trim() || null,
            icono: formData.icono || null,
            orden: nuevoOrden,
            activo: formData.activo
          })

        if (error) throw error
        toast.success('Categoría creada exitosamente')
      }

      onSuccess()
    } catch (error: any) {
      console.error('Error saving categoria:', error)
      toast.error(error.message || 'Error al guardar categoría')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity" 
          aria-hidden="true"
          onClick={onClose}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
        ></div>

        {/* Center modal */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal panel */}
        <div 
          className="inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
          style={{ 
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)'
          }}
        >
          <form onSubmit={handleSubmit}>
            <div className="px-6 pt-5 pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 
                  className="text-lg font-medium"
                  style={{ color: 'var(--accent-color)' }}
                  id="modal-title"
                >
                  {categoria ? 'Editar Categoría' : 'Nueva Categoría'}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md p-1 hover:opacity-70"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="space-y-4">
                {/* Nombre */}
                <div>
                  <label 
                    htmlFor="nombre" 
                    className="block text-sm font-medium mb-1"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)'
                    }}
                    placeholder="ej: cortes, barbas, tintes..."
                    required
                  />
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-primary)', opacity: 0.6 }}>
                    Se guardará en minúsculas automáticamente
                  </p>
                </div>

                {/* Icono */}
                <div>
                  <label 
                    htmlFor="icono" 
                    className="block text-sm font-medium mb-1"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Icono
                  </label>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      id="icono"
                      value={formData.icono}
                      onChange={(e) => setFormData({ ...formData, icono: e.target.value })}
                      className="w-20 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 text-center text-2xl"
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--text-primary)'
                      }}
                      placeholder="💈"
                      maxLength={2}
                    />
                    <span className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                      Vista previa: {formData.icono || '(sin icono)'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {iconosSugeridos.map((item) => (
                      <button
                        key={item.emoji}
                        type="button"
                        onClick={() => setFormData({ ...formData, icono: item.emoji })}
                        className="text-2xl hover:scale-110 transition-transform p-1 rounded"
                        style={{
                          backgroundColor: formData.icono === item.emoji ? 'var(--accent-color)' : 'transparent'
                        }}
                        title={item.nombre}
                      >
                        {item.emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Descripción */}
                <div>
                  <label 
                    htmlFor="descripcion" 
                    className="block text-sm font-medium mb-1"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Descripción
                  </label>
                  <textarea
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)'
                    }}
                    placeholder="Descripción breve de la categoría..."
                  />
                </div>

                {/* Estado Activo */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="activa"
                    checked={formData.activo}
                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                    className="h-4 w-4 rounded"
                    style={{ accentColor: 'var(--accent-color)' }}
                  />
                  <label 
                    htmlFor="activa" 
                    className="ml-2 block text-sm"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Categoría activa
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div 
              className="px-6 py-3 flex justify-end gap-3"
              style={{ 
                backgroundColor: 'var(--bg-tertiary)',
                borderTop: '1px solid var(--border-color)'
              }}
            >
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 border rounded-md text-sm font-medium"
                style={{
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-secondary)'
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium"
                style={{
                  backgroundColor: loading ? '#999' : 'var(--accent-color)',
                  color: 'var(--bg-primary)'
                }}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Guardando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save mr-2"></i>
                    {categoria ? 'Actualizar' : 'Crear'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CategoriaModal
