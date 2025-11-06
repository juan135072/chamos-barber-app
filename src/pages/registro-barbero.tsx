import { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/initSupabase'

export default function RegistroBarbero() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    especialidad: 'Cortes Clásicos',
    descripcion: '',
    experiencia_anos: 1,
    imagen_url: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'experiencia_anos' ? parseInt(value) || 0 : value
    }))
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      setError('Tipo de archivo no válido. Solo se permiten imágenes (JPG, PNG, WEBP, GIF)')
      return
    }

    // Validar tamaño (5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      setError('La imagen es muy grande. Tamaño máximo: 5MB')
      return
    }

    setSelectedFile(file)
    setError('')

    // Crear preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleClearImage = () => {
    setSelectedFile(null)
    setImagePreview(null)
    setFormData(prev => ({ ...prev, imagen_url: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      let imagenUrl = formData.imagen_url

      // Si hay archivo seleccionado, subirlo primero
      if (selectedFile) {
        setUploadingImage(true)

        // Generar nombre único para el archivo
        const fileExt = selectedFile.name.split('.').pop()
        const fileName = `solicitud-${Date.now()}.${fileExt}`
        const filePath = fileName

        // Subir archivo a Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('barberos-fotos')
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          throw new Error(`Error al subir imagen: ${uploadError.message}`)
        }

        // Obtener URL pública
        const { data: urlData } = supabase.storage
          .from('barberos-fotos')
          .getPublicUrl(uploadData.path)

        imagenUrl = urlData.publicUrl
        setUploadingImage(false)
      }

      // Enviar solicitud con la URL de la imagen
      const response = await fetch('/api/solicitudes/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          imagen_url: imagenUrl
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar solicitud')
      }

      setSuccess(true)
      setTimeout(() => router.push('/'), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
      setUploadingImage(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="max-w-md w-full rounded-lg shadow-lg p-8 text-center" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <div className="mb-4">
            <svg className="mx-auto h-16 w-16 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--accent-color)' }}>¡Solicitud Enviada!</h2>
          <p className="mb-4" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
            Tu solicitud de registro ha sido enviada exitosamente. Nuestro equipo la revisará pronto.
          </p>
          <p className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.6 }}>
            Serás redirigido a la página principal en 3 segundos...
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Registro de Barbero - Chamos Barber</title>
      </Head>

      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--accent-color)' }}>
              Únete a Nuestro Equipo
            </h1>
            <p className="text-lg" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
              Completa el formulario para solicitar tu registro como barbero
            </p>
          </div>

          {/* Form */}
          <div className="rounded-lg shadow-lg p-8" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            {error && (
              <div className="mb-6 px-4 py-3 rounded" style={{ backgroundColor: 'rgba(220, 38, 38, 0.15)', border: '1px solid rgba(220, 38, 38, 0.3)', color: '#fca5a5' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nombre y Apellido */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    Nombre *
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    required
                    value={formData.nombre}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg"
                    placeholder="Juan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    Apellido *
                  </label>
                  <input
                    type="text"
                    name="apellido"
                    required
                    value={formData.apellido}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg"
                    placeholder="Pérez"
                  />
                </div>
              </div>

              {/* Email y Teléfono */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg"
                    placeholder="juan@ejemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    name="telefono"
                    required
                    value={formData.telefono}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg"
                    placeholder="+56 9 1234 5678"
                  />
                </div>
              </div>

              {/* Especialidad y Experiencia */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    Especialidad *
                  </label>
                  <select
                    name="especialidad"
                    required
                    value={formData.especialidad}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg"
                  >
                    <option value="Cortes Clásicos">Cortes Clásicos</option>
                    <option value="Barba y Afeitado">Barba y Afeitado</option>
                    <option value="Coloración">Coloración</option>
                    <option value="Diseños y Fade">Diseños y Fade</option>
                    <option value="Especialista en Niños">Especialista en Niños</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    Años de Experiencia *
                  </label>
                  <input
                    type="number"
                    name="experiencia_anos"
                    required
                    min="0"
                    max="50"
                    value={formData.experiencia_anos}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg"
                  />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Descripción / Sobre Ti
                </label>
                <textarea
                  name="descripcion"
                  rows={4}
                  value={formData.descripcion}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg"
                  placeholder="Cuéntanos sobre tu experiencia, estilo de trabajo, certificaciones, etc."
                />
              </div>

              {/* Foto de Perfil */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Foto de Perfil (opcional)
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

                {/* Input de archivo con drag & drop */}
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
                  <p className="mt-2 text-sm text-green-400">
                    <i className="fas fa-check-circle mr-1"></i>
                    Archivo seleccionado: {selectedFile.name}
                  </p>
                )}
              </div>

              {/* Botones */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="flex-1 px-6 py-3 rounded-lg transition"
                  style={{ 
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    backgroundColor: 'var(--bg-primary)'
                  }}
                  onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.1)')}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: 'var(--accent-color)',
                    color: 'var(--bg-primary)'
                  }}
                  onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#B8941F')}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-color)'}
                >
                  {loading && <i className="fas fa-spinner fa-spin"></i>}
                  {uploadingImage ? 'Subiendo imagen...' : loading ? 'Enviando...' : 'Enviar Solicitud'}
                </button>
              </div>
            </form>
          </div>

          {/* Info adicional */}
          <div className="mt-8 text-center text-sm" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
            <p>
              ¿Ya tienes una cuenta?{' '}
              <a href="/login" className="font-medium transition-colors" style={{ color: 'var(--accent-color)' }} onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'} onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>
                Inicia sesión aquí
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
