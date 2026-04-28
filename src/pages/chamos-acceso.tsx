import Head from 'next/head'
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Database } from '@/lib/database.types'
import { useOneSignal } from '../components/providers/OneSignalProvider'
import toast from 'react-hot-toast'

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
        toast.error(`Sin permisos de acceso. Contacta al administrador.`)
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
          toast.error('Rol no reconocido. Contacta al administrador.')
          await supabase.auth.signOut()
        }
      } else {
        // Si no existe en admin_users, cerrar sesión
        console.log('⚠️ Usuario no encontrado en admin_users')
        toast.error('Usuario no autorizado. Contacta al administrador.')
        await supabase.auth.signOut()
      }
    } catch (error) {
      console.error('💥 Error checking access:', error)
      toast.error('Error al verificar permisos. Intenta nuevamente.')
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
        <meta name="robots" content="noindex, nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Background Background with Orbs */}
        <div className="fixed inset-0 bg-[#080808] z-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-[120px] pointer-events-none" />
        </div>

        {/* Header */}
        <div className="w-full relative z-10 bg-white/[0.02] border-b border-white/5 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              {/* Enlace de retorno eliminado por seguridad */}
            </div>

            <div className="flex items-center space-x-3">
              <img
                src="/chamos-logo-gold.png"
                alt="Chamos Barber Shop Logo"
                className="h-12 w-auto"
                style={{ objectFit: 'contain' }}
              />
              <div>
                <h1 className="font-bold text-lg leading-tight text-white">Chamos Barber</h1>
                <p className="text-xs text-gold">Panel de Administración</p>
              </div>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <div className="flex-1 flex items-center justify-center p-4 py-8 relative z-10">
          <div className="w-full max-w-md auth-card-enter">
            <div className="rounded-3xl shadow-2xl p-8 bg-white/[0.02] border border-white/10 backdrop-blur-xl">
              <div className="text-center mb-8">
                <div className="flex items-center justify-center mx-auto mb-4 login-logo-container">
                  <img
                    src="/chamos-logo-gold.png"
                    alt="Chamos Barber Shop Logo"
                    className="h-20 w-auto"
                    style={{ objectFit: 'contain' }}
                  />
                </div>
                <h2 className="text-2xl font-black mb-2 text-gold tracking-widest uppercase">Iniciar Sesión</h2>
                <p className="text-white/60">Accede al panel de administración</p>
              </div>

              <Auth
                supabaseClient={supabase}
                appearance={{
                  theme: ThemeSupa,
                  variables: {
                    default: {
                      colors: {
                        brand: 'transparent',
                        brandAccent: 'transparent',
                        inputBackground: 'rgba(255, 255, 255, 0.05)',
                        inputText: 'white',
                        inputPlaceholder: 'rgba(255, 255, 255, 0.4)',
                        inputBorder: 'rgba(255, 255, 255, 0.1)',
                        inputBorderHover: 'rgba(212, 175, 55, 0.5)',
                        inputBorderFocus: '#d4af37',
                      },
                      borderWidths: {
                        buttonBorderWidth: '1px',
                        inputBorderWidth: '1px',
                      },
                      radii: {
                        borderRadiusButton: '0.75rem',
                        buttonBorderRadius: '0.75rem',
                        inputBorderRadius: '0.75rem',
                      },
                    },
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

              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="text-center mb-4">
                  <p className="text-sm text-white/60">
                    ¿No tienes cuenta?{' '}
                    <Link
                      href="/registro-barbero"
                      className="font-medium text-gold hover:text-white transition-colors"
                    >
                      Regístrate como barbero
                    </Link>
                  </p>
                </div>
                <div className="flex items-center justify-center text-sm text-white/40">
                  <i className="fas fa-shield-alt mr-2"></i>
                  <span>Conexión segura y encriptada</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="w-full py-4 relative z-10 bg-white/[0.02] border-t border-white/5 backdrop-blur-md">
          <div className="flex justify-center items-center space-x-3">
            <div className="flex items-center space-x-2 px-4 py-2 rounded-full bg-[#080808] border border-white/10">
              <span className="text-2xl">🇻🇪</span>
              <i className="fas fa-heart text-red-500 text-sm"></i>
              <span className="text-2xl">🇨🇱</span>
            </div>
          </div>
          <p className="text-center text-xs mt-2 text-white/50">Hecho con ❤️ por venezolanos en Chile</p>
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

          /* Asegurar que los estilos de Supabase Auth se apliquen correctamente */
          form {
            width: 100%;
          }
          
          /* Modificar los estilos del botón de Supabase Auth usando variables globales para el Liquid Glass */
          .supabase-auth-ui_ui-button {
            position: relative;
            background: #080808 !important;
            border: 1px solid rgba(212, 175, 55, 0.3) !important;
            color: #fff !important;
            font-weight: 900 !important;
            letter-spacing: 0.1em !important;
            text-transform: uppercase !important;
            transition: all 0.3s ease !important;
            overflow: hidden;
            z-index: 1;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3) !important;
          }
          
          .supabase-auth-ui_ui-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #d4af37, #a88647);
            z-index: -1;
            opacity: 0;
            transition: opacity 0.3s ease;
          }

          .supabase-auth-ui_ui-button:hover::before {
            opacity: 1;
          }
          
          .supabase-auth-ui_ui-button:hover {
            color: #080808 !important;
            border-color: transparent !important;
            box-shadow: 0 0 20px rgba(212, 175, 55, 0.4) !important;
          }

          .supabase-auth-ui_ui-label {
            color: rgba(255, 255, 255, 0.8) !important;
            font-size: 0.875rem !important;
            font-weight: 500 !important;
            margin-bottom: 0.5rem !important;
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