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
    <div className="max-w-4xl mx-auto bg-white/[0.02] border border-white/10 p-8 rounded-3xl backdrop-blur-xl mt-4">
      <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-8 flex items-center gap-3">
        <i className="fas fa-edit text-gold"></i> Actualizar Información
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información no editable */}
        <div className="p-6 bg-gold/10 border border-gold/20 rounded-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-white/50 uppercase tracking-widest mb-1">Nombre</p>
              <p className="font-bold text-white text-lg">{profile.nombre} {profile.apellido}</p>
            </div>
            <div>
              <p className="text-xs text-white/50 uppercase tracking-widest mb-1">Email</p>
              <p className="font-bold text-white text-lg">{profile.email}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-white/50 uppercase tracking-widest mb-1">Especialidades</p>
              <p className="font-bold text-white text-lg">
                {profile.especialidades?.join(', ') || 'N/A'}
              </p>
            </div>
          </div>
          <p className="text-xs text-gold/80 mt-4 flex items-center gap-2 font-medium">
            <i className="fas fa-info-circle"></i> Contacta al administrador para cambiar estos datos base
          </p>
        </div>

        {/* Foto de Perfil */}
        <div>
          <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-3">
            <i className="fas fa-camera text-gold mr-2"></i> Foto de Perfil
          </label>
          {(imagePreview || profile.imagen_url) && (
            <div className="mb-4 flex items-center gap-4">
              <div className="relative w-32 h-32 rounded-full p-1 bg-gradient-to-br from-gold to-[#a88647]">
                <img
                  src={imagePreview || profile.imagen_url}
                  alt="Preview"
                  className="w-full h-full rounded-full object-cover border-4 border-[#080808]"
                />
              </div>
              {imagePreview && (
                <button 
                  type="button" 
                  onClick={handleClearImage}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
                >
                  <i className="fas fa-times"></i> Quitar nueva imagen
                </button>
              )}
            </div>
          )}
          <div className="border-2 border-dashed border-white/20 rounded-2xl p-8 text-center cursor-pointer bg-white/[0.01] hover:bg-white/[0.03] transition-colors group">
            <i className="fas fa-cloud-upload-alt text-4xl text-gold mb-4 opacity-70 group-hover:scale-110 transition-transform"></i>
            <p className="text-white/90 mb-2">
              Arrastra una imagen aquí o{' '}
              <label className="text-gold cursor-pointer hover:underline font-bold">
                selecciona un archivo
                <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/gif" onChange={handleFileSelect} className="hidden" />
              </label>
            </p>
            <p className="text-xs text-white/50 font-medium">PNG, JPG, WEBP, GIF hasta 5MB</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-3">
              <i className="fas fa-phone text-gold mr-2"></i> Teléfono / WhatsApp
            </label>
            <input 
              name="telefono" 
              type="tel" 
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-gold transition-colors" 
              defaultValue={profile.telefono || ''} 
              placeholder="+56 9 1234 5678" 
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-3">
              <i className="fab fa-instagram text-gold mr-2"></i> Instagram
            </label>
            <input 
              name="instagram" 
              type="text" 
              className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-gold transition-colors" 
              defaultValue={profile.instagram || ''} 
              placeholder="@tu_instagram" 
            />
            <small className="text-xs text-white/40 mt-2 block">Usa @ o la URL completa de tu perfil</small>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-3">
            <i className="fas fa-align-left text-gold mr-2"></i> Descripción / Biografía
          </label>
          <textarea 
            name="descripcion" 
            className="w-full px-4 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-gold transition-colors resize-y min-h-[120px]" 
            defaultValue={profile.descripcion || ''} 
            placeholder="Cuéntale a tus clientes sobre ti, tu experiencia y estilo..."
          />
        </div>

        <button 
          type="submit" 
          disabled={saving || uploadingImage} 
          className="w-full relative group inline-flex overflow-hidden rounded-xl bg-gold/20 p-[1px]"
        >
          <div className="w-full relative bg-gradient-to-br from-gold to-[#a88647] px-6 py-4 rounded-xl transition-all duration-300 hover:brightness-110 flex items-center justify-center gap-2">
            {uploadingImage ? (
              <><i className="fas fa-circle-notch fa-spin text-[#080808]"></i><span className="text-[#080808] font-black uppercase tracking-wider">Subiendo imagen...</span></>
            ) : saving ? (
              <><i className="fas fa-circle-notch fa-spin text-[#080808]"></i><span className="text-[#080808] font-black uppercase tracking-wider">Guardando...</span></>
            ) : (
              <><i className="fas fa-save text-[#080808]"></i><span className="text-[#080808] font-black uppercase tracking-wider">Guardar Cambios</span></>
            )}
          </div>
        </button>

        <div className="mt-8 pt-8 border-t border-white/10">
          <button 
            type="button" 
            onClick={handleLogout} 
            className="w-full px-6 py-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
          >
            <i className="fas fa-sign-out-alt"></i> Cerrar Sesión
          </button>
        </div>
      </form>
    </div>
  )
}
