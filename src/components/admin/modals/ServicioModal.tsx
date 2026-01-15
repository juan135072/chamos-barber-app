import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Modal from '../shared/Modal'
import { chamosSupabase } from '../../../../lib/supabase-helpers'
import type { Database } from '../../../../lib/database.types'
import toast from 'react-hot-toast'

type Servicio = Database['public']['Tables']['servicios']['Row']

const servicioSchema = z.object({
  nombre: z.string().min(3, 'Nombre debe tener al menos 3 caracteres'),
  descripcion: z.string().optional(),
  precio: z.number().min(0, 'Precio debe ser mayor a 0'),
  duracion_minutos: z.number().min(5).max(300),
  tiempo_buffer: z.number().min(0).max(60),
  categoria: z.string().min(1, 'Categoría requerida'),
  imagen_url: z.string().url('URL inválida').optional().or(z.literal('')),
  activo: z.boolean()
  // NOTA: popular y orden_display no existen en la tabla servicios
})

type ServicioFormData = z.infer<typeof servicioSchema>

interface ServicioModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  servicio?: Servicio | null
}

const ServicioModal: React.FC<ServicioModalProps> = ({ isOpen, onClose, onSuccess, servicio }) => {
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(servicio?.imagen_url || null)
  const isEdit = !!servicio

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<ServicioFormData>({
    resolver: zodResolver(servicioSchema),
    defaultValues: servicio ? {
      nombre: servicio.nombre,
      descripcion: servicio.descripcion || '',
      precio: servicio.precio,
      duracion_minutos: servicio.duracion_minutos,
      tiempo_buffer: (servicio as any).tiempo_buffer || 5,
      categoria: servicio.categoria,
      imagen_url: servicio.imagen_url || '',
      activo: servicio.activo
    } : {
      nombre: '',
      descripcion: '',
      precio: 15000,
      duracion_minutos: 30,
      tiempo_buffer: 5,
      categoria: 'cortes',
      imagen_url: '',
      activo: true
    }
  })

  // Manejar selección de archivo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      toast.error('Tipo de archivo no válido. Solo se permiten imágenes (JPG, PNG, WEBP, GIF)')
      return
    }

    // Validar tamaño (5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error('La imagen es muy grande. Tamaño máximo: 5MB')
      return
    }

    setSelectedFile(file)

    // Crear preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Limpiar imagen
  const handleClearImage = () => {
    setSelectedFile(null)
    setImagePreview(servicio?.imagen_url || null)
    setValue('imagen_url', servicio?.imagen_url || '')
  }

  const onSubmit = async (data: ServicioFormData) => {
    try {
      setLoading(true)

      let imagenUrl = data.imagen_url || null

      let tempCreatedId: string | undefined = undefined

      // Si hay un archivo seleccionado, subirlo primero
      if (selectedFile) {
        try {
          setUploadingImage(true)
          toast.loading('Subiendo imagen...', { id: 'upload' })

          // Crear servicio temporalmente si es nuevo para obtener ID
          let sIdToUpload = servicio?.id

          if (!sIdToUpload) {
            // Crear primero sin imagen para obtener el ID necesario para el path de storage
            const tempServicioData: any = {
              nombre: data.nombre,
              descripcion: data.descripcion || null,
              precio: data.precio,
              duracion_minutos: data.duracion_minutos,
              tiempo_buffer: data.tiempo_buffer,
              categoria: data.categoria,
              imagen_url: null,
              activo: data.activo
            }
            const newServicio = await chamosSupabase.createServicio(tempServicioData)
            sIdToUpload = newServicio.id
            tempCreatedId = newServicio.id
          }

          // Subir imagen
          const { publicUrl } = await chamosSupabase.uploadServicioFoto(selectedFile, sIdToUpload)
          imagenUrl = publicUrl
          toast.success('Imagen subida exitosamente', { id: 'upload' })
        } catch (error: any) {
          console.error('Error uploading image:', error)
          toast.error(error.message || 'Error al subir imagen', { id: 'upload' })
          // Continuar sin imagen
        } finally {
          setUploadingImage(false)
        }
      }

      const servicioData: any = {
        nombre: data.nombre,
        descripcion: data.descripcion || null,
        precio: data.precio,
        duracion_minutos: data.duracion_minutos,
        tiempo_buffer: data.tiempo_buffer,
        categoria: data.categoria,
        imagen_url: imagenUrl,
        activo: data.activo
      }

      if (isEdit && servicio) {
        await chamosSupabase.updateServicio(servicio.id, servicioData)
        toast.success('Servicio actualizado exitosamente')
      } else if (!selectedFile) {
        // Solo crear si no se subió archivo (si se subió, ya se creó arriba)
        await chamosSupabase.createServicio(servicioData)
        toast.success('Servicio creado exitosamente')
      } else {
        // Actualizar con la imagen si se creó temporalmente
        // Usamos el ID temporal que guardamos o buscamos por nombre como respaldo
        let finalId = servicio?.id || tempCreatedId

        if (!finalId) {
          const servicios = await chamosSupabase.getServicios(false)
          const found = (servicios as Servicio[]).find(s => s.nombre === data.nombre)
          finalId = found?.id
        }

        if (finalId) {
          await chamosSupabase.updateServicio(finalId, servicioData)
        }
        toast.success('Servicio creado exitosamente')
      }

      onSuccess()
    } catch (error: any) {
      console.error('Error saving servicio:', error)
      toast.error(error.message || 'Error al guardar servicio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Editar Servicio' : 'Nuevo Servicio'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input type="text" {...register('nombre')} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500" />
            {errors.nombre && <p className="mt-1 text-sm text-red-600">{errors.nombre.message}</p>}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea {...register('descripcion')} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Precio ($) *</label>
            <input type="number" {...register('precio', { valueAsNumber: true })} min="0" step="1000" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500" />
            {errors.precio && <p className="mt-1 text-sm text-red-600">{errors.precio.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duración (min) *</label>
            <input type="number" {...register('duracion_minutos', { valueAsNumber: true })} min="5" max="300" step="5" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500" />
            {errors.duracion_minutos && <p className="mt-1 text-sm text-red-600">{errors.duracion_minutos.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buffer/Limpieza (min)</label>
            <input type="number" {...register('tiempo_buffer', { valueAsNumber: true })} min="0" max="60" step="1" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500" />
            {errors.tiempo_buffer && <p className="mt-1 text-sm text-red-600">{errors.tiempo_buffer.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
            <select {...register('categoria')} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500">
              <option value="cortes">Cortes</option>
              <option value="barbas">Barbas</option>
              <option value="tintes">Tintes</option>
              <option value="tratamientos">Tratamientos</option>
              <option value="combos">Combos</option>
            </select>
          </div>

          {/* Campo orden_display removido - columna no existe en DB */}

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Imagen del Servicio</label>

            {/* Preview de imagen */}
            {imagePreview && (
              <div className="mb-3 flex items-center gap-4">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-32 h-32 rounded-lg object-cover border-2"
                  style={{ borderColor: 'var(--accent-color)' }}
                />
                <button
                  type="button"
                  onClick={handleClearImage}
                  className="text-sm text-red-400 hover:text-red-600 transition-colors"
                >
                  <i className="fas fa-times mr-1"></i>
                  Quitar imagen
                </button>
              </div>
            )}

            {/* Input de archivo */}
            <div
              className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors"
              style={{
                borderColor: 'var(--border-color)',
                backgroundColor: 'rgba(212, 175, 55, 0.03)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-color)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              <div className="space-y-1 text-center">
                <i className="fas fa-cloud-upload-alt text-4xl mb-3" style={{ color: 'var(--accent-color)', opacity: 0.7 }}></i>
                <div className="flex text-sm" style={{ color: 'var(--text-primary)' }}>
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer rounded-md font-medium"
                    style={{
                      color: 'var(--accent-color)',
                      backgroundColor: 'transparent',
                      transition: 'var(--transition)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    <span>Subir archivo</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      className="sr-only"
                      onChange={handleFileSelect}
                    />
                  </label>
                  <p className="pl-1" style={{ opacity: 0.8 }}>o arrastra y suelta</p>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-primary)', opacity: 0.6 }}>
                  PNG, JPG, WEBP, GIF hasta 5MB
                </p>
              </div>
            </div>

            {selectedFile && (
              <p className="mt-2 text-sm text-green-600">
                <i className="fas fa-check-circle mr-1"></i>
                Archivo seleccionado: {selectedFile.name}
              </p>
            )}

            {/* Campo oculto para mantener compatibilidad */}
            <input type="hidden" {...register('imagen_url')} />
          </div>

          {/* Campo popular removido - columna no existe en DB */}

          <div className="flex items-center">
            <input type="checkbox" {...register('activo')} className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded" />
            <label className="ml-2 text-sm text-gray-700">Servicio activo</label>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2">
            {loading && <i className="fas fa-spinner fa-spin"></i>}
            {isEdit ? 'Actualizar' : 'Crear'} Servicio
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default ServicioModal
