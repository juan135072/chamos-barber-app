import { useState, useEffect } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import type { Database } from '../../../../lib/database.types'
import { calcularCategoriaCliente, DATA_RETENTION_POLICY, type ClienteCategoria } from '../../../../lib/data-retention-policy'
import toast from 'react-hot-toast'

interface ClienteConActividad {
  cliente_telefono: string
  cliente_nombre: string
  cliente_email: string | null
  ultima_cita: string
  total_citas: number
  meses_inactivo: number
  categoria: ClienteCategoria
  categoria_info: ReturnType<typeof calcularCategoriaCliente>
}

export default function ClientesTab() {
  const supabase = useSupabaseClient<Database>()
  const [clientes, setClientes] = useState<ClienteConActividad[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroCategoria, setFiltroCategoria] = useState<ClienteCategoria | 'TODOS'>('TODOS')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadClientes()
  }, [])

  const loadClientes = async () => {
    try {
      setLoading(true)

      // Obtener todas las citas agrupadas por cliente
      const { data: citas, error } = await supabase
        .from('citas')
        .select('cliente_telefono, cliente_nombre, cliente_email, fecha')
        .order('fecha', { ascending: false })

      if (error) throw error

      // Agrupar por cliente y calcular categoría
      const clientesMap = new Map<string, ClienteConActividad>()

      citas?.forEach(cita => {
        const key = cita.cliente_telefono
        const existing = clientesMap.get(key)

        if (!existing || new Date(cita.fecha) > new Date(existing.ultima_cita)) {
          const categoriaInfo = calcularCategoriaCliente(cita.fecha)
          
          clientesMap.set(key, {
            cliente_telefono: cita.cliente_telefono,
            cliente_nombre: cita.cliente_nombre,
            cliente_email: cita.cliente_email,
            ultima_cita: cita.fecha,
            total_citas: (existing?.total_citas || 0) + 1,
            meses_inactivo: categoriaInfo.meses_inactivo,
            categoria: categoriaInfo.categoria,
            categoria_info: categoriaInfo
          })
        } else if (existing) {
          existing.total_citas++
        }
      })

      const clientesArray = Array.from(clientesMap.values())
        .sort((a, b) => b.meses_inactivo - a.meses_inactivo)

      setClientes(clientesArray)
    } catch (error) {
      console.error('Error loading clientes:', error)
      toast.error('Error al cargar clientes')
    } finally {
      setLoading(false)
    }
  }

  // Filtrar clientes
  const clientesFiltrados = clientes.filter(cliente => {
    // Filtro por categoría
    if (filtroCategoria !== 'TODOS' && cliente.categoria !== filtroCategoria) return false

    // Búsqueda
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        cliente.cliente_nombre.toLowerCase().includes(searchLower) ||
        cliente.cliente_telefono.toLowerCase().includes(searchLower) ||
        (cliente.cliente_email?.toLowerCase() || '').includes(searchLower)
      )
    }

    return true
  })

  // Contar por categoría
  const contarPorCategoria = (cat: ClienteCategoria) => {
    return clientes.filter(c => c.categoria === cat).length
  }

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleExportarCliente = async (cliente: ClienteConActividad) => {
    try {
      // Obtener todas las citas del cliente
      const { data: citasCliente, error } = await supabase
        .from('citas')
        .select('*, barberos:barbero_id(nombre, apellido), servicios:servicio_id(nombre)')
        .eq('cliente_telefono', cliente.cliente_telefono)
        .order('fecha', { ascending: false })

      if (error) throw error

      // Crear JSON para exportar
      const exportData = {
        cliente: {
          nombre: cliente.cliente_nombre,
          telefono: cliente.cliente_telefono,
          email: cliente.cliente_email,
          total_citas: cliente.total_citas,
          ultima_cita: cliente.ultima_cita,
          categoria: cliente.categoria_info.label
        },
        citas: citasCliente,
        fecha_exportacion: new Date().toISOString()
      }

      // Descargar JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cliente_${cliente.cliente_telefono}_${new Date().toISOString().split('T')[0]}.json`
      a.click()

      toast.success('Historial exportado exitosamente')
    } catch (error) {
      console.error('Error exporting cliente:', error)
      toast.error('Error al exportar historial')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12" style={{ borderBottom: '2px solid var(--accent-color)' }}></div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: 'var(--accent-color)' }}>
          Gestión de Clientes
        </h2>
        <p className="text-sm sm:text-base" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
          {clientes.length} clientes registrados
        </p>
      </div>

      {/* Filtros por Categoría */}
      <div className="mb-6 overflow-x-auto scrollbar-hide pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setFiltroCategoria('TODOS')}
            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all ${
              filtroCategoria === 'TODOS'
                ? 'bg-accent text-white'
                : 'bg-secondary border border-border'
            }`}
            style={filtroCategoria === 'TODOS' ? {
              backgroundColor: 'var(--accent-color)',
              color: 'var(--bg-primary)'
            } : {
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)'
            }}
          >
            Todos ({clientes.length})
          </button>

          {Object.entries(DATA_RETENTION_POLICY.CATEGORIAS).map(([key, config]) => {
            const count = contarPorCategoria(key as ClienteCategoria)
            return (
              <button
                key={key}
                onClick={() => setFiltroCategoria(key as ClienteCategoria)}
                className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap flex items-center gap-2 transition-all ${
                  filtroCategoria === key
                    ? 'ring-2 ring-offset-2'
                    : 'border border-border'
                }`}
                style={filtroCategoria === key ? {
                  backgroundColor: config.color + '20',
                  color: config.color,
                  '--tw-ring-color': config.color
                } as React.CSSProperties : {
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)'
                }}
              >
                <span>{config.icon}</span>
                <span>{config.label}</span>
                <span className="font-bold">({count})</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Búsqueda */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar por nombre, teléfono o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 rounded-md border"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)'
          }}
        />
      </div>

      {/* Tabla / Cards */}
      {clientesFiltrados.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
          No se encontraron clientes
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto shadow rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <table className="min-w-full">
              <thead style={{ backgroundColor: 'var(--bg-primary)' }}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Categoría</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Última Cita</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Total Citas</th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientesFiltrados.map((cliente, index) => (
                  <tr
                    key={cliente.cliente_telefono}
                    style={{ borderTop: index > 0 ? '1px solid var(--border-color)' : 'none' }}
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {cliente.cliente_nombre}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                        {cliente.cliente_telefono}
                      </div>
                      {cliente.cliente_email && (
                        <div className="text-xs" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                          {cliente.cliente_email}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: cliente.categoria_info.color + '20',
                          color: cliente.categoria_info.color
                        }}
                      >
                        {cliente.categoria_info.icon} {cliente.categoria_info.label}
                      </span>
                      <div className="text-xs mt-1" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                        {cliente.meses_inactivo} meses
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-primary)' }}>
                      {formatearFecha(cliente.ultima_cita)}
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-primary)' }}>
                      {cliente.total_citas}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleExportarCliente(cliente)}
                        className="text-sm px-3 py-1 rounded hover:opacity-70 transition-opacity"
                        style={{ backgroundColor: 'var(--accent-color)', color: 'var(--bg-primary)' }}
                        title="Exportar historial"
                      >
                        <i className="fas fa-download mr-1"></i>
                        Exportar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {clientesFiltrados.map((cliente) => (
              <div
                key={cliente.cliente_telefono}
                className="p-4 rounded-lg border"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)'
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {cliente.cliente_nombre}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                      {cliente.cliente_telefono}
                    </p>
                  </div>
                  <span
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: cliente.categoria_info.color + '20',
                      color: cliente.categoria_info.color
                    }}
                  >
                    {cliente.categoria_info.icon} {cliente.categoria_info.label}
                  </span>
                </div>
                <div className="text-xs space-y-1 mb-3" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                  <p>Última cita: {formatearFecha(cliente.ultima_cita)}</p>
                  <p>Total citas: {cliente.total_citas}</p>
                  <p>Inactivo: {cliente.meses_inactivo} meses</p>
                </div>
                <button
                  onClick={() => handleExportarCliente(cliente)}
                  className="w-full text-sm px-3 py-2 rounded"
                  style={{ backgroundColor: 'var(--accent-color)', color: 'var(--bg-primary)' }}
                >
                  <i className="fas fa-download mr-2"></i>
                  Exportar Historial
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
