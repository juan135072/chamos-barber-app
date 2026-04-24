import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { chamosSupabase } from '@/lib/supabase-helpers'
import { useBarberoContext } from '@/context/BarberoContext'

export default function PerfilSection() {
  const { profile, refetchProfile, handleLogout } = useBarberoContext()

  const [saving, setSaving] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  if (!profile) return null

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      toast.error('Tipo de archivo no válido. Usa JPG, PNG, WEBP o GIF')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande. Máximo 5MB')
      return
    }

    setSelectedFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleClearImage = () => {
    setSelectedFile(null)
    setImagePreview(null)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!profile) return

    const form = e.currentTarget
    const telefono = (form.elements.namedItem('telefono') as HTMLInputElement).value
    const instagram = (form.elements.namedItem('instagram') as HTMLInputElement).value
    const descripcion = (form.elements.namedItem('descripcion') as HTMLTextAreaElement).value

    try {
      setSaving(true)
      let newImageUrl = profile.imagen_url

      if (selectedFile) {
        setUploadingImage(true)
        const toastId = toast.loading('Subiendo imagen...')
        try {
          if (profile.imagen_url) {
            const oldPath = profile.imagen_url.split('/').pop()
            if (oldPath) await chamosSupabase.deleteBarberoFoto(oldPath)
          }
          const uploadResult = await chamosSupabase.uploadBarberoFoto(selectedFile, profile.id)
          newImageUrl = uploadResult.publicUrl
          toast.dismiss(toastId)
          toast.success('Imagen subida exitosamente')
        } catch (uploadError) {
          toast.dismiss(toastId)
          toast.error('Error al subir la imagen')
          return
        } finally {
          setUploadingImage(false)
        }
      }

      await chamosSupabase.updateBarbero(profile.id, { telefono, instagram, descripcion, imagen_url: newImageUrl })

      setSelectedFile(null)
      setImagePreview(null)
      toast.success('Perfil actualizado exitosamente')
      refetchProfile()
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Error al actualizar el perfil')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      maxWidth: '800px', margin: '0 auto', background: 'var(--bg-secondary)',
      padding: '2rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)'
    }}>
      <h2 style={{ marginBottom: '2rem', color: 'var(--accent-color)' }}>
        <i className="fas fa-edit"></i> Actualizar Información
      </h2>

      <form onSubmit={handleSubmit}>
        {/* Información no editable */}
        <div style={{
          marginBottom: '2rem', padding: '1rem',
          background: 'rgba(212, 175, 55, 0.1)', borderRadius: 'var(--border-radius)',
          border: '1px solid rgba(212, 175, 55, 0.3)'
        }}>
          <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            <strong>Nombre:</strong> {profile.nombre} {profile.apellido}
          </p>
          <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            <strong>Email:</strong> {profile.email}
          </p>
          <p style={{ fontSize: '0.9rem', marginBottom: '0' }}>
            <strong>Especialidades:</strong> {profile.especialidades?.join(', ') || 'N/A'}
          </p>
          <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', opacity: 0.7 }}>
            <i className="fas fa-info-circle"></i> Contacta al administrador para cambiar estos datos
          </p>
        </div>

        {/* Foto de Perfil */}
        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label className="form-label" style={{ display: 'block', marginBottom: '0.75rem', color: 'var(--text-primary)', opacity: 0.9 }}>
            <i className="fas fa-camera"></i> Foto de Perfil
          </label>
          {(imagePreview || profile.imagen_url) && (
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img
                src={imagePreview || profile.imagen_url}
                alt="Preview"
                style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent-color)' }}
              />
              {imagePreview && (
                <button type="button" onClick={handleClearImage}
                  style={{ padding: '0.5rem 1rem', background: 'rgba(220, 38, 38, 0.15)', color: '#fca5a5', border: '1px solid rgba(220, 38, 38, 0.3)', borderRadius: 'var(--border-radius)', cursor: 'pointer' }}
                >
                  <i className="fas fa-times"></i> Quitar nueva imagen
                </button>
              )}
            </div>
          )}
          <div style={{ border: '2px dashed var(--border-color)', borderRadius: 'var(--border-radius)', padding: '2rem', textAlign: 'center', cursor: 'pointer', backgroundColor: 'rgba(212, 175, 55, 0.03)' }}>
            <i className="fas fa-cloud-upload-alt" style={{ fontSize: '3rem', color: 'var(--accent-color)', marginBottom: '1rem', opacity: 0.7, display: 'block' }}></i>
            <p style={{ marginBottom: '0.5rem', color: 'var(--text-primary)', opacity: 0.9 }}>
              Arrastra una imagen aquí o{' '}
              <label style={{ color: 'var(--accent-color)', cursor: 'pointer', textDecoration: 'underline' }}>
                selecciona un archivo
                <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/gif" onChange={handleFileSelect} style={{ display: 'none' }} />
              </label>
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', opacity: 0.6, margin: 0 }}>PNG, JPG, WEBP, GIF hasta 5MB</p>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label"><i className="fas fa-phone"></i> Teléfono / WhatsApp</label>
          <input name="telefono" type="tel" className="form-input" defaultValue={profile.telefono || ''} placeholder="+56 9 1234 5678" />
        </div>

        <div className="form-group">
          <label className="form-label"><i className="fab fa-instagram"></i> Instagram</label>
          <input name="instagram" type="text" className="form-input" defaultValue={profile.instagram || ''} placeholder="@tu_instagram" />
          <small style={{ opacity: 0.7, fontSize: '0.85rem' }}>Usa @ o la URL completa de tu perfil</small>
        </div>

        <div className="form-group">
          <label className="form-label"><i className="fas fa-align-left"></i> Descripción / Biografía</label>
          <textarea name="descripcion" className="form-input" defaultValue={profile.descripcion || ''} rows={5}
            placeholder="Cuéntale a tus clientes sobre ti, tu experiencia y estilo..." style={{ resize: 'vertical' }}
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving || uploadingImage} style={{ width: '100%', marginTop: '1rem' }}>
          {uploadingImage ? <><div className="spinner"></div>Subiendo imagen...</>
            : saving ? <><div className="spinner"></div>Guardando...</>
              : <><i className="fas fa-save"></i> Guardar Cambios</>}
        </button>

        <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)' }}>
          <button type="button" onClick={handleLogout} className="btn"
            style={{ width: '100%', backgroundColor: 'rgba(220, 38, 38, 0.1)', color: '#EF4444', border: '1px solid rgba(220, 38, 38, 0.3)' }}
          >
            <i className="fas fa-sign-out-alt mr-2"></i> Cerrar Sesión Corriente
          </button>
        </div>
      </form>
    </div>
  )
}
