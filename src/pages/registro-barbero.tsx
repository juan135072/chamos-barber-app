import React, { useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import { chamosSupabase } from '../../lib/supabase-helpers'

const RegistroBarberoPage: React.FC = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    anos_experiencia: '',
    especialidades: '',
    biografia: '',
    foto_perfil_url: '',
    portfolio_urls: ''
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await chamosSupabase.createSolicitudBarbero({
        nombre: formData.nombre,
        apellido: formData.apellido,
        email: formData.email,
        telefono: formData.telefono,
        anos_experiencia: parseInt(formData.anos_experiencia),
        especialidades: formData.especialidades || null,
        biografia: formData.biografia || null,
        foto_perfil_url: formData.foto_perfil_url || null,
        portfolio_urls: formData.portfolio_urls || null,
        estado: 'pendiente'
      })

      setSubmitted(true)
    } catch (error) {
      console.error('Error:', error)
      if (error instanceof Error) {
        alert(error.message)
      } else {
        alert('Error al enviar la solicitud. Por favor, inténtalo de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <Layout
        title="Solicitud Enviada - Chamos Barber"
        description="Tu solicitud para unirte a Chamos Barber ha sido enviada exitosamente"
      >
        <div className="min-h-screen flex items-center justify-center px-4" style={{ paddingTop: '80px', paddingBottom: '40px' }}>
          <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
            <div className="mb-6">
              <svg className="mx-auto h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              ¡Solicitud Enviada!
            </h1>
            <p className="text-gray-600 mb-6">
              Tu solicitud para unirte a Chamos Barber ha sido recibida exitosamente. 
              Revisaremos tu información y te contactaremos pronto.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/')}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-4 rounded transition-colors"
              >
                Volver al Inicio
              </button>
              <button
                onClick={() => router.push('/login')}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-4 rounded transition-colors"
              >
                Ir al Login
              </button>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout
      title="Registro de Barberos - Chamos Barber"
      description="Únete al equipo de Chamos Barber. Completa tu solicitud para formar parte de nuestro equipo de profesionales"
    >
      <div className="min-h-screen py-12 px-4" style={{ paddingTop: '100px', backgroundColor: '#1a1a1a' }}>
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-yellow-500 mb-4">
              💈 Únete a Nuestro Equipo
            </h1>
            <p className="text-gray-300 text-lg">
              Completa el formulario y te contactaremos pronto
            </p>
          </div>

          {/* Formulario */}
          <div className="bg-white rounded-lg shadow-2xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Información Personal */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b pb-2">
                  Información Personal
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 font-bold mb-2">
                      Nombre <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nombre}
                      onChange={(e) => handleInputChange('nombre', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      placeholder="Carlos"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-2">
                      Apellido <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.apellido}
                      onChange={(e) => handleInputChange('apellido', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      placeholder="Ramírez"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-gray-700 font-bold mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      placeholder="tu.email@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-2">
                      Teléfono <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.telefono}
                      onChange={(e) => handleInputChange('telefono', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      placeholder="+58 424 123 4567"
                    />
                  </div>
                </div>
              </div>

              {/* Información Profesional */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b pb-2">
                  Experiencia Profesional
                </h2>
                
                <div className="mb-4">
                  <label className="block text-gray-700 font-bold mb-2">
                    Años de Experiencia <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.anos_experiencia}
                    onChange={(e) => handleInputChange('anos_experiencia', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="5"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 font-bold mb-2">
                    Especialidades
                  </label>
                  <input
                    type="text"
                    value={formData.especialidades}
                    onChange={(e) => handleInputChange('especialidades', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="Cortes clásicos, Fades, Barba, etc."
                  />
                  <p className="text-sm text-gray-500 mt-1">Separa las especialidades con comas</p>
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 font-bold mb-2">
                    Biografía
                  </label>
                  <textarea
                    rows={4}
                    value={formData.biografia}
                    onChange={(e) => handleInputChange('biografia', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="Cuéntanos sobre ti, tu experiencia y tu pasión por la barbería..."
                  />
                </div>
              </div>

              {/* Portfolio */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b pb-2">
                  Portfolio (Opcional)
                </h2>
                
                <div className="mb-4">
                  <label className="block text-gray-700 font-bold mb-2">
                    Foto de Perfil (URL)
                  </label>
                  <input
                    type="url"
                    value={formData.foto_perfil_url}
                    onChange={(e) => handleInputChange('foto_perfil_url', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="https://example.com/tu-foto.jpg"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Puedes subir tu foto a <a href="https://imgur.com" target="_blank" rel="noopener noreferrer" className="text-yellow-600 hover:underline">Imgur</a> y copiar el enlace
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 font-bold mb-2">
                    URLs de Trabajos Realizados
                  </label>
                  <textarea
                    rows={3}
                    value={formData.portfolio_urls}
                    onChange={(e) => handleInputChange('portfolio_urls', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="https://example.com/trabajo1.jpg, https://example.com/trabajo2.jpg"
                  />
                  <p className="text-sm text-gray-500 mt-1">Separa múltiples URLs con comas</p>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  disabled={loading}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Enviando...' : 'Enviar Solicitud'}
                </button>
              </div>

              <p className="text-sm text-gray-600 text-center mt-4">
                Al enviar esta solicitud, aceptas que revisemos tu información y nos pongamos en contacto contigo.
              </p>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default RegistroBarberoPage
