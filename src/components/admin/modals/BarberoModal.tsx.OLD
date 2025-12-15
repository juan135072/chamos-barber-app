import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Modal from '../shared/Modal'
import { chamosSupabase } from '../../../../lib/supabase-helpers'
import type { Database } from '../../../../lib/database.types'
import toast from 'react-hot-toast'

type Barbero = Database['public']['Tables']['barberos']['Row']
type BarberoInsert = Database['public']['Tables']['barberos']['Insert']

const barberoSchema = z.object({
  nombre: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  apellido: z.string().min(2, 'Apellido debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono: z.string().optional(),
  especialidad: z.string().min(3, 'Especialidad requerida'),
  descripcion: z.string().optional(),
  instagram: z.string().optional(),
  imagen_url: z.string().url('URL de imagen inválida').optional().or(z.literal('')),
  experiencia_anos: z.number().min(0).max(50),
  calificacion: z.number().min(0).max(5),
  precio_base: z.number().min(0),
  orden_display: z.number().min(0),
  activo: z.boolean()
})

type BarberoFormData = z.infer<typeof barberoSchema>

interface BarberoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  barbero?: Barbero | null
}

const BarberoModal: React.FC<BarberoModalProps> = ({ isOpen, onClose, onSuccess, barbero }) => {
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(barbero?.imagen_url || null)
  const isEdit = !!barbero

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm<BarberoFormData>({
    resolver: zodResolver(barberoSchema),
    defaultValues: barbero ? {
      nombre: barbero.nombre,
      apellido: barbero.apellido,
      email: barbero.email || '',
      telefono: barbero.telefono || '',
      especialidad: barbero.especialidad,
      descripcion: barbero.descripcion || '',
      instagram: barbero.instagram || '',
      imagen_url: barbero.imagen_url || '',
      experiencia_anos: barbero.experiencia_anos,
      calificacion: barbero.calificacion,
      precio_base: barbero.precio_base,
      orden_display: barbero.orden_display,
      activo: barbero.activo
    } : {
      nombre: '',
      apellido: '',
      email: '',
      telefono: '',
      especialidad: '',
      descripcion: '',
      instagram: '',
      imagen_url: '',
      experiencia_anos: 1,
      calificacion: 5.0,
      precio_base: 15000,
      orden_display: 0,
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
    setImagePreview(barbero?.imagen_url || null)
    setValue('imagen_url', barbero?.imagen_url || '')
  }

  const onSubmit = async (data: BarberoFormData) => {
    try {
      setLoading(true)

      let imagenUrl = data.imagen_url || null

      // Si hay un archivo seleccionado, subirlo primero
      if (selectedFile) {
        try {
          setUploadingImage(true)
          toast.loading('Subiendo imagen...', { id: 'upload' })

          // Crear barbero temporalmente si es nuevo para obtener ID
          let barberoId = barbero?.id

          if (!barberoId) {
            // Crear primero sin imagen
            const tempBarberoData: BarberoInsert = {
              nombre: data.nombre,
              apellido: data.apellido,
              email: data.email || null,
              telefono: data.telefono || null,
              especialidad: data.especialidad,
              descripcion: data.descripcion || null,
              instagram: data.instagram || null,
              imagen_url: null,
              experiencia_anos: data.experiencia_anos,
              calificacion: data.calificacion,
              precio_base: data.precio_base,
              orden_display: data.orden_display,
              activo: data.activo
            }
            const newBarbero = await chamosSupabase.createBarbero(tempBarberoData)
            barberoId = newBarbero.id
          }

          // Subir imagen
          const { publicUrl } = await chamosSupabase.uploadBarberoFoto(selectedFile, barberoId)
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

      const barberoData: BarberoInsert = {
        nombre: data.nombre,
        apellido: data.apellido,
        email: data.email || null,
        telefono: data.telefono || null,
        especialidad: data.especialidad,
        descripcion: data.descripcion || null,
        instagram: data.instagram || null,
        imagen_url: imagenUrl,
        experiencia_anos: data.experiencia_anos,
        calificacion: data.calificacion,
        precio_base: data.precio_base,
        orden_display: data.orden_display,
        activo: data.activo
      }

      if (isEdit && barbero) {
        await chamosSupabase.updateBarbero(barbero.id, barberoData)
        toast.success('Barbero actualizado exitosamente')
      } else if (!selectedFile) {
        // Solo crear si no se subió archivo (si se subió, ya se creó arriba)
        await chamosSupabase.createBarbero(barberoData)
        toast.success('Barbero creado exitosamente')
      } else {
        // Actualizar con la imagen si se creó temporalmente
        const barberoId = barbero?.id || (await chamosSupabase.getBarberos()).find(b => b.nombre === data.nombre)?.id
        if (barberoId) {
          await chamosSupabase.updateBarbero(barberoId, barberoData)
        }
        toast.success('Barbero creado exitosamente')
      }

      reset()
      onSuccess()
    } catch (error: any) {
      console.error('Error saving barbero:', error)
      toast.error(error.message || 'Error al guardar barbero')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Editar Barbero' : 'Nuevo Barbero'}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Información Personal */}
        <div className="pb-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <h4 className="text-lg font-medium mb-4" style={{ color: 'var(--accent-color)' }}>Información Personal</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                {...register('nombre')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {errors.nombre && (
                <p className="mt-1 text-sm text-red-600">{errors.nombre.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Apellido *
              </label>
              <input
                type="text"
                {...register('apellido')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {errors.apellido && (
                <p className="mt-1 text-sm text-red-600">{errors.apellido.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                {...register('email')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                {...register('telefono')}
                placeholder="+56 9 1234 5678"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Información Profesional */}
        <div className="pb-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <h4 className="text-lg font-medium mb-4" style={{ color: 'var(--accent-color)' }}>Información Profesional</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Especialidad *
              </label>
              <input
                type="text"
                {...register('especialidad')}
                placeholder="Cortes modernos, barbas, diseños..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {errors.especialidad && (
                <p className="mt-1 text-sm text-red-600">{errors.especialidad.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                {...register('descripcion')}
                rows={3}
                placeholder="Breve descripción del barbero..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Experiencia (años) *
              </label>
              <input
                type="number"
                {...register('experiencia_anos', { valueAsNumber: true })}
                min="0"
                max="50"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {errors.experiencia_anos && (
                <p className="mt-1 text-sm text-red-600">{errors.experiencia_anos.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Calificación (0-5) *
              </label>
              <input
                type="number"
                step="0.1"
                {...register('calificacion', { valueAsNumber: true })}
                min="0"
                max="5"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {errors.calificacion && (
                <p className="mt-1 text-sm text-red-600">{errors.calificacion.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio Base ($) *
              </label>
              <input
                type="number"
                {...register('precio_base', { valueAsNumber: true })}
                min="0"
                step="1000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {errors.precio_base && (
                <p className="mt-1 text-sm text-red-600">{errors.precio_base.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Orden de Display *
              </label>
              <input
                type="number"
                {...register('orden_display', { valueAsNumber: true })}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {errors.orden_display && (
                <p className="mt-1 text-sm text-red-600">{errors.orden_display.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Redes Sociales e Imagen */}
        <div className="pb-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <h4 className="text-lg font-medium mb-4" style={{ color: 'var(--accent-color)' }}>Redes e Imagen</h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                Instagram (usuario)
              </label>
              <div className="flex">
                <span 
                  className="inline-flex items-center px-3 rounded-l-md border border-r-0 text-sm"
                  style={{ 
                    borderColor: 'var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    opacity: 0.7
                  }}
                >
                  @
                </span>
                <input
                  type="text"
                  {...register('instagram')}
                  placeholder="username"
                  className="flex-1 px-3 py-2 border rounded-r-md focus:outline-none focus:ring-2"
                  style={{ borderColor: 'var(--border-color)' }}
                />
              </div>
            </div>

            {/* Campo de carga de imagen */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Foto de Perfil
              </label>
              
              {/* Preview de imagen */}
              {imagePreview && (
                <div className="mb-3 flex items-center gap-4">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-24 h-24 rounded-full object-cover border-2"
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
          </div>
        </div>

        {/* Estado */}
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              {...register('activo')}
              className="h-4 w-4 rounded"
              style={{ accentColor: 'var(--accent-color)' }}
            />
            <span className="ml-2 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Barbero Activo
            </span>
          </label>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-primary)', opacity: 0.6 }}>
            Los barberos inactivos no aparecerán en el sistema de reservas
          </p>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium rounded-md disabled:opacity-50"
            style={{ 
              color: 'var(--text-primary)', 
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              transition: 'var(--transition)'
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.1)')}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium rounded-md disabled:opacity-50 flex items-center gap-2"
            style={{ 
              backgroundColor: 'var(--accent-color)',
              color: 'var(--bg-primary)',
              transition: 'var(--transition)'
            }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#B8941F')}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-color)'}
          >
            {loading && <i className="fas fa-spinner fa-spin"></i>}
            {isEdit ? 'Actualizar' : 'Crear'} Barbero
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default BarberoModal
