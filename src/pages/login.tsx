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
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', session.user.email)
        .eq('activo', true)
        .single()

      if (adminUser) {
        router.push('/admin')
      } else {
        // Si no es admin, cerrar sesión
        await supabase.auth.signOut()
      }
    } catch (error) {
      console.error('Error checking admin access:', error)
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
      
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-amber-900 relative overflow-hidden">
        {/* Video Background */}
        <video 
          autoPlay 
          muted 
          loop 
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        >
          <source src="/videos/barbershop-bg.mp4" type="video/mp4" />
        </video>
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>

        {/* Content */}
        <div className="relative z-10 min-h-screen flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center p-6">
            <Link href="/" className="flex items-center space-x-2 text-white hover:text-amber-400 transition-colors">
              <i className="fas fa-arrow-left"></i>
              <span>Volver al sitio</span>
            </Link>
            
            <div className="flex items-center space-x-3">
              <Image
                src="/images/logo.png"
                alt="Chamos Barber"
                width={40}
                height={40}
                className="rounded-full"
              />
              <div className="text-white">
                <h1 className="font-bold text-lg">Chamos Barber</h1>
                <p className="text-sm text-gray-300">Panel de Administración</p>
              </div>
            </div>
          </div>

          {/* Login Form */}
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
              <div className="bg-white rounded-xl shadow-2xl p-8 backdrop-blur-sm bg-opacity-95">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
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
          <div className="flex justify-center items-center space-x-4 p-6">
            <div className="flex items-center space-x-2">
              <Image
                src="/images/venezuela-flag.png"
                alt="Venezuela"
                width={24}
                height={16}
                className="rounded"
              />
              <i className="fas fa-heart text-red-500"></i>
              <Image
                src="/images/chile-flag.png"
                alt="Chile"
                width={24}
                height={16}
                className="rounded"
              />
            </div>
          </div>
        </div>

        <style jsx global>{`
          .auth-container {
            width: 100%;
          }
          
          .auth-button {
            background-color: #d97706 !important;
            border: none !important;
            border-radius: 8px !important;
            padding: 12px 24px !important;
            font-weight: 600 !important;
            transition: all 0.2s !important;
          }
          
          .auth-button:hover {
            background-color: #b45309 !important;
            transform: translateY(-1px) !important;
          }
          
          .auth-input {
            border: 1px solid #d1d5db !important;
            border-radius: 8px !important;
            padding: 12px 16px !important;
            transition: border-color 0.2s !important;
          }
          
          .auth-input:focus {
            border-color: #d97706 !important;
            box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.1) !important;
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