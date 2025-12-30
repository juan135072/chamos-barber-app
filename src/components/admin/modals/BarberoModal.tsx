import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Modal from '../shared/Modal'
import { supabase } from '../../../../lib/initSupabase'
import { chamosSupabase } from '../../../../lib/supabase-helpers'
import type { Database } from '../../../../lib/database.types'
import toast from 'react-hot-toast'

type Barbero = Database['public']['Tables']['barberos']['Row']

// Definir explícitamente el tipo para actualización/inserción
interface BarberoUpdateData {
  nombre: string
  apellido: string
  email: string | null
  telefono: string | null
  descripcion: string | null
  instagram: string | null
  imagen_url: string | null
  slug: string
  porcentaje_comision: number
  especialidades: string[] | null
  activo: boolean
}

const barberoSchema = z.object({
  nombre: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  apellido: z.string().min(2, 'Apellido debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono: z.string().optional(),
  descripcion: z.string().optional(),
  instagram: z.string().optional(),
  imagen_url: z.string().url('URL de imagen inválida').optional().or(z.literal('')),
  porcentaje_comision: z.number().min(0).max(100),
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
  const [crearCuenta, setCrearCuenta] = useState(true) // Por defecto, crear cuenta
  const [passwordGenerada, setPasswordGenerada] = useState<string | null>(null)
  const [mostrarCredenciales, setMostrarCredenciales] = useState(false)
  const [especialidades, setEspecialidades] = useState<string[]>(barbero?.especialidades || [])
  const [nuevaEspecialidad, setNuevaEspecialidad] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const isEdit = !!barbero

  // Especialidades comunes predefinidas
  const especialidadesPredefinidas = [
    'Corte Clásico',
    'Corte Moderno',
    'Fade',
    'Degradado',
    'Barba',
    'Afeitado',
    'Coloración',
    'Diseño de Cejas',
    'Tratamiento Capilar',
    'Peinado'
  ]

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<BarberoFormData>({
    resolver: zodResolver(barberoSchema),
    defaultValues: barbero ? {
      nombre: barbero.nombre,
      apellido: barbero.apellido,
      email: barbero.email || '',
      telefono: barbero.telefono || '',
      descripcion: barbero.descripcion || '',
      instagram: barbero.instagram || '',
      imagen_url: barbero.imagen_url || '',
      porcentaje_comision: barbero.porcentaje_comision || 50,
      activo: barbero.activo
    } : {
      nombre: '',
      apellido: '',
      email: '',
      telefono: '',
      descripcion: '',
      instagram: '',
      imagen_url: '',
      porcentaje_comision: 50,
      activo: true
    }
  })

  const emailValue = watch('email')

  const agregarEspecialidad = (especialidad: string) => {
    const especialidadTrim = especialidad.trim()
    if (especialidadTrim && !especialidades.includes(especialidadTrim)) {
      setEspecialidades([...especialidades, especialidadTrim])
      setNuevaEspecialidad('')
    }
  }

  const eliminarEspecialidad = (especialidad: string) => {
    setEspecialidades(especialidades.filter(e => e !== especialidad))
  }

  const agregarEspecialidadPredefinida = (especialidad: string) => {
    if (!especialidades.includes(especialidad)) {
      setEspecialidades([...especialidades, especialidad])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      toast.error('Tipo de archivo no válido. Usa JPG, PNG, WEBP o GIF')
      return
    }

    // Validar tamaño (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande. Máximo 5MB')
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

  const removeImage = () => {
    setSelectedFile(null)
    setImagePreview(null)
  }

  const onSubmit = async (data: BarberoFormData) => {
    try {
      setLoading(true)

      // Subir imagen si hay una seleccionada
      let newImageUrl = data.imagen_url || null

      if (selectedFile) {
        try {
          setUploadingImage(true)
          toast.loading('Subiendo imagen...')

          // Si está editando y tiene imagen anterior, eliminarla
          if (isEdit && barbero?.imagen_url) {
            const oldPath = barbero.imagen_url.split('/').pop()
            if (oldPath) {
              await chamosSupabase.deleteBarberoFoto(oldPath)
            }
          }

          // Generar un ID temporal para la subida (será reemplazado si es nuevo barbero)
          const tempId = barbero?.id || `temp-${Date.now()}`
          const uploadResult = await chamosSupabase.uploadBarberoFoto(selectedFile, tempId)
          newImageUrl = uploadResult.publicUrl

          toast.dismiss()
          toast.success('Imagen subida exitosamente')
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError)
          toast.dismiss()
          toast.error('Error al subir la imagen')
          setUploadingImage(false)
          setLoading(false)
          return
        } finally {
          setUploadingImage(false)
        }
      }

      // Generar slug
      const slug = `${data.nombre.toLowerCase()}-${data.apellido.toLowerCase()}`
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

      const barberoData: BarberoUpdateData = {
        nombre: data.nombre,
        apellido: data.apellido,
        email: data.email || null,
        telefono: data.telefono || null,
        descripcion: data.descripcion || null,
        instagram: data.instagram || null,
        imagen_url: newImageUrl,
        slug: slug,
        porcentaje_comision: data.porcentaje_comision,
        especialidades: especialidades.length > 0 ? especialidades : null,
        activo: data.activo
      }

      if (isEdit && barbero) {
        // Editar barbero existente
        const { error } = await (supabase
          .from('barberos') as any)
          .update(barberoData)
          .eq('id', barbero.id)

        if (error) throw error
        toast.success('Barbero actualizado exitosamente')
        
        reset()
        setSelectedFile(null)
        setImagePreview(null)
        onSuccess()
        onClose()
      } else {
        // Crear nuevo barbero
        if (crearCuenta && data.email) {
          // Crear con cuenta de usuario
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) {
            throw new Error('No se pudo obtener el usuario admin')
          }

          const response = await fetch('/api/barberos/crear-con-cuenta', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              barberoData,
              crearCuenta: true,
              adminId: user.id
            })
          })

          const result = await response.json()

          if (!response.ok) {
            throw new Error(result.error || 'Error creando barbero')
          }

          console.log('✅ FRONTEND: Barbero y cuenta creados:', result)
          
          if (result.password) {
            setPasswordGenerada(result.password)
            setMostrarCredenciales(true)
            toast.success('Barbero y cuenta creados exitosamente')
          } else {
            toast.success('Barbero creado exitosamente')
            reset()
            onSuccess()
            onClose()
          }
        } else {
          // Crear solo barbero sin cuenta
          const { error } = await (supabase
            .from('barberos') as any)
            .insert(barberoData)

          if (error) throw error
          toast.success('Barbero creado exitosamente (sin cuenta de usuario)')
          
          reset()
          onSuccess()
          onClose()
        }
      }
    } catch (error: any) {
      console.error('Error saving barbero:', error)
      toast.error(error.message || 'Error al guardar barbero')
    } finally {
      setLoading(false)
    }
  }

  const handleCloseCredenciales = () => {
    setMostrarCredenciales(false)
    setPasswordGenerada(null)
    reset()
    onSuccess()
    onClose()
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
          <h4 className="text-lg font-medium mb-4" style={{ color: 'var(--accent-color)' }}>
            Información Personal
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                Nombre *
              </label>
              <input
                type="text"
                {...register('nombre')}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                style={{ 
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
              />
              {errors.nombre && (
                <p className="mt-1 text-sm text-red-600">{errors.nombre.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                Apellido *
              </label>
              <input
                type="text"
                {...register('apellido')}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                style={{ 
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
              />
              {errors.apellido && (
                <p className="mt-1 text-sm text-red-600">{errors.apellido.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                Email
              </label>
              <input
                type="email"
                {...register('email')}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                style={{ 
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                Teléfono
              </label>
              <input
                type="tel"
                {...register('telefono')}
                placeholder="+56 9 1234 5678"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                style={{ 
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
          </div>
        </div>

        {/* Información Profesional */}
        <div className="pb-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <h4 className="text-lg font-medium mb-4" style={{ color: 'var(--accent-color)' }}>
            Información Profesional
          </h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                Descripción
              </label>
              <textarea
                {...register('descripcion')}
                rows={3}
                placeholder="Breve descripción del barbero..."
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                style={{ 
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            {/* Especialidades */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                <i className="fas fa-scissors mr-2" style={{ color: 'var(--accent-color)' }}></i>
                Especialidades
              </label>
              
              {/* Especialidades seleccionadas */}
              {especialidades.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 p-3 rounded-md" style={{ 
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)'
                }}>
                  {especialidades.map((esp, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm"
                      style={{ 
                        backgroundColor: 'var(--accent-color)',
                        color: 'var(--bg-primary)'
                      }}
                    >
                      {esp}
                      <button
                        type="button"
                        onClick={() => eliminarEspecialidad(esp)}
                        className="hover:opacity-70"
                        style={{ transition: 'var(--transition)' }}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Especialidades predefinidas */}
              <div className="mb-3">
                <p className="text-xs mb-2" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                  Especialidades comunes:
                </p>
                <div className="flex flex-wrap gap-2">
                  {especialidadesPredefinidas.map((esp, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => agregarEspecialidadPredefinida(esp)}
                      disabled={especialidades.includes(esp)}
                      className="px-3 py-1 rounded-full text-sm border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ 
                        borderColor: especialidades.includes(esp) ? 'var(--accent-color)' : 'var(--border-color)',
                        backgroundColor: especialidades.includes(esp) ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                        color: 'var(--text-primary)'
                      }}
                    >
                      {especialidades.includes(esp) && <i className="fas fa-check mr-1"></i>}
                      {esp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Agregar especialidad personalizada */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nuevaEspecialidad}
                  onChange={(e) => setNuevaEspecialidad(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      agregarEspecialidad(nuevaEspecialidad)
                    }
                  }}
                  placeholder="Agregar especialidad personalizada..."
                  className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                  style={{ 
                    borderColor: 'var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)'
                  }}
                />
                <button
                  type="button"
                  onClick={() => agregarEspecialidad(nuevaEspecialidad)}
                  disabled={!nuevaEspecialidad.trim()}
                  className="px-4 py-2 rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ 
                    backgroundColor: 'var(--accent-color)',
                    color: 'var(--bg-primary)'
                  }}
                >
                  <i className="fas fa-plus"></i>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                Porcentaje de Comisión (%) *
              </label>
              <input
                type="number"
                {...register('porcentaje_comision', { valueAsNumber: true })}
                min="0"
                max="100"
                step="0.01"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                style={{ 
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
              />
              {errors.porcentaje_comision && (
                <p className="mt-1 text-sm text-red-600">{errors.porcentaje_comision.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Redes Sociales e Imagen */}
        <div className="pb-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <h4 className="text-lg font-medium mb-4" style={{ color: 'var(--accent-color)' }}>
            Redes e Imagen
          </h4>
          
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
                    backgroundColor: 'var(--bg-secondary)',
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
                  style={{ 
                    borderColor: 'var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            </div>

            {/* Foto de Perfil */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                <i className="fas fa-camera mr-2" style={{ color: 'var(--accent-color)' }}></i>
                Foto de Perfil
              </label>

              {/* Preview de imagen actual o nueva */}
              {(imagePreview || barbero?.imagen_url) && (
                <div className="mb-3 flex items-center gap-4">
                  <img
                    src={imagePreview || barbero?.imagen_url || ''}
                    alt="Preview"
                    className="w-24 h-24 rounded-full object-cover"
                    style={{ border: '2px solid var(--accent-color)' }}
                  />
                  {imagePreview && (
                    <button
                      type="button"
                      onClick={removeImage}
                      className="px-3 py-1 text-sm rounded-md"
                      style={{ 
                        backgroundColor: 'var(--bg-secondary)',
                        color: '#ef4444',
                        border: '1px solid #ef4444'
                      }}
                    >
                      <i className="fas fa-times mr-2"></i>
                      Quitar imagen
                    </button>
                  )}
                </div>
              )}

              {/* Área de subida de archivo */}
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all"
                style={{ 
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)'
                }}
                onClick={() => document.getElementById('file-input')?.click()}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-color)'
                  e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.05)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)'
                  e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'
                }}
              >
                <input
                  id="file-input"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <i 
                  className="fas fa-cloud-upload-alt text-4xl mb-3" 
                  style={{ color: 'var(--accent-color)', opacity: 0.6 }}
                ></i>
                <p className="text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                  <span style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>
                    Click para subir
                  </span>
                  {' '}o arrastra una imagen aquí
                </p>
                <p className="text-xs" style={{ color: 'var(--text-primary)', opacity: 0.6 }}>
                  JPG, PNG, WEBP o GIF (máx. 5MB)
                </p>
              </div>

              {/* Opción de URL manual (alternativa) */}
              <details className="mt-3">
                <summary 
                  className="text-xs cursor-pointer"
                  style={{ color: 'var(--text-primary)', opacity: 0.7 }}
                >
                  O usar URL de imagen externa
                </summary>
                <input
                  type="url"
                  {...register('imagen_url')}
                  placeholder="https://ejemplo.com/imagen.jpg"
                  className="w-full mt-2 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2"
                  style={{ 
                    borderColor: 'var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)'
                  }}
                />
                {errors.imagen_url && (
                  <p className="mt-1 text-sm text-red-600">{errors.imagen_url.message}</p>
                )}
              </details>
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

        {/* Opción de Crear Cuenta (solo en modo crear) */}
        {!isEdit && (
          <div className="p-4 rounded-lg" style={{ 
            backgroundColor: 'rgba(212, 175, 55, 0.1)',
            border: '1px solid var(--accent-color)'
          }}>
            <label className="flex items-start">
              <input
                type="checkbox"
                checked={crearCuenta}
                onChange={(e) => setCrearCuenta(e.target.checked)}
                disabled={!emailValue || loading}
                className="mt-1"
                style={{ accentColor: 'var(--accent-color)' }}
              />
              <div className="ml-3">
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  <i className="fas fa-user-plus mr-2" style={{ color: 'var(--accent-color)' }}></i>
                  Crear cuenta de usuario para este barbero
                </span>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                  {emailValue 
                    ? 'Se generará una contraseña segura automáticamente y se enviará al email del barbero'
                    : 'Debes ingresar un email válido para crear la cuenta de usuario'
                  }
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium rounded-md disabled:opacity-50"
            style={{ 
              color: 'var(--text-primary)', 
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              transition: 'var(--transition)'
            }}
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
          >
            {loading && <i className="fas fa-spinner fa-spin"></i>}
            {isEdit ? 'Actualizar' : 'Crear'} Barbero
            {!isEdit && crearCuenta && emailValue && ' + Cuenta'}
          </button>
        </div>
      </form>

      {/* Modal de Credenciales Generadas */}
      {mostrarCredenciales && passwordGenerada && (
        <Modal
          isOpen={mostrarCredenciales}
          onClose={handleCloseCredenciales}
          title="✅ Cuenta Creada Exitosamente"
          size="md"
        >
          <div className="space-y-6">
            <div className="p-4 rounded-lg text-center" style={{ 
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid #22c55e'
            }}>
              <i className="fas fa-check-circle text-5xl mb-3" style={{ color: '#22c55e' }}></i>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Barbero y cuenta de usuario creados
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                Se ha enviado un email con las credenciales al barbero
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Email de acceso
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={emailValue || ''}
                    readOnly
                    className="flex-1 px-3 py-2 border rounded-md"
                    style={{ 
                      borderColor: 'var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(emailValue || '')
                      toast.success('Email copiado')
                    }}
                    className="px-4 py-2 rounded-md"
                    style={{ 
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--accent-color)',
                      border: '1px solid var(--accent-color)'
                    }}
                  >
                    <i className="fas fa-copy"></i>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Contraseña temporal
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={passwordGenerada}
                    readOnly
                    className="flex-1 px-3 py-2 border rounded-md font-mono text-sm"
                    style={{ 
                      borderColor: 'var(--accent-color)',
                      backgroundColor: 'rgba(212, 175, 55, 0.1)',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(passwordGenerada)
                      toast.success('Contraseña copiada')
                    }}
                    className="px-4 py-2 rounded-md"
                    style={{ 
                      backgroundColor: 'var(--accent-color)',
                      color: 'var(--bg-primary)'
                    }}
                  >
                    <i className="fas fa-copy"></i>
                  </button>
                </div>
                <p className="mt-2 text-xs" style={{ color: 'var(--text-primary)', opacity: 0.6 }}>
                  El barbero podrá cambiar esta contraseña desde su panel de control
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg" style={{ 
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid #3b82f6'
            }}>
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                <i className="fas fa-info-circle mr-2" style={{ color: '#3b82f6' }}></i>
                <strong>Importante:</strong> Guarda estas credenciales o envíaselas al barbero. Podrá iniciar sesión en:
              </p>
              <p className="text-sm mt-2 font-mono" style={{ color: 'var(--accent-color)' }}>
                https://chamosbarber.com/chamos-acceso
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleCloseCredenciales}
                className="px-6 py-2 rounded-md font-medium"
                style={{ 
                  backgroundColor: 'var(--accent-color)',
                  color: 'var(--bg-primary)'
                }}
              >
                Entendido
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  )
}

export default BarberoModal

