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
  const isEdit = !!barbero

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
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

  const onSubmit = async (data: BarberoFormData) => {
    try {
      setLoading(true)

      const barberoData: BarberoInsert = {
        nombre: data.nombre,
        apellido: data.apellido,
        email: data.email || null,
        telefono: data.telefono || null,
        especialidad: data.especialidad,
        descripcion: data.descripcion || null,
        instagram: data.instagram || null,
        imagen_url: data.imagen_url || null,
        experiencia_anos: data.experiencia_anos,
        calificacion: data.calificacion,
        precio_base: data.precio_base,
        orden_display: data.orden_display,
        activo: data.activo
      }

      if (isEdit && barbero) {
        await chamosSupabase.updateBarbero(barbero.id, barberoData)
        toast.success('Barbero actualizado exitosamente')
      } else {
        await chamosSupabase.createBarbero(barberoData)
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
        <div className="border-b border-gray-200 pb-4">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Información Personal</h4>
          
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
        <div className="border-b border-gray-200 pb-4">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Información Profesional</h4>
          
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
        <div className="border-b border-gray-200 pb-4">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Redes e Imagen</h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instagram (usuario)
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  @
                </span>
                <input
                  type="text"
                  {...register('instagram')}
                  placeholder="username"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL de Imagen de Perfil
              </label>
              <input
                type="url"
                {...register('imagen_url')}
                placeholder="https://ejemplo.com/imagen.jpg"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              {errors.imagen_url && (
                <p className="mt-1 text-sm text-red-600">{errors.imagen_url.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                URL de la imagen de perfil del barbero
              </p>
            </div>
          </div>
        </div>

        {/* Estado */}
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              {...register('activo')}
              className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">
              Barbero Activo
            </span>
          </label>
          <p className="mt-1 text-xs text-gray-500">
            Los barberos inactivos no aparecerán en el sistema de reservas
          </p>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2"
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
