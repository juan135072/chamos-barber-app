import Head from 'next/head'
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import Link from 'next/link'
import type { Database } from '@/lib/supabase'

function Login() {
    const session = useSession()
    const supabase = useSupabaseClient<Database>()
    const router = useRouter()

    useEffect(() => {
        if (session?.user) {
            checkAccess()
        }
    }, [session])

    const checkAccess = async () => {
        if (!session?.user?.email) return

        try {
            const { data: adminUser, error } = await supabase
                .from('admin_users')
                .select('*')
                .eq('id', session.user.id)
                .eq('activo', true)
                .single()

            if (error) {
                console.error('❌ Error checking user access:', error)
                alert(`No tienes permisos para acceder. Contacta al administrador.`)
                await supabase.auth.signOut()
                return
            }

            if (adminUser) {
                // En este repositorio solo redirigimos al POS (/)
                // ya que es un despliegue independiente del Punto de Venta
                router.push('/')
            } else {
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
                    <p style={{ color: 'var(--text-primary)', opacity: 0.8 }}>Verificando acceso...</p>
                </div>
            </div>
        )
    }

    return (
        <>
            <Head>
                <title>Acceso POS - Chamos Barber</title>
                <meta name="description" content="Punto de Venta Chamos Barber" />
                <meta name="robots" content="noindex, nofollow" />
            </Head>

            <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
                {/* Header */}
                <div className="w-full" style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <img
                                src="/chamos-logo.png"
                                alt="Chamos Barber Shop Logo"
                                className="h-12 w-auto"
                                style={{ objectFit: 'contain' }}
                            />
                            <div style={{ color: 'var(--text-primary)' }}>
                                <h1 className="font-bold text-lg leading-tight">Chamos Barber</h1>
                                <p className="text-xs" style={{ color: 'var(--accent-color)' }}>Punto de Venta (POS)</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Login Form */}
                <div className="flex-1 flex items-center justify-center p-4 py-8">
                    <div className="w-full max-w-md">
                        <div className="rounded-2xl shadow-2xl p-8" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                            <div className="text-center mb-8">
                                <img
                                    src="/chamos-logo.png"
                                    alt="Chamos Barber Shop Logo"
                                    className="h-20 w-auto mx-auto mb-4"
                                    style={{ objectFit: 'contain' }}
                                />
                                <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--accent-color)' }}>Iniciar Sesión</h2>
                                <p style={{ color: 'var(--text-primary)', opacity: 0.8 }}>Accede al Punto de Venta</p>
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
                                }}
                                localization={{
                                    variables: {
                                        sign_in: {
                                            email_label: 'Correo electrónico',
                                            password_label: 'Contraseña',
                                            button_label: 'Iniciar sesión',
                                            loading_button_label: 'Iniciando sesión...',
                                        },
                                    },
                                }}
                                providers={[]}
                                magicLink={false}
                                showLinks={false}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="w-full py-4 text-center" style={{ backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}>
                    <p className="text-xs" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Chamos Barber © {new Date().getFullYear()}</p>
                </div>
            </div>
        </>
    )
}

export default Login
