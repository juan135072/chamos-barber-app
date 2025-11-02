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
      
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-amber-900 flex flex-col">
        {/* Header */}
        <div className="w-full bg-black bg-opacity-30 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <Link href="/" className="flex items-center space-x-2 text-white hover:text-amber-400 transition-colors">
              <i className="fas fa-arrow-left text-lg"></i>
              <span className="font-medium">Volver al sitio</span>
            </Link>
            
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-amber-600 rounded-full flex items-center justify-center">
                <i className="fas fa-cut text-white"></i>
              </div>
              <div className="text-white">
                <h1 className="font-bold text-lg leading-tight">Chamos Barber</h1>
                <p className="text-xs text-amber-300">Panel de Administración</p>
              </div>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <div className="flex-1 flex items-center justify-center p-4 py-8">
          <div className="w-full max-w-md auth-card-enter">
            <div className="bg-white rounded-2xl shadow-2xl p-8 backdrop-blur-sm bg-opacity-98">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 lock-icon-container">
                    <i className="fas fa-lock text-white text-2xl"></i>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Iniciar Sesión</h2>
                  <p className="text-gray-600">Accede al panel de administración</p>
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

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-center text-sm text-gray-500">
                    <i className="fas fa-shield-alt mr-2"></i>
                    <span>Conexión segura y encriptada</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        {/* Footer */}
        <div className="w-full bg-black bg-opacity-30 backdrop-blur-sm py-4">
          <div className="flex justify-center items-center space-x-3">
            <div className="flex items-center space-x-2 bg-white bg-opacity-10 px-4 py-2 rounded-full">
              <span className="text-2xl">🇻🇪</span>
              <i className="fas fa-heart text-red-500 text-sm"></i>
              <span className="text-2xl">🇨🇱</span>
            </div>
          </div>
          <p className="text-center text-white text-xs mt-2 opacity-75">Hecho con ❤️ por venezolanos en Chile</p>
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