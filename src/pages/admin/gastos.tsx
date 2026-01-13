import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useSession } from '@supabase/auth-helpers-react'
import { supabase } from '@/lib/supabase'
import Head from 'next/head'
import Logo from '@/components/shared/Logo'
import AdminGastosManager from '@/components/admin/gastos/AdminGastosManager'
import CategoriasManager from '@/components/admin/gastos/CategoriasManager'
import AdminGastosReports from '@/components/admin/gastos/AdminGastosReports'

export default function GastosPage() {
    const router = useRouter()
    const session = useSession()
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'movimientos' | 'categorias' | 'reportes'>('movimientos')

    useEffect(() => {
        checkAdminAccess()
    }, [session])

    const checkAdminAccess = async () => {
        if (!session) {
            setLoading(false) // Let the redirect happen in effect or just render blank/loading
            if (!session) router.push('/chamos-acceso')
            return
        }

        const { data } = await supabase
            .from('admin_users')
            .select('rol')
            .eq('id', session.user.id)
            .single()

        if (!data || data.rol !== 'admin') {
            router.push('/chamos-acceso')
        } else {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    return (
        <>
            <Head>
                <title>Gestión de Gastos - Chamos Barber</title>
            </Head>

            <div className="min-h-screen bg-[#0A0A0A]">
                {/* Header */}
                <header className="fixed top-0 left-0 right-0 h-16 bg-[#111] border-b border-white/5 z-40 px-4 md:px-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/admin')}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <i className="fas fa-arrow-left"></i>
                        </button>
                        <Logo size="sm" withText={true} />
                        <span className="text-gray-600 mx-2">|</span>
                        <h1 className="text-white font-semibold">Gestión de Gastos y Costos</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:block text-right">
                            <p className="text-white text-sm font-medium">{session?.user.email}</p>
                            <p className="text-xs text-gray-500">Administrador</p>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="pt-24 pb-12 px-4 md:px-8 max-w-7xl mx-auto">
                    {/* Tabs */}
                    <div className="flex gap-4 mb-8 border-b border-white/10 pb-1 overflow-x-auto">
                        <button
                            onClick={() => setActiveTab('movimientos')}
                            className={`px-4 py-2 font-medium transition-colors relative whitespace-nowrap ${activeTab === 'movimientos' ? 'text-[#D4AF37]' : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            Movimientos
                            {activeTab === 'movimientos' && (
                                <div className="absolute bottom-[-5px] left-0 right-0 h-0.5 bg-[#D4AF37]"></div>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('categorias')}
                            className={`px-4 py-2 font-medium transition-colors relative whitespace-nowrap ${activeTab === 'categorias' ? 'text-[#D4AF37]' : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            Categorías
                            {activeTab === 'categorias' && (
                                <div className="absolute bottom-[-5px] left-0 right-0 h-0.5 bg-[#D4AF37]"></div>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('reportes')}
                            className={`px-4 py-2 font-medium transition-colors relative whitespace-nowrap ${activeTab === 'reportes' ? 'text-[#D4AF37]' : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            Informes
                            {activeTab === 'reportes' && (
                                <div className="absolute bottom-[-5px] left-0 right-0 h-0.5 bg-[#D4AF37]"></div>
                            )}
                        </button>
                    </div>

                    {/* Content */}
                    <div className="animate-fade-in">
                        {activeTab === 'movimientos' && <AdminGastosManager />}
                        {activeTab === 'categorias' && <CategoriasManager />}
                        {activeTab === 'reportes' && <AdminGastosReports />}
                    </div>
                </main>
            </div>
        </>
    )
}
