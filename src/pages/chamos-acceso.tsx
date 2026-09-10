import Head from 'next/head'
import { useSession, useSupabaseClient } from '@/lib/insforge-react'
import { useRouter } from 'next/router'
import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import type { Database } from '@/lib/database.types'
import { useOneSignal } from '../components/providers/OneSignalProvider'
import toast from 'react-hot-toast'
import { useTenant } from '@/context/TenantContext'
import { getServerAccess, persistAppSession } from '@/lib/server-access'

function Login() {
  const session = useSession()
  const supabase = useSupabaseClient<Database>()
  const router = useRouter()
  const { setExternalId } = useOneSignal()
  const { tenant, loading: tenantLoading } = useTenant()

  // Local form state (replaces the @supabase/auth-ui-react <Auth /> widget)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [signingIn, setSigningIn] = useState(false)

  const redirectForAccess = async (access: Awaited<ReturnType<typeof getServerAccess>>) => {
    const user = access.user

    console.log('[AuthAccess] Access granted', {
      email: user.email,
      role: user.rol,
      source: access.accessSource,
    })

    if (user.rol === 'admin') {
      await router.push('/admin')
      return
    }

    if (user.rol === 'barbero') {
      if (user.barbero_id) setExternalId(user.barbero_id)
      await router.push('/barbero-panel')
      return
    }

    if (user.rol === 'cajero') {
      await router.push('/pos')
      return
    }

    throw new Error('Rol no reconocido.')
  }

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault()
    if (signingIn) return
    setSigningIn(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error || !data?.user) {
        toast.error(error?.message || 'Correo o contraseña incorrectos')
        return
      }

      const accessToken = (supabase as any).tokenManager?.getAccessToken?.() ?? null
      const refreshToken = (supabase as any).tokenManager?.getRefreshToken?.() ?? null

      if (!accessToken) {
        throw new Error('No se recibió un token de sesión válido.')
      }

      // Persist the app-domain cookie before navigating. The previous bridge
      // fired this request in the background, so navigation could race it.
      await persistAppSession(accessToken, refreshToken)

      // Authorization is resolved on our server with project_admin access.
      // No direct browser query to admin_users is performed here.
      const access = await getServerAccess(accessToken)
      await redirectForAccess(access)
    } catch (err: any) {
      console.error('[AuthAccess] Sign-in access check failed', {
        code: err?.code ?? null,
        status: err?.status ?? null,
        message: err?.message ?? String(err),
      })

      if (err?.code === 'ACCESS_CONFIG_MISSING') {
        toast.error('Falta configuración del servidor para verificar el acceso.')
      } else if (err?.code === 'ACCESS_NOT_FOUND') {
        toast.error('Usuario autenticado, pero sin permiso de acceso activo.')
      } else {
        toast.error(err?.message || 'Error al iniciar sesión')
      }

      await supabase.auth.signOut().catch(() => {})
    } finally {
      setSigningIn(false)
    }
  }

  useEffect(() => {
    if (session?.user) {
      checkAdminAccess()
    }
  }, [session])

  const checkAdminAccess = async () => {
    if (!session?.user?.email) return

    try {
      const accessToken = session.access_token || (supabase as any).tokenManager?.getAccessToken?.() || null
      const access = await getServerAccess(accessToken)
      await redirectForAccess(access)
    } catch (error: any) {
      console.error('[AuthAccess] Existing-session access check failed', {
        code: error?.code ?? null,
        status: error?.status ?? null,
        message: error?.message ?? String(error),
      })
      toast.error('No se pudo verificar el acceso. Inicia sesión nuevamente.')
      await supabase.auth.signOut().catch(() => {})
    }
  }

  if (session || tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--tenant-bg, var(--bg-primary))' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 mx-auto mb-4" style={{ borderBottom: '2px solid var(--tenant-primary, var(--accent-color))' }}></div>
          <p style={{ color: 'var(--text-primary)', opacity: 0.8 }}>{tenantLoading ? 'Cargando comercio...' : 'Verificando acceso...'}</p>
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
              {tenant?.logo_url ? (
                <img
                  src={tenant.logo_url}
                  alt={`${tenant.nombre} Logo`}
                  className="h-12 w-auto"
                  style={{ objectFit: 'contain' }}
                  onError={(e: any) => {
                    e.currentTarget.src = '/chamos-logo-gold.png'
                    e.currentTarget.onerror = null
                  }}
                />
              ) : (
                <div className="h-10 w-10 rounded-full flex items-center justify-center border" style={{ borderColor: 'var(--tenant-primary, #d4af37)', background: 'rgba(0,0,0,0.5)' }}>
                  <span className="text-lg font-bold" style={{ color: 'var(--tenant-primary, #d4af37)' }}>
                    {tenant?.nombre?.charAt(0) || 'C'}
                  </span>
                </div>
              )}
              <div>
                <h1 className="font-bold text-lg leading-tight text-white">{tenant?.nombre || 'Chamos Barber'}</h1>
                <p className="text-xs" style={{ color: 'var(--tenant-primary, #d4af37)' }}>Panel de Administración</p>
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
                  {tenant?.logo_url ? (
                    <img
                      src={tenant.logo_url}
                      alt={`${tenant.nombre} Logo`}
                      className="h-20 w-auto"
                      style={{ objectFit: 'contain' }}
                      onError={(e: any) => {
                        e.currentTarget.src = '/chamos-logo-gold.png'
                        e.currentTarget.onerror = null
                      }}
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full flex items-center justify-center border-2 shadow-lg" style={{ borderColor: 'var(--tenant-primary, #d4af37)', background: 'rgba(0,0,0,0.5)' }}>
                      <span className="text-3xl font-bold" style={{ color: 'var(--tenant-primary, #d4af37)' }}>
                        {tenant?.nombre?.charAt(0) || 'C'}
                      </span>
                    </div>
                  )}
                </div>
                <h2 className="text-2xl font-black mb-2 tracking-widest uppercase" style={{ color: 'var(--tenant-primary, #d4af37)' }}>Iniciar Sesión</h2>
                <p className="text-white/60">Accede al panel de administración</p>
              </div>

              {/* Custom login form (replaces removed @supabase/auth-ui-react <Auth>) */}
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-sm text-white/80 mb-2 font-medium">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Tu correo electrónico"
                    required
                    autoComplete="email"
                    className="supabase-auth-ui_ui-input w-full px-4 py-3 rounded-xl text-white placeholder-white/40 focus:outline-none transition-colors"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/80 mb-2 font-medium">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tu contraseña"
                    required
                    autoComplete="current-password"
                    className="supabase-auth-ui_ui-input w-full px-4 py-3 rounded-xl text-white placeholder-white/40 focus:outline-none transition-colors"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={signingIn}
                  className="supabase-auth-ui_ui-button w-full py-3 px-4 rounded-xl font-black tracking-widest uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {signingIn ? 'Iniciando sesión...' : 'Iniciar sesión'}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="text-center mb-4">
                  <p className="text-sm text-white/60">
                    ¿No tienes cuenta?{' '}
                    <Link
                      href="/registro-barbero"
                      className="font-medium hover:text-white transition-colors"
                      style={{ color: 'var(--tenant-primary, #d4af37)' }}
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
            border: 1px solid var(--tenant-primary, rgba(212, 175, 55, 0.3)) !important;
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
            background: linear-gradient(135deg, var(--tenant-primary, #d4af37), rgba(0,0,0,0.5));
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
            box-shadow: 0 0 20px var(--tenant-primary, rgba(212, 175, 55, 0.4)) !important;
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

          .login-logo-container img, .login-logo-container > div {
            animation: float 3s ease-in-out infinite;
            filter: drop-shadow(0 5px 15px var(--tenant-primary, rgba(212, 175, 55, 0.3)));
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