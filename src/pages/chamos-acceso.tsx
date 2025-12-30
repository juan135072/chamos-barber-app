import Head from 'next/head'
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Database } from '../../lib/database.types'
import { useOneSignal } from '../components/providers/OneSignalProvider'

function Login() {
  const session = useSession()
  const supabase = useSupabaseClient<Database>()
  const router = useRouter()
  const { setExternalId } = useOneSignal()

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
          console.log('🔔 [Login] Vinculando OneSignal para barbero:', adminUser.barbero_id)
          if (adminUser.barbero_id) {
            setExternalId(adminUser.barbero_id)
          }
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 mx-auto mb-4" style={{ borderBottom: '2px solid var(--accent-color)' }}></div>
          <p style={{ color: 'var(--text-primary)', opacity: 0.8 }}>Verificando acceso de administrador...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Acceso - Chamos Barber</title>
        <meta name="description" content="Panel de administración Chamos Barber" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Header */}
        <div className="w-full" style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              {/* Enlace de retorno eliminado por seguridad */}
            </div>

            <div className="flex items-center space-x-3">
              <img
                src="/chamos-logo.png"
                alt="Chamos Barber Shop Logo"
                className="h-12 w-auto"
                style={{ objectFit: 'contain' }}
              />
              <div style={{ color: 'var(--text-primary)' }}>
                <h1 className="font-bold text-lg leading-tight">Chamos Barber</h1>
                <p className="text-xs" style={{ color: 'var(--accent-color)' }}>Panel de Administración</p>
              </div>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <div className="flex-1 flex items-center justify-center p-4 py-8">
          <div className="w-full max-w-md auth-card-enter">
            <div className="rounded-2xl shadow-2xl p-8" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <div className="text-center mb-8">
                <div className="flex items-center justify-center mx-auto mb-4 login-logo-container">
                  <img
                    src="/chamos-logo.png"
                    alt="Chamos Barber Shop Logo"
                    className="h-20 w-auto"
                    style={{ objectFit: 'contain' }}
                  />
                </div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--accent-color)' }}>Iniciar Sesión</h2>
                <p style={{ color: 'var(--text-primary)', opacity: 0.8 }}>Accede al panel de administración</p>
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
                localization={{
                  variables: {
                    sign_in: {
                      email_label: 'Correo electrónico',
                      password_label: 'Contraseña',
                      email_input_placeholder: 'Tu correo electrónico',
                      password_input_placeholder: 'Tu contraseña',
                      button_label: 'Iniciar sesión',
                      loading_button_label: 'Iniciando sesión...',
                      social_provider_text: 'Iniciar sesión con {{provider}}',
                      link_text: '¿Ya tienes una cuenta? Inicia sesión',
                    },
                  },
                }}
                providers={[]}
                redirectTo={typeof window !== 'undefined' ? `${window.location.origin}/admin` : '/admin'}
                onlyThirdPartyProviders={false}
                magicLink={false}
                showLinks={false}
              />

              <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--border-color)' }}>
                <div className="text-center mb-4">
                  <p className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
                    ¿No tienes cuenta?{' '}
                    <Link
                      href="/registro-barbero"
                      className="font-medium hover:underline transition-all"
                      style={{ color: 'var(--accent-color)' }}
                    >
                      Regístrate como barbero
                    </Link>
                  </p>
                </div>
                <div className="flex items-center justify-center text-sm" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                  <i className="fas fa-shield-alt mr-2"></i>
                  <span>Conexión segura y encriptada</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="w-full py-4" style={{ backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}>
          <div className="flex justify-center items-center space-x-3">
            <div className="flex items-center space-x-2 px-4 py-2 rounded-full" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
              <span className="text-2xl">🇻🇪</span>
              <i className="fas fa-heart text-red-500 text-sm"></i>
              <span className="text-2xl">🇨🇱</span>
            </div>
          </div>
          <p className="text-center text-xs mt-2" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Hecho con ❤️ por venezolanos en Chile</p>
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

          /* Animación para el logo en login */
          @keyframes float {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-10px);
            }
          }

          .login-logo-container img {
            animation: float 3s ease-in-out infinite;
            filter: drop-shadow(0 5px 15px rgba(212, 175, 55, 0.3));
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