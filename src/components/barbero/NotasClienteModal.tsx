import { useState, useEffect } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import type { Database } from '../../../lib/database.types'
import { chamosSupabase } from '../../../lib/supabase-helpers'
import toast from 'react-hot-toast'

type NotaCliente = Database['public']['Tables']['notas_clientes']['Row']

interface NotasClienteModalProps {
  isOpen: boolean
  onClose: () => void
  barberoId: string
  clienteEmail: string
  clienteNombre: string
  clienteTelefono?: string
  citaId?: string
  onNotaSaved?: () => void
}

export default function NotasClienteModal({
  isOpen,
  onClose,
  barberoId,
  clienteEmail,
  clienteNombre,
  clienteTelefono,
  citaId,
  onNotaSaved
}: NotasClienteModalProps) {
  const supabase = useSupabaseClient<Database>()
  const [notas, setNotas] = useState<NotaCliente[]>([])
  const [nuevaNota, setNuevaNota] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingNotas, setLoadingNotas] = useState(true)
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const fileInputRef = useState<{ current: HTMLInputElement | null }>({ current: null })[0]

  // Tags predefinidos
  const tagsDisponibles = [
    'Corte especial',
    'Alergia',
    'Preferencia de estilo',
    'Producto recomendado',
    'Cliente VIP',
    'Primera visita',
    'Cliente frecuente',
    'Solicitud especial'
  ]

  useEffect(() => {
    if (isOpen && clienteEmail) {
      loadNotasCliente()
    }
  }, [isOpen, clienteEmail])

  const loadNotasCliente = async () => {
    try {
      setLoadingNotas(true)
      const { data, error } = await supabase
        .from('notas_clientes')
        .select('*')
        .eq('barbero_id', barberoId)
        .eq('cliente_email', clienteEmail)
        .order('created_at', { ascending: false })

      if (error) throw error
      setNotas(data || [])
    } catch (error) {
      console.error('Error loading notas:', error)
      toast.error('Error al cargar notas del cliente')
    } finally {
      setLoadingNotas(false)
    }
  }

  const handleSaveNota = async () => {
    if (!nuevaNota.trim()) {
      toast.error('Por favor escribe una nota')
      return
    }

    try {
      setLoading(true)
      let fotoUrl: string | null = null

      // Subir foto si existe
      if (fotoFile && citaId) {
        try {
          const result = await chamosSupabase.uploadCorteFoto(fotoFile, citaId)
          fotoUrl = result.publicUrl
        } catch (uploadError) {
          console.error('Error uploading photo:', uploadError)
          toast.error('Error al subir la foto, pero se guardará la nota')
        }
      } else if (fotoFile) {
        // Si no hay citaId, usamos un "dummy" o generamos nombre unico
        const dummyId = `nota-${Date.now()}`
        try {
          const result = await chamosSupabase.uploadCorteFoto(fotoFile, dummyId)
          fotoUrl = result.publicUrl
        } catch (uploadError) {
          console.error('Error uploading photo:', uploadError)
        }
      }

      const { error } = await supabase
        .from('notas_clientes')
        .insert({
          barbero_id: barberoId,
          cliente_email: clienteEmail,
          cliente_nombre: clienteNombre,
          cliente_telefono: clienteTelefono || null,
          notas: nuevaNota.trim(),
          cita_id: citaId || null,
          tags: tags.length > 0 ? tags : null,
          imagen_url: fotoUrl
        })

      if (error) throw error

      toast.success('Nota guardada exitosamente')
      setNuevaNota('')
      setTags([])
      setTagInput('')
      setFotoFile(null)
      setFotoPreview(null)
      await loadNotasCliente()
      onNotaSaved?.()
    } catch (error) {
      console.error('Error saving nota:', error)
      toast.error('Error al guardar la nota')
    } finally {
      setLoading(false)
    }
  }

  const handleAddTag = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag])
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  const handleAddCustomTag = () => {
    const trimmedTag = tagInput.trim()
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag])
      setTagInput('')
    }
  }

  const handleDeleteNota = async (notaId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta nota?')) return

    try {
      const { error } = await supabase
        .from('notas_clientes')
        .delete()
        .eq('id', notaId)

      if (error) throw error

      toast.success('Nota eliminada')
      await loadNotasCliente()
    } catch (error) {
      console.error('Error deleting nota:', error)
      toast.error('Error al eliminar la nota')
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '800px',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: 'var(--accent-color)',
              marginBottom: '4px'
            }}>
              <i className="fas fa-sticky-note" style={{ marginRight: '8px' }}></i>
              Notas del Cliente
            </h2>
            <p style={{ color: 'var(--text-primary)', opacity: 0.7, fontSize: '14px' }}>
              {clienteNombre} • {clienteEmail}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '24px',
              cursor: 'pointer',
              opacity: 0.7,
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {/* Nueva Nota */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '12px'
            }}>
              <i className="fas fa-plus-circle" style={{ marginRight: '8px', color: 'var(--accent-color)' }}></i>
              Agregar Nueva Nota
            </h3>

            <textarea
              value={nuevaNota}
              onChange={(e) => setNuevaNota(e.target.value)}
              placeholder="Ej: Cliente prefiere corte fade, usa barba corta, alérgico a productos con alcohol..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '14px',
                resize: 'vertical',
                marginBottom: '12px'
              }}
            />

            {/* Foto Upload */}
            <div style={{ marginBottom: '16px' }}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setFotoFile(file)
                    const reader = new FileReader()
                    reader.onloadend = () => {
                      setFotoPreview(reader.result as string)
                    }
                    reader.readAsDataURL(file)
                  }
                }}
                style={{ display: 'none' }}
                id="foto-upload-nota"
              />
              <button
                onClick={() => document.getElementById('foto-upload-nota')?.click()}
                style={{
                  padding: '8px 16px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  width: '100%',
                  justifyContent: 'center'
                }}
              >
                <i className="fas fa-camera"></i>
                {fotoFile ? 'Cambiar Foto' : 'Agregar Foto'}
              </button>
              {fotoPreview && (
                <div style={{ marginTop: '8px', position: 'relative', width: 'fit-content' }}>
                  <img
                    src={fotoPreview}
                    alt="Preview"
                    style={{
                      width: '100%',
                      maxWidth: '200px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)'
                    }}
                  />
                  <button
                    onClick={() => {
                      setFotoFile(null)
                      setFotoPreview(null)
                    }}
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      background: '#EF4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <i className="fas fa-times" style={{ fontSize: '12px' }}></i>
                  </button>
                </div>
              )}
            </div>

            {/* Tags */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: 'var(--text-primary)',
                opacity: 0.9,
                marginBottom: '8px'
              }}>
                <i className="fas fa-tags" style={{ marginRight: '6px' }}></i>
                Etiquetas
              </label>

              {/* Tags seleccionados */}
              {tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 12px',
                        background: 'rgba(212, 175, 55, 0.2)',
                        border: '1px solid rgba(212, 175, 55, 0.3)',
                        borderRadius: '16px',
                        fontSize: '12px',
                        color: 'var(--accent-color)',
                        fontWeight: '500'
                      }}
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--accent-color)',
                          cursor: 'pointer',
                          padding: 0,
                          fontSize: '14px'
                        }}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Tags predefinidos */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                {tagsDisponibles.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleAddTag(tag)}
                    disabled={tags.includes(tag)}
                    style={{
                      padding: '4px 12px',
                      background: tags.includes(tag) ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '16px',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                      opacity: tags.includes(tag) ? 0.5 : 1,
                      cursor: tags.includes(tag) ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Tag personalizado */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCustomTag()}
                  placeholder="Etiqueta personalizada..."
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '13px'
                  }}
                />
                <button
                  onClick={handleAddCustomTag}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  <i className="fas fa-plus"></i>
                </button>
              </div>
            </div>

            <button
              onClick={handleSaveNota}
              disabled={loading || !nuevaNota.trim()}
              style={{
                width: '100%',
                padding: '12px',
                background: loading || !nuevaNota.trim() ? 'var(--bg-tertiary)' : 'var(--accent-color)',
                color: loading || !nuevaNota.trim() ? 'var(--text-primary)' : 'var(--bg-primary)',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading || !nuevaNota.trim() ? 'not-allowed' : 'pointer',
                opacity: loading || !nuevaNota.trim() ? 0.5 : 1,
                transition: 'all 0.2s'
              }}
            >
              {loading ? (
                <><i className="fas fa-circle-notch fa-spin" style={{ marginRight: '8px' }}></i>Guardando...</>
              ) : (
                <><i className="fas fa-save" style={{ marginRight: '8px' }}></i>Guardar Nota</>
              )}
            </button>
          </div>

          {/* Historial de Notas */}
          <div>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '16px'
            }}>
              <i className="fas fa-history" style={{ marginRight: '8px', color: 'var(--accent-color)' }}></i>
              Historial de Notas ({notas.length})
            </h3>

            {loadingNotas ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div className="spinner"></div>
                <p style={{ color: 'var(--text-primary)', opacity: 0.7, marginTop: '16px' }}>
                  Cargando notas...
                </p>
              </div>
            ) : notas.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                background: 'var(--bg-primary)',
                borderRadius: '8px',
                border: '1px solid var(--border-color)'
              }}>
                <i className="fas fa-clipboard" style={{
                  fontSize: '48px',
                  color: 'var(--text-primary)',
                  opacity: 0.3,
                  marginBottom: '16px',
                  display: 'block'
                }}></i>
                <p style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                  No hay notas guardadas para este cliente
                </p>
                <p style={{ color: 'var(--text-primary)', opacity: 0.5, fontSize: '14px', marginTop: '8px' }}>
                  Agrega tu primera nota arriba
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {notas.map((nota) => (
                  <div
                    key={nota.id}
                    style={{
                      padding: '16px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      position: 'relative'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '8px'
                    }}>
                      <span style={{
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                        opacity: 0.6
                      }}>
                        <i className="fas fa-calendar-alt" style={{ marginRight: '4px' }}></i>
                        {new Date(nota.created_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <button
                        onClick={() => handleDeleteNota(nota.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#EF4444',
                          cursor: 'pointer',
                          fontSize: '14px',
                          padding: '2px 8px'
                        }}
                        title="Eliminar nota"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>

                    <p style={{
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      lineHeight: '1.6',
                      marginBottom: (nota.tags && nota.tags.length > 0) || nota.imagen_url ? '12px' : 0
                    }}>
                      {nota.notas}
                    </p>

                    {nota.imagen_url && (
                      <div style={{ marginBottom: '12px' }}>
                        <img
                          src={nota.imagen_url}
                          alt="Foto del corte"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '200px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            cursor: 'pointer'
                          }}
                          onClick={() => window.open(nota.imagen_url!, '_blank')}
                        />
                      </div>
                    )}

                    {nota.tags && nota.tags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {nota.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              background: 'rgba(212, 175, 55, 0.15)',
                              border: '1px solid rgba(212, 175, 55, 0.25)',
                              borderRadius: '12px',
                              fontSize: '11px',
                              color: 'var(--accent-color)',
                              fontWeight: '500'
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
