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
  categoria: z.string().min(1, 'Categoría requerida'),
  imagen_url: z.string().url('URL inválida').optional().or(z.literal('')),
  popular: z.boolean(),
  orden_display: z.number().min(0),
  activo: z.boolean()
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
  const isEdit = !!servicio

  const { register, handleSubmit, formState: { errors } } = useForm<ServicioFormData>({
    resolver: zodResolver(servicioSchema),
    defaultValues: servicio ? {
      nombre: servicio.nombre,
      descripcion: servicio.descripcion || '',
      precio: servicio.precio,
      duracion_minutos: servicio.duracion_minutos,
      categoria: servicio.categoria,
      imagen_url: servicio.imagen_url || '',
      popular: servicio.popular,
      orden_display: servicio.orden_display,
      activo: servicio.activo
    } : {
      nombre: '',
      descripcion: '',
      precio: 15000,
      duracion_minutos: 30,
      categoria: 'cortes',
      imagen_url: '',
      popular: false,
      orden_display: 0,
      activo: true
    }
  })

  const onSubmit = async (data: ServicioFormData) => {
    try {
      setLoading(true)
      const servicioData: any = {
        ...data,
        descripcion: data.descripcion || null,
        imagen_url: data.imagen_url || null
      }

      if (isEdit && servicio) {
        await chamosSupabase.updateServicio(servicio.id, servicioData)
        toast.success('Servicio actualizado exitosamente')
      } else {
        await chamosSupabase.createServicio(servicioData)
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
            <select {...register('categoria')} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500">
              <option value="cortes">Cortes</option>
              <option value="barbas">Barbas</option>
              <option value="tintes">Tintes</option>
              <option value="tratamientos">Tratamientos</option>
              <option value="combos">Combos</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Orden *</label>
            <input type="number" {...register('orden_display', { valueAsNumber: true })} min="0" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">URL Imagen</label>
            <input type="url" {...register('imagen_url')} placeholder="https://ejemplo.com/imagen.jpg" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500" />
            {errors.imagen_url && <p className="mt-1 text-sm text-red-600">{errors.imagen_url.message}</p>}
          </div>

          <div className="flex items-center">
            <input type="checkbox" {...register('popular')} className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded" />
            <label className="ml-2 text-sm text-gray-700">Marcar como popular</label>
          </div>

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
