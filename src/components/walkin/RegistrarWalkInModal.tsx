/**
 * =====================================================
 * 📝 MODAL - REGISTRAR WALK-IN CLIENT
 * =====================================================
 * Modal para registrar clientes que llegan sin reserva
 */

'use client'

import { useState } from 'react'
import { X, UserPlus, Phone, Mail, User, FileText } from 'lucide-react'
import { createWalkInClient, type CreateWalkInClientParams } from '@/lib/supabase-walkin'

interface RegistrarWalkInModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function RegistrarWalkInModal({
  isOpen,
  onClose,
  onSuccess
}: RegistrarWalkInModalProps) {
  const [formData, setFormData] = useState<CreateWalkInClientParams>({
    nombre: '',
    telefono: '',
    email: '',
    notas: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validación básica
    if (!formData.nombre.trim() || !formData.telefono.trim()) {
      setError('Nombre y teléfono son obligatorios')
      return
    }

    // Validar formato de teléfono (simple)
    const telefonoClean = formData.telefono.replace(/\D/g, '')
    if (telefonoClean.length < 8) {
      setError('El teléfono debe tener al menos 8 dígitos')
      return
    }

    // Validar email si existe
    if (formData.email && !formData.email.includes('@')) {
      setError('El email no es válido')
      return
    }

    try {
      setLoading(true)
      await createWalkInClient({
        ...formData,
        telefono: telefonoClean
      })

      // Limpiar formulario
      setFormData({
        nombre: '',
        telefono: '',
        email: '',
        notas: ''
      })

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Error creando walk-in client:', err)
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Error al registrar el cliente')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setFormData({
        nombre: '',
        telefono: '',
        email: '',
        notas: ''
      })
      setError(null)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-md rounded-lg shadow-xl my-8"
        style={{ backgroundColor: 'var(--bg-secondary)', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-6 border-b"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: 'var(--accent-color)' + '20' }}
            >
              <UserPlus
                className="w-6 h-6"
                style={{ color: 'var(--accent-color)' }}
              />
            </div>
            <div>
              <h2
                className="text-xl font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                Registrar Cliente Walk-In
              </h2>
              <p
                className="text-sm"
                style={{ color: 'var(--text-primary)', opacity: 0.7 }}
              >
                Cliente que llegó sin reserva
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 rounded-lg hover:opacity-70 transition-opacity"
            style={{ backgroundColor: 'var(--bg-primary)' }}
          >
            <X className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div
              className="p-3 rounded-lg border"
              style={{
                backgroundColor: '#ef444420',
                borderColor: '#ef4444',
                color: '#ef4444'
              }}
            >
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Nombre */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              <User className="inline w-4 h-4 mr-2" />
              Nombre Completo *
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Ej: Juan Pérez"
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
              disabled={loading}
              required
            />
          </div>

          {/* Teléfono */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              <Phone className="inline w-4 h-4 mr-2" />
              Teléfono *
            </label>
            <input
              type="tel"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              placeholder="Ej: +56912345678"
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
              disabled={loading}
              required
            />
            <p
              className="text-xs mt-1"
              style={{ color: 'var(--text-primary)', opacity: 0.6 }}
            >
              Formato: +56912345678 o 912345678
            </p>
          </div>

          {/* Email (Opcional) */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              <Mail className="inline w-4 h-4 mr-2" />
              Email (opcional)
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Ej: juan@ejemplo.com"
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
              disabled={loading}
            />
          </div>

          {/* Notas (Opcional) */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--text-primary)' }}
            >
              <FileText className="inline w-4 h-4 mr-2" />
              Notas (opcional)
            </label>
            <textarea
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              placeholder="Ej: Cliente nuevo, prefiere corte fade..."
              rows={3}
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
              disabled={loading}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg border transition-opacity hover:opacity-70"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'var(--accent-color)',
                color: 'var(--bg-primary)'
              }}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Registrar Cliente
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
