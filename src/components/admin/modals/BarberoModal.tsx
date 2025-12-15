import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Modal from '../shared/Modal'
import { supabase } from '../../../../lib/initSupabase'
import type { Database } from '../../../../lib/database.types'
import toast from 'react-hot-toast'

type Barbero = Database['public']['Tables']['barberos']['Row']
type BarberoInsert = Database['public']['Tables']['barberos']['Insert']

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

  const onSubmit = async (data: BarberoFormData) => {
    try {
      setLoading(true)

      // Generar slug
      const slug = `${data.nombre.toLowerCase()}-${data.apellido.toLowerCase()}`
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

      const barberoData = {
        nombre: data.nombre,
        apellido: data.apellido,
        email: data.email || null,
        telefono: data.telefono || null,
        descripcion: data.descripcion || null,
        instagram: data.instagram || null,
        imagen_url: data.imagen_url || null,
        slug: slug,
        porcentaje_comision: data.porcentaje_comision,
        especialidades: null as string[] | null, // Por ahora null, se puede agregar después
        activo: data.activo
      }

      if (isEdit && barbero) {
        // @ts-expect-error - Supabase types are overly strict, bypassing for functionality
        const { error } = await supabase
          .from('barberos')
          .update(barberoData)
          .eq('id', barbero.id)

        if (error) throw error
        toast.success('Barbero actualizado exitosamente')
      } else {
        // @ts-expect-error - Supabase types are overly strict, bypassing for functionality
        const { error } = await supabase
          .from('barberos')
          .insert(barberoData)

        if (error) throw error
        toast.success('Barbero creado exitosamente')
      }

      reset()
      onSuccess()
      onClose()
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

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                URL de Imagen
              </label>
              <input
                type="url"
                {...register('imagen_url')}
                placeholder="https://..."
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                style={{ 
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
              />
              {errors.imagen_url && (
                <p className="mt-1 text-sm text-red-600">{errors.imagen_url.message}</p>
              )}
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
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default BarberoModal
