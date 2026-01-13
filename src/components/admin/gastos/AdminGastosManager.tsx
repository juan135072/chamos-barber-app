import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type Gasto = {
    id: string
    descripcion: string
    monto: number
    tipo: 'GASTO' | 'COSTO'
    fecha: string
    categoria: { nombre: string } | null
    created_at: string
}

type Categoria = {
    id: string
    nombre: string
}

export default function AdminGastosManager() {
    const [gastos, setGastos] = useState<Gasto[]>([])
    const [loading, setLoading] = useState(true)
    const [categorias, setCategorias] = useState<Categoria[]>([])
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0])
    const [showForm, setShowForm] = useState(false)

    // Form State
    const [descripcion, setDescripcion] = useState('')
    const [monto, setMonto] = useState('')
    const [tipo, setTipo] = useState<'GASTO' | 'COSTO'>('GASTO')
    const [categoriaId, setCategoriaId] = useState('')

    useEffect(() => {
        loadGastos()
        loadCategorias()
    }, [filterDate])

    const loadCategorias = async () => {
        const { data } = await supabase
            .from('gastos_categorias')
            .select('id, nombre')
            .eq('activo', true)
            .order('nombre')
        setCategorias(data || [])
    }

    const loadGastos = async () => {
        try {
            setLoading(true)

            // Construir rango del mes para la vista principal si se desea,
            // pero por ahora filtremos por fecha exacta o permitamos ver todo el mes.
            // Simplificación: Cargar los del mes de la fecha seleccionada.
            const dateObj = new Date(filterDate)
            const startOfMonth = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1).toISOString()
            const endOfMonth = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0).toISOString()

            const { data, error } = await supabase
                .from('gastos')
                .select(`
          *,
          categoria:gastos_categorias(nombre)
        `)
                .gte('fecha', startOfMonth)
                .lte('fecha', endOfMonth)
                .order('fecha', { ascending: false })
                .order('created_at', { ascending: false })

            if (error) throw error
            setGastos(data || [])
        } catch (error) {
            console.error('Error loading gastos:', error)
            toast.error('Error al cargar movimientos')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!descripcion || !monto || !categoriaId) {
            toast.error('Completa todos los campos')
            return
        }

        try {
            const { error } = await supabase
                .from('gastos')
                .insert([{
                    descripcion,
                    monto: parseFloat(monto),
                    tipo,
                    categoria_id: categoriaId,
                    fecha: filterDate, // Usamos la fecha seleccionada o hoy
                    registrado_por: (await supabase.auth.getUser()).data.user?.id
                }])

            if (error) throw error

            toast.success('Movimiento registrado')
            setShowForm(false)
            resetForm()
            loadGastos()
        } catch (error) {
            console.error('Error saving gasto:', error)
            toast.error('Error al guardar')
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Seguro que deseas eliminar este registro?')) return

        try {
            const { error } = await supabase
                .from('gastos')
                .delete()
                .eq('id', id)

            if (error) throw error
            toast.success('Registro eliminado')
            loadGastos()
        } catch (error) {
            toast.error('Error al eliminar')
        }
    }

    const resetForm = () => {
        setDescripcion('')
        setMonto('')
        setCategoriaId('')
    }

    const totalGastos = gastos
        .filter(g => g.tipo === 'GASTO')
        .reduce((sum, g) => sum + Number(g.monto), 0)

    const totalCostos = gastos
        .filter(g => g.tipo === 'COSTO')
        .reduce((sum, g) => sum + Number(g.monto), 0)

    return (
        <div className="space-y-6">
            {/* Resumen Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#111] p-6 rounded-xl border border-white/5">
                    <p className="text-gray-400 text-sm mb-1">Total Gastos (Mes)</p>
                    <p className="text-3xl font-bold text-red-500">${totalGastos.toLocaleString()}</p>
                </div>
                <div className="bg-[#111] p-6 rounded-xl border border-white/5">
                    <p className="text-gray-400 text-sm mb-1">Total Costos (Mes)</p>
                    <p className="text-3xl font-bold text-blue-500">${totalCostos.toLocaleString()}</p>
                </div>
                <div className="bg-[#111] p-6 rounded-xl border border-white/5 flex items-center justify-between">
                    <div>
                        <p className="text-gray-400 text-sm mb-1">Fecha Vista</p>
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            className="bg-transparent text-white font-medium focus:outline-none"
                        />
                    </div>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="w-12 h-12 rounded-full bg-[#D4AF37] text-black flex items-center justify-center hover:bg-[#B8941F] transition-colors"
                    >
                        <i className={`fas ${showForm ? 'fa-minus' : 'fa-plus'}`}></i>
                    </button>
                </div>
            </div>

            {/* Formulario Inline */}
            {showForm && (
                <div className="bg-[#111] p-6 rounded-xl border border-white/5 animate-fade-in-down">
                    <h3 className="text-lg font-semibold text-white mb-4">Nuevo Movimiento</h3>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                        <div className="lg:col-span-1">
                            <label className="block text-xs text-gray-500 mb-1">Tipo</label>
                            <select
                                value={tipo}
                                onChange={(e) => setTipo(e.target.value as 'GASTO' | 'COSTO')}
                                className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-white focus:border-[#D4AF37]"
                            >
                                <option value="GASTO">GASTO</option>
                                <option value="COSTO">COSTO</option>
                            </select>
                        </div>

                        <div className="lg:col-span-1">
                            <label className="block text-xs text-gray-500 mb-1">Categoría</label>
                            <select
                                value={categoriaId}
                                onChange={(e) => setCategoriaId(e.target.value)}
                                className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-white focus:border-[#D4AF37]"
                            >
                                <option value="">Seleccionar...</option>
                                {categorias.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <div className="lg:col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">Descripción</label>
                            <input
                                type="text"
                                value={descripcion}
                                onChange={(e) => setDescripcion(e.target.value)}
                                placeholder="Detalle del gasto..."
                                className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-white focus:border-[#D4AF37]"
                            />
                        </div>

                        <div className="lg:col-span-1">
                            <label className="block text-xs text-gray-500 mb-1">Monto</label>
                            <input
                                type="number"
                                step="0.01"
                                value={monto}
                                onChange={(e) => setMonto(e.target.value)}
                                placeholder="0.00"
                                className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-white focus:border-[#D4AF37]"
                            />
                        </div>

                        <button
                            type="submit"
                            className="lg:col-span-5 w-full bg-[#D4AF37] text-black font-bold py-2 rounded-lg hover:bg-[#B8941F]"
                        >
                            Registrar Movimiento
                        </button>
                    </form>
                </div>
            )}

            {/* Lista de Movimientos */}
            <div className="bg-[#111] rounded-xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Descripción</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Categoría</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Tipo</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Monto</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                        Cargando movimientos...
                                    </td>
                                </tr>
                            ) : gastos.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                        No hay movimientos registrados en este período.
                                    </td>
                                </tr>
                            ) : (
                                gastos.map((gasto) => (
                                    <tr key={gasto.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                            {format(new Date(gasto.fecha), 'dd/MM/yyyy')}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-white">
                                            {gasto.descripcion}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                            {gasto.categoria?.nombre || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${gasto.tipo === 'GASTO' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
                                                }`}>
                                                {gasto.tipo}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-white">
                                            ${Number(gasto.monto).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                                            <button
                                                onClick={() => handleDelete(gasto.id)}
                                                className="text-red-400 hover:text-red-300 transition-colors"
                                                title="Eliminar"
                                            >
                                                <i className="fas fa-trash-alt"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
