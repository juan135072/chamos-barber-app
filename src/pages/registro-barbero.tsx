import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
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
<<<<<<< HEAD
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
=======
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="booking-form" style={{ maxWidth: '600px', textAlign: 'center' }}>
          <div style={{ marginBottom: '2rem' }}>
            <div style={{
              width: '80px',
              height: '80px',
              backgroundColor: '#10b981',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)'
            }}>
              <svg style={{ width: '48px', height: '48px', color: 'var(--bg-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h2 className="step-title" style={{ color: '#10b981' }}>¡Solicitud Enviada!</h2>
          <p className="step-subtitle" style={{ marginBottom: '2rem' }}>
            Tu solicitud de registro ha sido enviada exitosamente. Nuestro equipo la revisará pronto.
          </p>
          <p style={{ fontSize: '0.875rem', opacity: '0.7' }}>
>>>>>>> origin/master
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

<<<<<<< HEAD
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Únete a Nuestro Equipo
            </h1>
            <p className="text-lg text-gray-600">
=======
      <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', paddingTop: '80px', paddingBottom: '4rem' }}>
        {/* Navbar */}
        <div className="navbar">
          <div className="nav-container">
            <Link href="/" className="nav-link" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="fas fa-arrow-left"></i>
              <span>Volver al sitio</span>
            </Link>
            
            <div className="nav-brand">
              <i className="fas fa-cut"></i>
              <span>Chamos Barber</span>
            </div>
          </div>
        </div>

        <div className="container" style={{ maxWidth: '900px', paddingTop: '2rem' }}>
          {/* Header */}
          <div className="step-header" style={{ marginBottom: '3rem' }}>
            <div style={{
              width: '80px',
              height: '80px',
              backgroundColor: 'var(--accent-color)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              boxShadow: '0 0 20px rgba(212, 175, 55, 0.4)'
            }}>
              <i className="fas fa-user-plus" style={{ color: 'var(--bg-primary)', fontSize: '2rem' }}></i>
            </div>
            <h1 className="hero-title" style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
              Únete a Nuestro Equipo
            </h1>
            <p className="hero-subtitle">
>>>>>>> origin/master
              Completa el formulario para solicitar tu registro como barbero
            </p>
          </div>

          {/* Form */}
<<<<<<< HEAD
          <div className="bg-white rounded-lg shadow-lg p-8">
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
=======
          <div className="booking-form">
            {error && (
              <div style={{
                marginBottom: '1.5rem',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                padding: '1rem',
                borderRadius: 'var(--border-radius)'
              }}>
>>>>>>> origin/master
                {error}
              </div>
            )}

<<<<<<< HEAD
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nombre y Apellido */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
=======
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Nombre y Apellido */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">
>>>>>>> origin/master
                    Nombre *
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    required
                    value={formData.nombre}
                    onChange={handleChange}
<<<<<<< HEAD
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Juan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
=======
                    className="form-input"
                    placeholder="Juan"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
>>>>>>> origin/master
                    Apellido *
                  </label>
                  <input
                    type="text"
                    name="apellido"
                    required
                    value={formData.apellido}
                    onChange={handleChange}
<<<<<<< HEAD
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
=======
                    className="form-input"
>>>>>>> origin/master
                    placeholder="Pérez"
                  />
                </div>
              </div>

              {/* Email y Teléfono */}
<<<<<<< HEAD
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
=======
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">
>>>>>>> origin/master
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
<<<<<<< HEAD
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="juan@ejemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
=======
                    className="form-input"
                    placeholder="juan@ejemplo.com"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
>>>>>>> origin/master
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    name="telefono"
                    required
                    value={formData.telefono}
                    onChange={handleChange}
<<<<<<< HEAD
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
=======
                    className="form-input"
>>>>>>> origin/master
                    placeholder="+56 9 1234 5678"
                  />
                </div>
              </div>

              {/* Especialidad y Experiencia */}
<<<<<<< HEAD
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
=======
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">
>>>>>>> origin/master
                    Especialidad *
                  </label>
                  <select
                    name="especialidad"
                    required
                    value={formData.especialidad}
                    onChange={handleChange}
<<<<<<< HEAD
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
=======
                    className="form-select"
>>>>>>> origin/master
                  >
                    <option value="Cortes Clásicos">Cortes Clásicos</option>
                    <option value="Barba y Afeitado">Barba y Afeitado</option>
                    <option value="Coloración">Coloración</option>
                    <option value="Diseños y Fade">Diseños y Fade</option>
                    <option value="Especialista en Niños">Especialista en Niños</option>
                  </select>
                </div>
<<<<<<< HEAD
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
=======
                <div className="form-group">
                  <label className="form-label">
>>>>>>> origin/master
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
<<<<<<< HEAD
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
=======
                    className="form-input"
>>>>>>> origin/master
                  />
                </div>
              </div>

              {/* Descripción */}
<<<<<<< HEAD
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
=======
              <div className="form-group">
                <label className="form-label">
>>>>>>> origin/master
                  Descripción / Sobre Ti
                </label>
                <textarea
                  name="descripcion"
                  rows={4}
                  value={formData.descripcion}
                  onChange={handleChange}
<<<<<<< HEAD
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Cuéntanos sobre tu experiencia, estilo de trabajo, certificaciones, etc."
=======
                  className="form-input"
                  placeholder="Cuéntanos sobre tu experiencia, estilo de trabajo, certificaciones, etc."
                  style={{ minHeight: '120px', resize: 'vertical' }}
>>>>>>> origin/master
                />
              </div>

              {/* URL de Imagen */}
<<<<<<< HEAD
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
=======
              <div className="form-group">
                <label className="form-label">
>>>>>>> origin/master
                  URL de Foto de Perfil (opcional)
                </label>
                <input
                  type="url"
                  name="imagen_url"
                  value={formData.imagen_url}
                  onChange={handleChange}
<<<<<<< HEAD
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://ejemplo.com/foto.jpg"
                />
                <p className="mt-1 text-sm text-gray-500">
=======
                  className="form-input"
                  placeholder="https://ejemplo.com/foto.jpg"
                />
                <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', opacity: '0.7' }}>
>>>>>>> origin/master
                  Proporciona un enlace a tu foto de perfil profesional
                </p>
              </div>

              {/* Botones */}
<<<<<<< HEAD
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  disabled={loading}
                >
=======
              <div className="form-navigation">
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="btn btn-secondary"
                  disabled={loading}
                  style={{ flex: '1' }}
                >
                  <i className="fas fa-arrow-left"></i>
>>>>>>> origin/master
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
<<<<<<< HEAD
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Enviando...' : 'Enviar Solicitud'}
=======
                  className="btn btn-primary"
                  style={{ flex: '1', opacity: loading ? '0.6' : '1', cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane"></i>
                      Enviar Solicitud
                    </>
                  )}
>>>>>>> origin/master
                </button>
              </div>
            </form>
          </div>

          {/* Info adicional */}
<<<<<<< HEAD
          <div className="mt-8 text-center text-sm text-gray-600">
            <p>
              ¿Ya tienes una cuenta?{' '}
              <a href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Inicia sesión aquí
              </a>
            </p>
          </div>
        </div>
=======
          <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.875rem', opacity: '0.8' }}>
            <p>
              ¿Ya tienes una cuenta?{' '}
              <Link href="/login" style={{ color: 'var(--accent-color)', fontWeight: '600', textDecoration: 'none' }}>
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ width: '100%', backgroundColor: 'var(--bg-secondary)', padding: '2rem 0', borderTop: '1px solid var(--border-color)', marginTop: '4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              backgroundColor: 'rgba(212, 175, 55, 0.1)', 
              padding: '0.75rem 1.5rem', 
              borderRadius: '50px',
              border: '1px solid var(--accent-color)'
            }}>
              <span style={{ fontSize: '1.5rem' }}>🇻🇪</span>
              <i className="fas fa-heart" style={{ color: '#ef4444', fontSize: '0.875rem' }}></i>
              <span style={{ fontSize: '1.5rem' }}>🇨🇱</span>
            </div>
          </div>
          <p style={{ textAlign: 'center', fontSize: '0.75rem', marginTop: '1rem', opacity: '0.7' }}>Hecho con ❤️ por venezolanos en Chile</p>
        </div>
>>>>>>> origin/master
      </div>
    </>
  )
}
