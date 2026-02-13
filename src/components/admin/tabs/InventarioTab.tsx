import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'

type Producto = {
    id: string
    nombre: string
    descripcion: string | null
    precio_venta: number
    precio_costo: number
    stock_actual: number
    stock_minimo: number
    categoria: string
    imagen_url: string | null
    codigo_barras: string | null
    activo: boolean
    created_at: string
    updated_at: string
}

type Movimiento = {
    id: string
    producto_id: string
    tipo: string
    cantidad: number
    stock_anterior: number
    stock_nuevo: number
    motivo: string | null
    created_at: string
    productos?: { nombre: string }
}

type SubTab = 'catalogo' | 'movimientos'

export default function InventarioTab() {
    const [subTab, setSubTab] = useState<SubTab>('catalogo')
    const [productos, setProductos] = useState<Producto[]>([])
    const [movimientos, setMovimientos] = useState<Movimiento[]>([])
    const [loading, setLoading] = useState(true)
    const [busqueda, setBusqueda] = useState('')
    const [categoriaFiltro, setCategoriaFiltro] = useState('')

    // Modal states
    const [modalProducto, setModalProducto] = useState(false)
    const [modalMovimiento, setModalMovimiento] = useState(false)
    const [productoEditando, setProductoEditando] = useState<Producto | null>(null)
    const [productoMovimiento, setProductoMovimiento] = useState<Producto | null>(null)

    // Form state
    const [form, setForm] = useState({
        nombre: '',
        descripcion: '',
        precio_venta: '',
        precio_costo: '',
        stock_actual: '',
        stock_minimo: '5',
        categoria: 'General',
        codigo_barras: '',
    })

    // Movement form
    const [movForm, setMovForm] = useState({
        tipo: 'entrada' as 'entrada' | 'salida' | 'ajuste',
        cantidad: '',
        motivo: '',
    })

    const cargarProductos = useCallback(async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            if (busqueda) params.set('buscar', busqueda)
            if (categoriaFiltro) params.set('categoria', categoriaFiltro)

            const res = await fetch(`/api/inventario/productos?${params}`)
            if (!res.ok) throw new Error('Error cargando productos')
            const data = await res.json()
            setProductos(data)
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }, [busqueda, categoriaFiltro])

    const cargarMovimientos = useCallback(async () => {
        try {
            const res = await fetch('/api/inventario/movimientos?limit=100')
            if (!res.ok) throw new Error('Error cargando movimientos')
            const data = await res.json()
            setMovimientos(data)
        } catch (error: any) {
            toast.error(error.message)
        }
    }, [])

    useEffect(() => {
        cargarProductos()
    }, [cargarProductos])

    useEffect(() => {
        if (subTab === 'movimientos') cargarMovimientos()
    }, [subTab, cargarMovimientos])

    // Categorías únicas
    const categorias = [...new Set(productos.map(p => p.categoria))].sort()

    const abrirCrear = () => {
        setProductoEditando(null)
        setForm({
            nombre: '',
            descripcion: '',
            precio_venta: '',
            precio_costo: '',
            stock_actual: '',
            stock_minimo: '5',
            categoria: 'General',
            codigo_barras: '',
        })
        setModalProducto(true)
    }

    const abrirEditar = (p: Producto) => {
        setProductoEditando(p)
        setForm({
            nombre: p.nombre,
            descripcion: p.descripcion || '',
            precio_venta: String(p.precio_venta),
            precio_costo: String(p.precio_costo),
            stock_actual: String(p.stock_actual),
            stock_minimo: String(p.stock_minimo),
            categoria: p.categoria,
            codigo_barras: p.codigo_barras || '',
        })
        setModalProducto(true)
    }

    const abrirMovimiento = (p: Producto) => {
        setProductoMovimiento(p)
        setMovForm({ tipo: 'entrada', cantidad: '', motivo: '' })
        setModalMovimiento(true)
    }

    const guardarProducto = async () => {
        if (!form.nombre.trim()) return toast.error('El nombre es requerido')
        if (!form.precio_venta || Number(form.precio_venta) <= 0) return toast.error('Precio de venta inválido')

        try {
            const body = {
                ...(productoEditando ? { id: productoEditando.id } : {}),
                nombre: form.nombre.trim(),
                descripcion: form.descripcion.trim() || null,
                precio_venta: Number(form.precio_venta),
                precio_costo: Number(form.precio_costo || 0),
                stock_actual: Number(form.stock_actual || 0),
                stock_minimo: Number(form.stock_minimo || 5),
                categoria: form.categoria.trim() || 'General',
                codigo_barras: form.codigo_barras.trim() || null,
            }

            const res = await fetch('/api/inventario/productos', {
                method: productoEditando ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error)
            }

            toast.success(productoEditando ? 'Producto actualizado' : 'Producto creado')
            setModalProducto(false)
            cargarProductos()
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    const desactivarProducto = async (id: string) => {
        if (!confirm('¿Desactivar este producto?')) return
        try {
            const res = await fetch(`/api/inventario/productos?id=${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Error desactivando producto')
            toast.success('Producto desactivado')
            cargarProductos()
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    const guardarMovimiento = async () => {
        if (!productoMovimiento) return
        if (!movForm.cantidad || Number(movForm.cantidad) <= 0) return toast.error('Cantidad inválida')

        try {
            const res = await fetch('/api/inventario/movimientos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    producto_id: productoMovimiento.id,
                    tipo: movForm.tipo,
                    cantidad: Number(movForm.cantidad),
                    motivo: movForm.motivo.trim() || null,
                }),
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error)
            }

            const result = await res.json()
            toast.success(`Stock actualizado: ${result.stockAnterior} → ${result.stockNuevo}`)
            setModalMovimiento(false)
            cargarProductos()
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    const formatoPrecio = (n: number) =>
        new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(n)

    const formatoFecha = (str: string) =>
        new Date(str).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '10px 14px',
        backgroundColor: '#1A1A1A',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '14px',
        outline: 'none',
    }

    const btnPrimary: React.CSSProperties = {
        padding: '10px 20px',
        backgroundColor: '#D4AF37',
        color: '#000',
        border: 'none',
        borderRadius: '8px',
        fontWeight: 600,
        cursor: 'pointer',
        fontSize: '14px',
    }

    const btnSecondary: React.CSSProperties = {
        padding: '10px 20px',
        backgroundColor: 'rgba(255,255,255,0.1)',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '14px',
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold" style={{ color: '#fff' }}>
                        <i className="fas fa-boxes-stacked mr-3" style={{ color: '#D4AF37' }} />
                        Inventario
                    </h2>
                    <p style={{ color: '#666', fontSize: '14px' }}>
                        Gestiona tus productos y controla el stock
                    </p>
                </div>
                <button onClick={abrirCrear} style={btnPrimary}>
                    <i className="fas fa-plus mr-2" />
                    Nuevo Producto
                </button>
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-2">
                {([
                    { id: 'catalogo', label: 'Catálogo', icon: 'fa-box' },
                    { id: 'movimientos', label: 'Movimientos', icon: 'fa-exchange-alt' },
                ] as const).map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setSubTab(tab.id)}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                        style={{
                            backgroundColor: subTab === tab.id ? '#D4AF37' : 'rgba(255,255,255,0.05)',
                            color: subTab === tab.id ? '#000' : '#888',
                            border: subTab === tab.id ? 'none' : '1px solid rgba(255,255,255,0.1)',
                        }}
                    >
                        <i className={`fas ${tab.icon} mr-2`} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Stock bajo alert */}
            {productos.filter(p => p.stock_actual <= p.stock_minimo && p.activo).length > 0 && (
                <div
                    className="p-4 rounded-xl flex items-center gap-3"
                    style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                    }}
                >
                    <i className="fas fa-exclamation-triangle" style={{ color: '#EF4444', fontSize: '18px' }} />
                    <div>
                        <p className="text-sm font-semibold" style={{ color: '#EF4444' }}>
                            Stock bajo en {productos.filter(p => p.stock_actual <= p.stock_minimo && p.activo).length} producto(s)
                        </p>
                        <p className="text-xs" style={{ color: '#999' }}>
                            {productos.filter(p => p.stock_actual <= p.stock_minimo && p.activo).map(p => p.nombre).join(', ')}
                        </p>
                    </div>
                </div>
            )}

            {/* CATÁLOGO */}
            {subTab === 'catalogo' && (
                <>
                    {/* Filtros */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 relative">
                            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#666' }} />
                            <input
                                type="text"
                                placeholder="Buscar producto..."
                                value={busqueda}
                                onChange={e => setBusqueda(e.target.value)}
                                style={{ ...inputStyle, paddingLeft: '36px' }}
                            />
                        </div>
                        <select
                            value={categoriaFiltro}
                            onChange={e => setCategoriaFiltro(e.target.value)}
                            style={{ ...inputStyle, width: 'auto', minWidth: '160px' }}
                        >
                            <option value="">Todas las categorías</option>
                            {categorias.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {/* Grid de productos */}
                    {loading ? (
                        <div className="text-center py-12">
                            <div
                                className="w-10 h-10 mx-auto mb-3 rounded-full animate-spin"
                                style={{ border: '2px solid rgba(212,175,55,0.2)', borderTopColor: '#D4AF37' }}
                            />
                            <p style={{ color: '#666' }}>Cargando productos...</p>
                        </div>
                    ) : productos.length === 0 ? (
                        <div className="text-center py-12">
                            <i className="fas fa-box-open text-4xl mb-4" style={{ color: '#333' }} />
                            <p style={{ color: '#666' }}>No hay productos registrados</p>
                            <button onClick={abrirCrear} className="mt-4" style={btnPrimary}>
                                <i className="fas fa-plus mr-2" />
                                Agregar primer producto
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {productos.map(p => (
                                <div
                                    key={p.id}
                                    className="rounded-xl p-4 transition-all hover:scale-[1.02]"
                                    style={{
                                        backgroundColor: '#111',
                                        border: `1px solid ${p.stock_actual <= p.stock_minimo ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.05)'}`,
                                    }}
                                >
                                    {/* Imagen o placeholder */}
                                    <div
                                        className="w-full h-32 rounded-lg mb-3 flex items-center justify-center overflow-hidden"
                                        style={{ backgroundColor: '#1A1A1A' }}
                                    >
                                        {p.imagen_url ? (
                                            <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover" />
                                        ) : (
                                            <i className="fas fa-box text-3xl" style={{ color: '#333' }} />
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold truncate" style={{ color: '#fff', fontSize: '15px' }}>
                                                {p.nombre}
                                            </h3>
                                            <p className="text-xs truncate" style={{ color: '#666' }}>
                                                {p.categoria}
                                            </p>
                                        </div>
                                        <span className="text-lg font-bold ml-2" style={{ color: '#D4AF37' }}>
                                            {formatoPrecio(p.precio_venta)}
                                        </span>
                                    </div>

                                    {/* Stock */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <i
                                                className={`fas ${p.stock_actual <= p.stock_minimo ? 'fa-exclamation-circle' : 'fa-cubes'}`}
                                                style={{ color: p.stock_actual <= p.stock_minimo ? '#EF4444' : '#10B981', fontSize: '12px' }}
                                            />
                                            <span className="text-sm" style={{ color: p.stock_actual <= p.stock_minimo ? '#EF4444' : '#888' }}>
                                                Stock: <strong>{p.stock_actual}</strong>
                                                {p.stock_actual <= p.stock_minimo && ' (bajo)'}
                                            </span>
                                        </div>
                                        {p.precio_costo > 0 && (
                                            <span className="text-xs" style={{ color: '#555' }}>
                                                Costo: {formatoPrecio(p.precio_costo)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => abrirMovimiento(p)}
                                            className="flex-1 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                                            style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }}
                                        >
                                            <i className="fas fa-exchange-alt mr-1" />
                                            Stock
                                        </button>
                                        <button
                                            onClick={() => abrirEditar(p)}
                                            className="flex-1 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                                            style={{ backgroundColor: 'rgba(59,130,246,0.15)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.3)' }}
                                        >
                                            <i className="fas fa-pen mr-1" />
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => desactivarProducto(p.id)}
                                            className="py-2 px-3 rounded-lg text-xs transition-all hover:opacity-80"
                                            style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.3)' }}
                                        >
                                            <i className="fas fa-trash" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* MOVIMIENTOS */}
            {subTab === 'movimientos' && (
                <div
                    className="rounded-xl overflow-hidden"
                    style={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                    {movimientos.length === 0 ? (
                        <div className="text-center py-12">
                            <i className="fas fa-exchange-alt text-4xl mb-4" style={{ color: '#333' }} />
                            <p style={{ color: '#666' }}>No hay movimientos registrados</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                        {['Fecha', 'Producto', 'Tipo', 'Cantidad', 'Antes', 'Después', 'Motivo'].map(h => (
                                            <th
                                                key={h}
                                                className="text-left px-4 py-3 text-xs font-semibold uppercase"
                                                style={{ color: '#666' }}
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {movimientos.map(m => (
                                        <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td className="px-4 py-3 text-sm" style={{ color: '#999' }}>
                                                {formatoFecha(m.created_at)}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium" style={{ color: '#fff' }}>
                                                {(m as any).productos?.nombre || '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className="text-xs px-2 py-1 rounded-full font-medium"
                                                    style={{
                                                        backgroundColor:
                                                            m.tipo === 'entrada' ? 'rgba(16,185,129,0.15)' :
                                                                m.tipo === 'salida' ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)',
                                                        color:
                                                            m.tipo === 'entrada' ? '#10B981' :
                                                                m.tipo === 'salida' ? '#EF4444' : '#3B82F6',
                                                    }}
                                                >
                                                    {m.tipo === 'entrada' && <i className="fas fa-arrow-down mr-1" />}
                                                    {m.tipo === 'salida' && <i className="fas fa-arrow-up mr-1" />}
                                                    {m.tipo === 'ajuste' && <i className="fas fa-sliders-h mr-1" />}
                                                    {m.tipo.charAt(0).toUpperCase() + m.tipo.slice(1)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm font-bold" style={{ color: '#D4AF37' }}>
                                                {m.tipo === 'entrada' ? '+' : m.tipo === 'salida' ? '-' : ''}
                                                {m.cantidad}
                                            </td>
                                            <td className="px-4 py-3 text-sm" style={{ color: '#666' }}>{m.stock_anterior}</td>
                                            <td className="px-4 py-3 text-sm font-medium" style={{ color: '#fff' }}>{m.stock_nuevo}</td>
                                            <td className="px-4 py-3 text-sm" style={{ color: '#888' }}>{m.motivo || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL: Crear/Editar Producto */}
            {modalProducto && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
                    onClick={() => setModalProducto(false)}
                >
                    <div
                        className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
                        style={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold mb-6" style={{ color: '#fff' }}>
                            <i className="fas fa-box mr-2" style={{ color: '#D4AF37' }} />
                            {productoEditando ? 'Editar Producto' : 'Nuevo Producto'}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium mb-1" style={{ color: '#888' }}>Nombre *</label>
                                <input
                                    value={form.nombre}
                                    onChange={e => setForm({ ...form, nombre: e.target.value })}
                                    placeholder="Ej: Cera para cabello"
                                    style={inputStyle}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium mb-1" style={{ color: '#888' }}>Descripción</label>
                                <textarea
                                    value={form.descripcion}
                                    onChange={e => setForm({ ...form, descripcion: e.target.value })}
                                    placeholder="Descripción opcional"
                                    rows={2}
                                    style={{ ...inputStyle, resize: 'vertical' as const }}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium mb-1" style={{ color: '#888' }}>Precio Venta *</label>
                                    <input
                                        type="number"
                                        value={form.precio_venta}
                                        onChange={e => setForm({ ...form, precio_venta: e.target.value })}
                                        placeholder="0"
                                        min="0"
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1" style={{ color: '#888' }}>Precio Costo</label>
                                    <input
                                        type="number"
                                        value={form.precio_costo}
                                        onChange={e => setForm({ ...form, precio_costo: e.target.value })}
                                        placeholder="0"
                                        min="0"
                                        style={inputStyle}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium mb-1" style={{ color: '#888' }}>Stock Actual</label>
                                    <input
                                        type="number"
                                        value={form.stock_actual}
                                        onChange={e => setForm({ ...form, stock_actual: e.target.value })}
                                        placeholder="0"
                                        min="0"
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1" style={{ color: '#888' }}>Stock Mínimo</label>
                                    <input
                                        type="number"
                                        value={form.stock_minimo}
                                        onChange={e => setForm({ ...form, stock_minimo: e.target.value })}
                                        placeholder="5"
                                        min="0"
                                        style={inputStyle}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium mb-1" style={{ color: '#888' }}>Categoría</label>
                                    <input
                                        value={form.categoria}
                                        onChange={e => setForm({ ...form, categoria: e.target.value })}
                                        placeholder="General"
                                        list="categorias-list"
                                        style={inputStyle}
                                    />
                                    <datalist id="categorias-list">
                                        {categorias.map(c => <option key={c} value={c} />)}
                                        {['Ceras', 'Aceites', 'Shampoos', 'Accesorios', 'Aftershave'].map(c =>
                                            !categorias.includes(c) && <option key={c} value={c} />
                                        )}
                                    </datalist>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1" style={{ color: '#888' }}>Código de barras</label>
                                    <input
                                        value={form.codigo_barras}
                                        onChange={e => setForm({ ...form, codigo_barras: e.target.value })}
                                        placeholder="Opcional"
                                        style={inputStyle}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setModalProducto(false)} style={btnSecondary} className="flex-1">
                                Cancelar
                            </button>
                            <button onClick={guardarProducto} style={btnPrimary} className="flex-1">
                                <i className="fas fa-check mr-2" />
                                {productoEditando ? 'Guardar cambios' : 'Crear producto'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: Movimiento de Stock */}
            {modalMovimiento && productoMovimiento && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
                    onClick={() => setModalMovimiento(false)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl p-6"
                        style={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold mb-2" style={{ color: '#fff' }}>
                            <i className="fas fa-exchange-alt mr-2" style={{ color: '#D4AF37' }} />
                            Movimiento de Stock
                        </h3>
                        <p className="text-sm mb-6" style={{ color: '#888' }}>
                            {productoMovimiento.nombre} — Stock actual: <strong style={{ color: '#D4AF37' }}>{productoMovimiento.stock_actual}</strong>
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium mb-2" style={{ color: '#888' }}>Tipo de movimiento</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {([
                                        { id: 'entrada', label: 'Entrada', icon: 'fa-arrow-down', color: '#10B981' },
                                        { id: 'salida', label: 'Salida', icon: 'fa-arrow-up', color: '#EF4444' },
                                        { id: 'ajuste', label: 'Ajuste', icon: 'fa-sliders-h', color: '#3B82F6' },
                                    ] as const).map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => setMovForm({ ...movForm, tipo: t.id })}
                                            className="py-3 rounded-lg text-sm font-medium transition-all"
                                            style={{
                                                backgroundColor: movForm.tipo === t.id ? `${t.color}20` : 'rgba(255,255,255,0.05)',
                                                color: movForm.tipo === t.id ? t.color : '#666',
                                                border: `1px solid ${movForm.tipo === t.id ? `${t.color}50` : 'rgba(255,255,255,0.1)'}`,
                                            }}
                                        >
                                            <i className={`fas ${t.icon} mr-1`} />
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium mb-1" style={{ color: '#888' }}>
                                    {movForm.tipo === 'ajuste' ? 'Nuevo stock' : 'Cantidad'}
                                </label>
                                <input
                                    type="number"
                                    value={movForm.cantidad}
                                    onChange={e => setMovForm({ ...movForm, cantidad: e.target.value })}
                                    placeholder="0"
                                    min="0"
                                    style={inputStyle}
                                />
                                {movForm.tipo !== 'ajuste' && movForm.cantidad && (
                                    <p className="text-xs mt-1" style={{ color: '#666' }}>
                                        Resultado: {productoMovimiento.stock_actual} {movForm.tipo === 'entrada' ? '+' : '-'} {movForm.cantidad} = {' '}
                                        <strong style={{ color: '#D4AF37' }}>
                                            {movForm.tipo === 'entrada'
                                                ? productoMovimiento.stock_actual + Number(movForm.cantidad)
                                                : productoMovimiento.stock_actual - Number(movForm.cantidad)}
                                        </strong>
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-medium mb-1" style={{ color: '#888' }}>Motivo (opcional)</label>
                                <input
                                    value={movForm.motivo}
                                    onChange={e => setMovForm({ ...movForm, motivo: e.target.value })}
                                    placeholder="Ej: Reposición de inventario"
                                    style={inputStyle}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setModalMovimiento(false)} style={btnSecondary} className="flex-1">
                                Cancelar
                            </button>
                            <button onClick={guardarMovimiento} style={btnPrimary} className="flex-1">
                                <i className="fas fa-check mr-2" />
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
