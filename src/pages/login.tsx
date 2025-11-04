import Head from 'next/head'
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Database } from '../../lib/database.types'

function Login() {
  const session = useSession()
  const supabase = useSupabaseClient<Database>()
  const router = useRouter()

  useEffect(() => {
    // Si hay sesión y el usuario es admin, redirigir al admin panel
    if (session?.user) {
      checkAdminAccess()
    }
  }, [session])

  const checkAdminAccess = async () => {
    if (!session?.user?.email) return

    try {
      console.log('🔍 Verificando acceso para:', session.user.email)
      console.log('🆔 User ID:', session.user.id)
      
      const { data: adminUser, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', session.user.id)
        .eq('activo', true)
        .single()

      console.log('📊 Resultado de consulta:', { adminUser, error })

      if (error) {
        console.error('❌ Error checking user access:', error)
        alert(`No tienes permisos para acceder. Error: ${error.message}\nContacta al administrador.`)
        await supabase.auth.signOut()
        return
      }

      if (adminUser) {
        console.log('✅ Usuario encontrado:', adminUser.email, 'Rol:', adminUser.rol)
        // Redirigir según el rol
        if (adminUser.rol === 'admin') {
          console.log('➡️ Redirigiendo a /admin')
          router.push('/admin')
        } else if (adminUser.rol === 'barbero') {
          console.log('➡️ Redirigiendo a /barbero-panel')
          router.push('/barbero-panel')
        } else {
          alert('Rol no reconocido. Contacta al administrador.')
          await supabase.auth.signOut()
        }
      } else {
        // Si no existe en admin_users, cerrar sesión
        console.log('⚠️ Usuario no encontrado en admin_users')
        alert('Usuario no autorizado. Contacta al administrador.')
        await supabase.auth.signOut()
      }
    } catch (error) {
      console.error('💥 Error checking access:', error)
      alert('Error al verificar permisos. Intenta nuevamente.')
      await supabase.auth.signOut()
    }
  }

  if (session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando acceso de administrador...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Admin Login - Chamos Barber</title>
        <meta name="description" content="Panel de administración Chamos Barber" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Header */}
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

        {/* Login Form */}
        <div className="flex-1 flex items-center justify-center p-4 py-8" style={{ paddingTop: '100px' }}>
          <div className="w-full max-w-md auth-card-enter">
            <div className="booking-form" style={{ margin: '0' }}>
                <div className="step-header">
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
                    <i className="fas fa-lock" style={{ color: 'var(--bg-primary)', fontSize: '2rem' }}></i>
                  </div>
                  <h2 className="step-title">Iniciar Sesión</h2>
                  <p className="step-subtitle">Accede al panel de administración</p>
                </div>

                <Auth
                  supabaseClient={supabase}
                  appearance={{
                    theme: ThemeSupa,
                    variables: {
                      default: {
                        colors: {
                          brand: '#d97706',
                          brandAccent: '#b45309',
                        },
                      },
                    },
                    className: {
                      container: 'auth-container',
                      button: 'auth-button',
                      input: 'auth-input',
                    },
                  }}
                  providers={[]}
                  redirectTo={typeof window !== 'undefined' ? `${window.location.origin}/admin` : '/admin'}
                  onlyThirdPartyProviders={false}
                  magicLink={false}
                  showLinks={false}
                />

                <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', opacity: '0.8' }}>
                      <i className="fas fa-shield-alt" style={{ marginRight: '0.5rem', color: 'var(--accent-color)' }}></i>
                      <span>Conexión segura y encriptada</span>
                    </div>
                    <div style={{ fontSize: '0.875rem', textAlign: 'center' }}>
                      <span style={{ opacity: '0.8' }}>¿Quieres unirte al equipo?</span>
                      {' '}
                      <Link href="/registro-barbero" style={{ color: 'var(--accent-color)', fontWeight: '600', textDecoration: 'none' }}>
                        Regístrate como barbero
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        {/* Footer */}
        <div style={{ width: '100%', backgroundColor: 'var(--bg-secondary)', padding: '2rem 0', borderTop: '1px solid var(--border-color)' }}>
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

        <style jsx global>{`
          /* Animación de entrada para el formulario */
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .auth-card-enter {
            animation: slideUp 0.5s ease-out;
          }

          /* Loading spinner personalizado */
          @keyframes rotate {
            100% {
              transform: rotate(360deg);
            }
          }

          .loading-spinner {
            animation: rotate 1s linear infinite;
          }

          /* Mejoras para el formulario en móvil */
          @media (max-width: 640px) {
            .bg-white {
              max-height: 90vh;
              overflow-y: auto;
            }
          }

          /* Asegurar que los estilos de Supabase Auth se apliquen */
          form {
            width: 100%;
          }

          /* Animación para el ícono del candado */
          @keyframes pulse-glow {
            0%, 100% {
              box-shadow: 0 0 20px rgba(217, 119, 6, 0.4);
            }
            50% {
              box-shadow: 0 0 30px rgba(217, 119, 6, 0.6);
            }
          }

          .lock-icon-container {
            animation: pulse-glow 2s ease-in-out infinite;
          }
        `}</style>
      </div>
    </>
  )
}

// Deshabilitar SSR para esta página
export async function getServerSideProps() {
  return {
    props: {},
  }
}

export default Login