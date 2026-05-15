import Head from 'next/head'
import { useSession, useSupabaseClient } from '@/lib/insforge-react'
import { useRouter } from 'next/router'
import { useEffect, useState, type FormEvent } from 'react'
import toast from 'react-hot-toast'

function Login() {
    const session = useSession()
    const supabase = useSupabaseClient()
    const router = useRouter()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [signingIn, setSigningIn] = useState(false)

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

            const { data: adminUser, error: adminErr } = await supabase
                .from('admin_users')
                .select('rol, activo')
                .eq('id', data.user.id)
                .eq('activo', true)
                .single()

            if (adminErr || !adminUser) {
                toast.error('Sin permisos de acceso. Contacta al administrador.')
                await supabase.auth.signOut()
                return
            }

            router.push('/')
        } catch (err: any) {
            toast.error(err?.message || 'Error al iniciar sesión')
        } finally {
            setSigningIn(false)
        }
    }

    // Redirect already-logged-in users
    useEffect(() => {
        if (session?.user) {
            router.push('/')
        }
    }, [session])

    // Loading state (session not yet resolved)
    if (session === undefined) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
                <div className="animate-spin rounded-full h-16 w-16" style={{ borderBottom: '2px solid var(--accent-color)' }}></div>
            </div>
        )
    }

    // Already authenticated
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
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center space-x-3">
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

                            <form onSubmit={handleSignIn} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
                                        Correo electrónico
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Tu correo electrónico"
                                        required
                                        autoComplete="email"
                                        className="w-full px-4 py-3 rounded-xl focus:outline-none transition-colors"
                                        style={{
                                            backgroundColor: 'var(--bg-primary)',
                                            border: '1px solid var(--border-color)',
                                            color: 'var(--text-primary)',
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
                                        Contraseña
                                    </label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Tu contraseña"
                                        required
                                        autoComplete="current-password"
                                        className="w-full px-4 py-3 rounded-xl focus:outline-none transition-colors"
                                        style={{
                                            backgroundColor: 'var(--bg-primary)',
                                            border: '1px solid var(--border-color)',
                                            color: 'var(--text-primary)',
                                        }}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={signingIn}
                                    className="w-full py-3 px-4 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ backgroundColor: 'var(--accent-color)', color: 'var(--bg-primary)' }}
                                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                                >
                                    {signingIn ? 'Iniciando sesión...' : 'Iniciar sesión'}
                                </button>
                            </form>
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
