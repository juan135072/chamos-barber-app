import { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import Logo from '@/components/shared/Logo'

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
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#080808] relative">
        {/* Background Orbs */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-[120px] pointer-events-none" />
        </div>

        <div className="max-w-md w-full rounded-3xl shadow-2xl shadow-black/50 p-8 text-center bg-white/[0.02] border border-white/10 backdrop-blur-xl relative z-10">
          <div className="mb-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-gold/10 flex items-center justify-center border border-gold/20 mb-6">
              <svg className="h-8 w-8 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-black mb-4 text-gold tracking-widest uppercase">¡Solicitud Enviada!</h2>
          <p className="mb-4 text-white/80">
            Tu solicitud de registro ha sido enviada exitosamente. Nuestro equipo la revisará pronto.
          </p>
          <p className="text-sm text-white/40">
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
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-[#080808] relative">
        {/* Background Orbs */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-2xl mx-auto relative z-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <Logo size="lg" withText={true} />
            </div>
            <h1 className="text-4xl font-black mb-2 text-white uppercase tracking-wider">
              Únete a <span className="text-gold">Nuestro Equipo</span>
            </h1>
            <p className="text-lg text-white/60">
              Completa el formulario para solicitar tu registro como barbero
            </p>
          </div>

          {/* Form */}
          <div className="rounded-3xl shadow-2xl p-8 bg-white/[0.02] border border-white/10 backdrop-blur-xl">
            {error && (
              <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                <i className="fas fa-exclamation-circle mr-2"></i>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nombre y Apellido */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold mb-2 text-white/80 uppercase tracking-wider">
                    Nombre <span className="text-gold">*</span>
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    required
                    value={formData.nombre}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-white/20 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                    placeholder="Juan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 text-white/80 uppercase tracking-wider">
                    Apellido <span className="text-gold">*</span>
                  </label>
                  <input
                    type="text"
                    name="apellido"
                    required
                    value={formData.apellido}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-white/20 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                    placeholder="Pérez"
                  />
                </div>
              </div>

              {/* Email y Teléfono */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold mb-2 text-white/80 uppercase tracking-wider">
                    Email <span className="text-gold">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-white/20 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                    placeholder="juan@ejemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 text-white/80 uppercase tracking-wider">
                    Teléfono <span className="text-gold">*</span>
                  </label>
                  <input
                    type="tel"
                    name="telefono"
                    required
                    value={formData.telefono}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-white/20 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                    placeholder="+56 9 1234 5678"
                  />
                </div>
              </div>

              {/* Especialidad y Experiencia */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold mb-2 text-white/80 uppercase tracking-wider">
                    Especialidad <span className="text-gold">*</span>
                  </label>
                  <select
                    name="especialidad"
                    required
                    value={formData.especialidad}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-[#080808] border border-white/10 text-white focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all appearance-none"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23d4af37' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                  >
                    <option value="Cortes Clásicos">Cortes Clásicos</option>
                    <option value="Barba y Afeitado">Barba y Afeitado</option>
                    <option value="Coloración">Coloración</option>
                    <option value="Diseños y Fade">Diseños y Fade</option>
                    <option value="Especialista en Niños">Especialista en Niños</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 text-white/80 uppercase tracking-wider">
                    Años de Experiencia <span className="text-gold">*</span>
                  </label>
                  <input
                    type="number"
                    name="experiencia_anos"
                    required
                    min="0"
                    max="50"
                    value={formData.experiencia_anos}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-white/20 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all"
                  />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-bold mb-2 text-white/80 uppercase tracking-wider">
                  Descripción / Sobre Ti
                </label>
                <textarea
                  name="descripcion"
                  rows={4}
                  value={formData.descripcion}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-white/40 focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all resize-none"
                  placeholder="Cuéntanos sobre tu experiencia, estilo de trabajo, certificaciones, etc."
                />
              </div>

              {/* Foto de Perfil */}
              <div>
                <label className="block text-sm font-bold mb-2 text-white/80 uppercase tracking-wider">
                  Foto de Perfil (opcional)
                </label>

                {/* Preview de imagen */}
                {imagePreview && (
                  <div className="mb-4 flex items-center gap-4 bg-white/[0.02] p-4 rounded-xl border border-white/5">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-20 h-20 rounded-full object-cover border-2 border-gold"
                    />
                    <button
                      type="button"
                      onClick={handleClearImage}
                      className="text-sm text-red-400 hover:text-red-300 transition-colors bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20"
                    >
                      <i className="fas fa-trash-alt mr-2"></i>
                      Quitar
                    </button>
                  </div>
                )}

                {/* Input de archivo con drag & drop */}
                <div
                  className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-white/20 rounded-xl transition-all hover:border-gold hover:bg-gold/5 group"
                >
                  <div className="space-y-2 text-center">
                    <div className="w-16 h-16 mx-auto rounded-full bg-white/[0.02] border border-white/10 flex items-center justify-center group-hover:bg-gold/10 group-hover:border-gold/30 transition-colors">
                      <i className="fas fa-cloud-upload-alt text-2xl text-gold/70 group-hover:text-gold transition-colors"></i>
                    </div>
                    <div className="flex justify-center text-sm text-white/80 mt-4">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer rounded-md font-medium text-gold hover:text-yellow-400 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-gold transition-colors"
                      >
                        <span>Subir un archivo</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                          className="sr-only"
                          onChange={handleFileSelect}
                        />
                      </label>
                      <p className="pl-1">o arrastra y suelta</p>
                    </div>
                    <p className="text-xs text-white/40">
                      PNG, JPG, WEBP, GIF hasta 5MB
                    </p>
                  </div>
                </div>

                {selectedFile && (
                  <p className="mt-3 text-sm text-gold flex items-center">
                    <i className="fas fa-check-circle mr-2"></i>
                    {selectedFile.name}
                  </p>
                )}
              </div>

              {/* Botones */}
              <div className="flex gap-4 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="flex-1 px-6 py-4 rounded-xl border border-white/10 text-white/80 bg-white/[0.02] hover:bg-white/[0.05] hover:text-white transition-all font-bold tracking-widest text-sm uppercase"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 relative group overflow-hidden rounded-xl bg-gradient-to-br from-gold to-[#a88647] p-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-full h-full relative bg-[#080808] px-6 py-4 rounded-xl transition-colors duration-300 group-hover:bg-transparent flex items-center justify-center gap-2">
                    {loading ? (
                      <i className="fas fa-spinner fa-spin text-gold group-hover:text-[#080808]"></i>
                    ) : (
                      <i className="fas fa-paper-plane text-gold group-hover:text-[#080808] transition-colors"></i>
                    )}
                    <span className="relative z-10 text-white font-black tracking-widest text-sm uppercase group-hover:text-[#080808] transition-colors">
                      {uploadingImage ? 'Subiendo imagen...' : loading ? 'Enviando...' : 'Enviar Solicitud'}
                    </span>
                  </div>
                </button>
              </div>
            </form>
          </div>

          {/* Info adicional */}
          <div className="mt-8 text-center text-sm text-white/60">
            <p>
              ¿Ya tienes una cuenta?{' '}
              <a href="/chamos-acceso" className="font-medium text-gold hover:text-white transition-colors border-b border-gold/30 pb-0.5">
                Inicia sesión aquí
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

