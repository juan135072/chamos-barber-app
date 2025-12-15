import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react'
import toast, { Toaster } from 'react-hot-toast'
import CitasSection from '../components/barbero/CitasSection'
import GananciasSection from '../components/barbero/GananciasSection'
import ChangePasswordSection from '../components/barbero/ChangePasswordSection'
import { chamosSupabase } from '../../lib/supabase-helpers'

interface BarberoProfile {
  id: string
  nombre: string
  apellido: string
  email: string
  telefono: string
  instagram: string
  descripcion: string
  especialidades: string[] | null
  imagen_url: string
}


const BarberoPanelPage: React.FC = () => {
  const session = useSession()
  const supabase = useSupabaseClient()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<BarberoProfile | null>(null)
  const [activeTab, setActiveTab] = useState<'perfil' | 'citas' | 'ganancias' | 'seguridad'>('citas')
  const [saving, setSaving] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    if (!session) {
      router.push('/login')
      return
    }
    loadBarberoData()
  }, [session])

  const loadBarberoData = async () => {
    try {
      setLoading(true)
      
      // Obtener perfil del barbero
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('barbero_id, rol')
        .eq('id', session?.user?.id)
        .single()

      if (adminError || !adminUser || adminUser.rol !== 'barbero') {
        toast.error('No tienes permisos para acceder a este panel')
        router.push('/login')
        return
      }

      // Cargar datos del barbero
      const { data: barbero, error: barberoError } = await supabase
        .from('barberos')
        .select('*')
        .eq('id', adminUser.barbero_id)
        .single()

      if (barberoError) throw barberoError

      console.log('🔍 [Barbero Panel] Perfil cargado:', {
        id: barbero.id,
        nombre: barbero.nombre,
        descripcion: barbero.descripcion,
        descripcion_length: barbero.descripcion?.length || 0
      })

      setProfile(barbero)

    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error al cargar tus datos')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      toast.error('Tipo de archivo no válido. Usa JPG, PNG, WEBP o GIF')
      return
    }

    // Validar tamaño (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('El archivo es demasiado grande. Máximo 5MB')
      return
    }

    setSelectedFile(file)

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
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    try {
      setSaving(true)
      let newImageUrl = profile.imagen_url

      // Si hay una nueva imagen seleccionada, subirla primero
      if (selectedFile) {
        setUploadingImage(true)
        toast.loading('Subiendo imagen...')

        try {
          // Eliminar imagen anterior si existe
          if (profile.imagen_url) {
            const oldPath = profile.imagen_url.split('/').pop()
            if (oldPath) {
              await chamosSupabase.deleteBarberoFoto(oldPath)
            }
          }

          // Subir nueva imagen
          const uploadResult = await chamosSupabase.uploadBarberoFoto(selectedFile, profile.id)
          newImageUrl = uploadResult.publicUrl
          toast.dismiss()
          toast.success('Imagen subida exitosamente')
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError)
          toast.dismiss()
          toast.error('Error al subir la imagen')
          setUploadingImage(false)
          setSaving(false)
          return
        } finally {
          setUploadingImage(false)
        }
      }
      
      // Actualizar perfil usando chamosSupabase (bypassa RLS)
      console.log('💾 [Barbero Panel] Guardando perfil:', {
        telefono: profile.telefono,
        instagram: profile.instagram,
        descripcion: profile.descripcion,
        descripcion_length: profile.descripcion?.length || 0,
        imagen_url: newImageUrl
      })

      await chamosSupabase.updateBarbero(profile.id, {
        telefono: profile.telefono,
        instagram: profile.instagram,
        descripcion: profile.descripcion,
        imagen_url: newImageUrl
      })

      console.log('✅ [Barbero Panel] Perfil actualizado exitosamente')

      // Actualizar estado local
      setProfile({ ...profile, imagen_url: newImageUrl })
      setSelectedFile(null)
      setImagePreview(null)

      toast.success('Perfil actualizado exitosamente')

      // Recargar datos del barbero para confirmar cambios
      await loadBarberoData()
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Error al actualizar el perfil')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <>
        <Head>
          <title>Cargando... - Chamos Barber</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 mx-auto mb-4" style={{ borderBottom: '2px solid var(--accent-color)' }}></div>
            <p style={{ color: 'var(--text-primary)', opacity: 0.8 }}>Cargando tu panel...</p>
          </div>
        </div>
      </>
    )
  }

  if (!profile) {
    return (
      <>
        <Head>
          <title>Error - Chamos Barber</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '60vh',
            flexDirection: 'column',
            gap: '2rem'
          }}>
            <h2 style={{ color: 'var(--text-primary)' }}>No se pudo cargar tu perfil</h2>
            <button onClick={() => router.push('/login')} className="btn btn-primary">
              Volver al Login
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>{`Panel de ${profile.nombre} - Chamos Barber`}</title>
        <meta name="description" content="Panel de control para barberos" />
      </Head>
      <Toaster position="top-right" />
      
      <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Header */}
        <header style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-color)' }}>
                  <i className="fas fa-scissors" style={{ color: 'var(--bg-primary)' }}></i>
                </div>
                <div>
                  <h1 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Panel de Barbero</h1>
                  <p className="text-sm" style={{ color: 'var(--accent-color)' }}>Chamos Barber</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{profile.nombre} {profile.apellido}</p>
                  <p className="text-xs" style={{ color: 'var(--accent-color)' }}>barbero</p>
                </div>
                <button
                  onClick={() => router.push('/barbero/liquidaciones')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{ 
                    backgroundColor: '#10B981', 
                    color: 'white',
                    transition: 'var(--transition)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10B981'}
                >
                  <i className="fas fa-money-bill-wave mr-2"></i>
                  Mis Liquidaciones
                </button>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={{ 
                    backgroundColor: 'var(--accent-color)', 
                    color: 'var(--bg-primary)',
                    transition: 'var(--transition)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#B8941F'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-color)'}
                >
                  <i className="fas fa-sign-out-alt mr-2"></i>
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">

        {/* Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '2rem',
          borderBottom: '2px solid var(--border-color)'
        }}>
          <button
            onClick={() => setActiveTab('perfil')}
            style={{
              padding: '1rem 2rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'perfil' ? '3px solid var(--accent-color)' : 'none',
              color: activeTab === 'perfil' ? 'var(--accent-color)' : 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '1rem',
              transition: 'all 0.3s'
            }}
          >
            <i className="fas fa-user"></i> Mi Perfil
          </button>
          <button
            onClick={() => setActiveTab('citas')}
            style={{
              padding: '1rem 2rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'citas' ? '3px solid var(--accent-color)' : 'none',
              color: activeTab === 'citas' ? 'var(--accent-color)' : 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '1rem',
              transition: 'all 0.3s'
            }}
          >
            <i className="fas fa-calendar-alt"></i> Mis Citas
          </button>
          <button
            onClick={() => setActiveTab('ganancias')}
            style={{
              padding: '1rem 2rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'ganancias' ? '3px solid var(--accent-color)' : 'none',
              color: activeTab === 'ganancias' ? 'var(--accent-color)' : 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '1rem',
              transition: 'all 0.3s'
            }}
          >
            <i className="fas fa-chart-line"></i> Mis Ganancias
          </button>
          <button
            onClick={() => setActiveTab('seguridad')}
            style={{
              padding: '1rem 2rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'seguridad' ? '3px solid var(--accent-color)' : 'none',
              color: activeTab === 'seguridad' ? 'var(--accent-color)' : 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '1rem',
              transition: 'all 0.3s'
            }}
          >
            <i className="fas fa-shield-alt"></i> Seguridad
          </button>
        </div>

        {/* Content */}
        {activeTab === 'citas' && profile && (
          <CitasSection barberoId={profile.id} />
        )}

        {activeTab === 'ganancias' && profile && (
          <GananciasSection barberoId={profile.id} />
        )}

        {activeTab === 'seguridad' && (
          <ChangePasswordSection />
        )}

        {activeTab === 'perfil' && (
          <div style={{ 
            maxWidth: '800px', 
            margin: '0 auto',
            background: 'var(--bg-secondary)',
            padding: '2rem',
            borderRadius: 'var(--border-radius)',
            border: '1px solid var(--border-color)'
          }}>
            <h2 style={{ marginBottom: '2rem', color: 'var(--accent-color)' }}>
              <i className="fas fa-edit"></i> Actualizar Información
            </h2>
            
            <form onSubmit={handleUpdateProfile}>
              {/* Información no editable */}
              <div style={{ 
                marginBottom: '2rem',
                padding: '1rem',
                background: 'rgba(212, 175, 55, 0.1)',
                borderRadius: 'var(--border-radius)',
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

              {/* Campos editables */}
              
              {/* Foto de Perfil */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ 
                  display: 'block', 
                  marginBottom: '0.75rem',
                  color: 'var(--text-primary)',
                  opacity: 0.9
                }}>
                  <i className="fas fa-camera"></i> Foto de Perfil
                </label>

                {/* Imagen actual o preview */}
                {(imagePreview || profile.imagen_url) && (
                  <div style={{ 
                    marginBottom: '1rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem' 
                  }}>
                    <img 
                      src={imagePreview || profile.imagen_url} 
                      alt="Preview" 
                      style={{ 
                        width: '120px', 
                        height: '120px', 
                        borderRadius: '50%', 
                        objectFit: 'cover',
                        border: '3px solid var(--accent-color)'
                      }} 
                    />
                    {imagePreview && (
                      <button 
                        type="button"
                        onClick={handleClearImage}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'rgba(220, 38, 38, 0.15)',
                          color: '#fca5a5',
                          border: '1px solid rgba(220, 38, 38, 0.3)',
                          borderRadius: 'var(--border-radius)',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          transition: 'all 0.3s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(220, 38, 38, 0.25)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(220, 38, 38, 0.15)'
                        }}
                      >
                        <i className="fas fa-times"></i> Quitar nueva imagen
                      </button>
                    )}
                  </div>
                )}

                {/* Área de drag & drop */}
                <div
                  style={{
                    border: '2px dashed var(--border-color)',
                    borderRadius: 'var(--border-radius)',
                    padding: '2rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    backgroundColor: 'rgba(212, 175, 55, 0.03)'
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.currentTarget.style.borderColor = 'var(--accent-color)'
                    e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.1)'
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)'
                    e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.03)'
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.currentTarget.style.borderColor = 'var(--border-color)'
                    e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.03)'
                    const file = e.dataTransfer.files[0]
                    if (file) {
                      const input = document.createElement('input')
                      input.type = 'file'
                      const dt = new DataTransfer()
                      dt.items.add(file)
                      input.files = dt.files
                      handleFileSelect({ target: input } as any)
                    }
                  }}
                >
                  <i 
                    className="fas fa-cloud-upload-alt" 
                    style={{ 
                      fontSize: '3rem', 
                      color: 'var(--accent-color)', 
                      marginBottom: '1rem',
                      opacity: 0.7,
                      display: 'block'
                    }}
                  ></i>
                  <p style={{ 
                    marginBottom: '0.5rem',
                    color: 'var(--text-primary)',
                    opacity: 0.9
                  }}>
                    Arrastra una imagen aquí o{' '}
                    <label style={{ 
                      color: 'var(--accent-color)', 
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}>
                      selecciona un archivo
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </p>
                  <p style={{ 
                    fontSize: '0.85rem', 
                    color: 'var(--text-primary)',
                    opacity: 0.6,
                    margin: 0
                  }}>
                    PNG, JPG, WEBP, GIF hasta 5MB
                  </p>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-phone"></i> Teléfono / WhatsApp
                </label>
                <input
                  type="tel"
                  className="form-input"
                  value={profile.telefono || ''}
                  onChange={(e) => setProfile({ ...profile, telefono: e.target.value })}
                  placeholder="+56 9 1234 5678"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <i className="fab fa-instagram"></i> Instagram
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={profile.instagram || ''}
                  onChange={(e) => setProfile({ ...profile, instagram: e.target.value })}
                  placeholder="@tu_instagram"
                />
                <small style={{ opacity: 0.7, fontSize: '0.85rem' }}>
                  Usa @ o la URL completa de tu perfil
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-align-left"></i> Descripción / Biografía
                </label>
                <textarea
                  className="form-input"
                  value={profile.descripcion || ''}
                  onChange={(e) => setProfile({ ...profile, descripcion: e.target.value })}
                  rows={5}
                  placeholder="Cuéntale a tus clientes sobre ti, tu experiencia y estilo..."
                  style={{ resize: 'vertical' }}
                />
                <small style={{ opacity: 0.7, fontSize: '0.85rem' }}>
                  {profile.descripcion?.length || 0} caracteres
                </small>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || uploadingImage}
                style={{ width: '100%', marginTop: '1rem' }}
              >
                {uploadingImage ? (
                  <>
                    <div className="spinner"></div>
                    Subiendo imagen...
                  </>
                ) : saving ? (
                  <>
                    <div className="spinner"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save"></i>
                    Guardar Cambios
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        </div>
      </div>
    </>
  )
}

export default BarberoPanelPage
