import { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'

export default function RegistroBarbero() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/solicitudes/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
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
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-4">
            <svg className="mx-auto h-16 w-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">¡Solicitud Enviada!</h2>
          <p className="text-gray-600 mb-4">
            Tu solicitud de registro ha sido enviada exitosamente. Nuestro equipo la revisará pronto.
          </p>
          <p className="text-sm text-gray-500">
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

      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Únete a Nuestro Equipo
            </h1>
            <p className="text-lg text-gray-600">
              Completa el formulario para solicitar tu registro como barbero
            </p>
          </div>

          {/* Form */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nombre y Apellido */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    required
                    value={formData.nombre}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Juan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Apellido *
                  </label>
                  <input
                    type="text"
                    name="apellido"
                    required
                    value={formData.apellido}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Pérez"
                  />
                </div>
              </div>

              {/* Email y Teléfono */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="juan@ejemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    name="telefono"
                    required
                    value={formData.telefono}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+56 9 1234 5678"
                  />
                </div>
              </div>

              {/* Especialidad y Experiencia */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Especialidad *
                  </label>
                  <select
                    name="especialidad"
                    required
                    value={formData.especialidad}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Cortes Clásicos">Cortes Clásicos</option>
                    <option value="Barba y Afeitado">Barba y Afeitado</option>
                    <option value="Coloración">Coloración</option>
                    <option value="Diseños y Fade">Diseños y Fade</option>
                    <option value="Especialista en Niños">Especialista en Niños</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción / Sobre Ti
                </label>
                <textarea
                  name="descripcion"
                  rows={4}
                  value={formData.descripcion}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Cuéntanos sobre tu experiencia, estilo de trabajo, certificaciones, etc."
                />
              </div>

              {/* URL de Imagen */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL de Foto de Perfil (opcional)
                </label>
                <input
                  type="url"
                  name="imagen_url"
                  value={formData.imagen_url}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://ejemplo.com/foto.jpg"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Proporciona un enlace a tu foto de perfil profesional
                </p>
              </div>

              {/* Botones */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Enviando...' : 'Enviar Solicitud'}
                </button>
              </div>
            </form>
          </div>

          {/* Info adicional */}
          <div className="mt-8 text-center text-sm text-gray-600">
            <p>
              ¿Ya tienes una cuenta?{' '}
              <a href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Inicia sesión aquí
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
