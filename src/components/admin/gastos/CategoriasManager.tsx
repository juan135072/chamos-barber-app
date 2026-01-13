import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'

type Categoria = {
    id: string
    nombre: string
    tipo: 'GASTO' | 'COSTO'
    activo: boolean
}

export default function CategoriasManager() {
    const [categorias, setCategorias] = useState<Categoria[]>([])
    const [loading, setLoading] = useState(true)
    const [isEditing, setIsEditing] = useState<string | null>(null)

    // Form states
    const [nombre, setNombre] = useState('')
    const [tipo, setTipo] = useState<'GASTO' | 'COSTO'>('GASTO')

    useEffect(() => {
        loadCategorias()
    }, [])

    const loadCategorias = async () => {
        try {
            setLoading(true)
            const { data, error } = await (supabase as any)
                .from('gastos_categorias')
                .select('*')
                .order('nombre')

            if (error) throw error
            setCategorias(data || [])
        } catch (error) {
            console.error('Error loading categorias:', error)
            toast.error('Error al cargar categorías')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!nombre.trim()) return

        try {
            if (isEditing) {
                const { error } = await (supabase as any)
                    .from('gastos_categorias')
                    .update({ nombre, tipo })
                    .eq('id', isEditing)

                if (error) throw error
                toast.success('Categoría actualizada')
            } else {
                const { error } = await (supabase as any)
                    .from('gastos_categorias')
                    .insert([{ nombre, tipo, activo: true }])

                if (error) throw error
                toast.success('Categoría creada')
            }

            setNombre('')
            setTipo('GASTO')
            setIsEditing(null)
            loadCategorias()
        } catch (error) {
            console.error('Error saving categoria:', error)
            toast.error('Error al guardar categoría')
        }
    }

    const toggleActivo = async (id: string, current: boolean) => {
        try {
            const { error } = await (supabase as any)
                .from('gastos_categorias')
                .update({ activo: !current })
                .eq('id', id)

            if (error) throw error
            loadCategorias()
        } catch (error) {
            console.error('Error toggling categoria:', error)
            toast.error('Error al actualizar estado')
        }
    }

    const startEdit = (cat: Categoria) => {
        setIsEditing(cat.id)
        setNombre(cat.nombre)
        setTipo(cat.tipo)
    }

    const cancelEdit = () => {
        setIsEditing(null)
        setNombre('')
        setTipo('GASTO')
    }

    return (
        <div className="space-y-6">
            <div className="bg-[#111] p-6 rounded-xl border border-white/5">
                <h3 className="text-xl font-semibold text-white mb-4">
                    {isEditing ? 'Editar Categoría' : 'Nueva Categoría'}
                </h3>

                <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-sm text-gray-400 mb-1">Nombre</label>
                        <input
                            type="text"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
                            placeholder="Ej. Insumos de Limpieza"
                            required
                        />
                    </div>

                    <div className="w-full md:w-48">
                        <label className="block text-sm text-gray-400 mb-1">Tipo</label>
                        <select
                            value={tipo}
                            onChange={(e) => setTipo(e.target.value as 'GASTO' | 'COSTO')}
                            className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
                        >
                            <option value="GASTO">GASTO</option>
                            <option value="COSTO">COSTO</option>
                        </select>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        <button
                            type="submit"
                            className="px-6 py-2 bg-[#D4AF37] text-black font-semibold rounded-lg hover:bg-[#B8941F] transition-colors w-full md:w-auto"
                        >
                            {isEditing ? 'Actualizar' : 'Crear'}
                        </button>
                        {isEditing && (
                            <button
                                type="button"
                                onClick={cancelEdit}
                                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                            >
                                Cancelar
                            </button>
                        )}
                    </div>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loading ? (
                    <div className="col-span-2 text-center py-8 text-gray-500">Cargando...</div>
                ) : (
                    categorias.map((cat) => (
                        <div
                            key={cat.id}
                            className={`p-4 rounded-xl border transition-all ${cat.activo ? 'bg-[#111] border-white/5' : 'bg-[#111]/50 border-white/5 opacity-60'
                                }`}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-medium text-white text-lg">{cat.nombre}</h4>
                                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${cat.tipo === 'GASTO' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                                        }`}>
                                        {cat.tipo}
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => startEdit(cat)}
                                        className="p-2 text-gray-400 hover:text-[#D4AF37] transition-colors"
                                        title="Editar"
                                    >
                                        <i className="fas fa-edit"></i>
                                    </button>
                                    <button
                                        onClick={() => toggleActivo(cat.id, cat.activo)}
                                        className={`p-2 transition-colors ${cat.activo ? 'text-green-500 hover:text-green-400' : 'text-gray-500 hover:text-gray-400'
                                            }`}
                                        title={cat.activo ? 'Desactivar' : 'Activar'}
                                    >
                                        <i className={`fas ${cat.activo ? 'fa-toggle-on' : 'fa-toggle-off'}`}></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
