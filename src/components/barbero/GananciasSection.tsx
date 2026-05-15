import { useState, useEffect } from 'react'
import { supabase, Database } from '@/lib/supabase'
import toast from 'react-hot-toast'

type Factura = Database['public']['Tables']['facturas']['Row']

interface GananciaDia {
  fecha: string
  total_ventas: number
  numero_servicios: number
  comision_barbero: number
  porcentaje_promedio: number
}

interface GananciasSectionProps {
  barberoId: string
}

export default function GananciasSection({ barberoId }: GananciasSectionProps) {
  const [ganancias, setGanancias] = useState<GananciaDia[]>([])
  const [loading, setLoading] = useState(true)
  const [fechaInicio, setFechaInicio] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [fechaFin, setFechaFin] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [tipoFiltro, setTipoFiltro] = useState<'dia' | 'rango' | 'mes'>('dia')

  useEffect(() => {
    if (barberoId) {
      cargarGanancias()
    }
  }, [fechaInicio, fechaFin, tipoFiltro, barberoId])

  const cargarGanancias = async () => {
    try {
      setLoading(true)

      // Calcular rango de fechas según el tipo de filtro
      let inicio = fechaInicio
      let fin = fechaFin

      if (tipoFiltro === 'mes') {
        const fecha = new Date(fechaInicio)
        inicio = new Date(fecha.getFullYear(), fecha.getMonth(), 1)
          .toISOString()
          .split('T')[0]
        fin = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0)
          .toISOString()
          .split('T')[0]
      } else if (tipoFiltro === 'dia') {
        fin = fechaInicio
      }

      // Crear fechas con hora para incluir todo el día
      const fechaInicioCompleta = `${inicio}T00:00:00.000Z`
      const fechaFinCompleta = `${fin}T23:59:59.999Z`

      // Obtener facturas del barbero en el rango de fechas (solo las no anuladas)
      const { data: facturas, error: errorFacturas } = await (supabase as any)
        .from('facturas')
        .select('*')
        .eq('barbero_id', barberoId)
        .gte('created_at', fechaInicioCompleta)
        .lte('created_at', fechaFinCompleta)
        .eq('anulada', false)
        .order('created_at', { ascending: false })

      if (errorFacturas) throw errorFacturas

      // Si es un solo día, mostrar resumen del día
      if (tipoFiltro === 'dia') {
        const totalVentas = facturas?.reduce((sum: number, f: any) => sum + f.total, 0) ?? 0
        const totalComision = facturas?.reduce((sum: number, f: any) => sum + (f.comision_barbero ?? 0), 0) ?? 0
        const numServicios = facturas?.length || 0

        setGanancias([
          {
            fecha: fechaInicio,
            total_ventas: totalVentas,
            numero_servicios: numServicios,
            comision_barbero: totalComision,
            porcentaje_promedio: totalVentas > 0 ? (totalComision / totalVentas) * 100 : 0,
          },
        ])
      } else {
        // Para rango o mes, agrupar por día
        const gananciasMap = new Map<string, GananciaDia>()

        facturas?.forEach((factura: Factura) => {
          const fecha = factura.created_at.split('T')[0]
          const existing = gananciasMap.get(fecha)

          if (existing) {
            existing.total_ventas += factura.total
            existing.numero_servicios += 1
            existing.comision_barbero += factura.comision_barbero
            existing.porcentaje_promedio =
              (existing.comision_barbero / existing.total_ventas) * 100
          } else {
            gananciasMap.set(fecha, {
              fecha,
              total_ventas: factura.total,
              numero_servicios: 1,
              comision_barbero: factura.comision_barbero,
              porcentaje_promedio: (factura.comision_barbero / factura.total) * 100,
            })
          }
        })

        // Convertir a array y ordenar por fecha (descendente)
        const gananciasArray = Array.from(gananciasMap.values()).sort(
          (a, b) => b.fecha.localeCompare(a.fecha)
        )

        setGanancias(gananciasArray)
      }
    } catch (error) {
      console.error('Error cargando ganancias:', error)
      toast.error('Error al cargar las ganancias')
    } finally {
      setLoading(false)
    }
  }

  const calcularTotales = () => {
    const totales = ganancias.reduce(
      (acc, ganancia) => {
        acc.total_ventas += ganancia.total_ventas
        acc.total_comisiones += ganancia.comision_barbero
        acc.numero_servicios += ganancia.numero_servicios
        return acc
      },
      {
        total_ventas: 0,
        total_comisiones: 0,
        numero_servicios: 0,
      }
    )
    return totales
  }

  const handleTipoFiltroChange = (tipo: 'dia' | 'rango' | 'mes') => {
    setTipoFiltro(tipo)
    if (tipo === 'dia') {
      setFechaFin(fechaInicio)
    }
  }

  const setHoy = () => {
    const hoy = new Date().toISOString().split('T')[0]
    setFechaInicio(hoy)
    setFechaFin(hoy)
    setTipoFiltro('dia')
  }

  const setAyer = () => {
    const ayer = new Date()
    ayer.setDate(ayer.getDate() - 1)
    const fecha = ayer.toISOString().split('T')[0]
    setFechaInicio(fecha)
    setFechaFin(fecha)
    setTipoFiltro('dia')
  }

  const setMesActual = () => {
    const hoy = new Date().toISOString().split('T')[0]
    setFechaInicio(hoy)
    setTipoFiltro('mes')
  }

  const formatearFecha = (fecha: string) => {
    const date = new Date(fecha + 'T12:00:00')
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const totales = calcularTotales()

  return (
    <div className="mt-2">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-3">
            <i className="fas fa-chart-line text-gold"></i> Mis Ganancias
          </h2>
          <p className="text-white/50 text-sm mt-1">
            Consulta tus ganancias y comisiones por período
          </p>
        </div>
      </div>

      {/* Filtros de Fecha */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 mb-6 backdrop-blur-xl">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <i className="fas fa-filter text-gold"></i> Filtros de Fecha
          </h3>
        </div>

        {/* Botones rápidos */}
        <div className="flex flex-wrap gap-4 mb-6">
          <button className="px-4 py-2 bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 rounded-xl text-white text-sm font-bold uppercase tracking-wider transition-colors flex items-center gap-2" onClick={setHoy}>
            <i className="fas fa-calendar-day text-gold"></i> Hoy
          </button>
          <button className="px-4 py-2 bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 rounded-xl text-white text-sm font-bold uppercase tracking-wider transition-colors flex items-center gap-2" onClick={setAyer}>
            <i className="fas fa-calendar-minus text-gold"></i> Ayer
          </button>
          <button className="px-4 py-2 bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 rounded-xl text-white text-sm font-bold uppercase tracking-wider transition-colors flex items-center gap-2" onClick={setMesActual}>
            <i className="fas fa-calendar-alt text-gold"></i> Mes Actual
          </button>
        </div>

        {/* Tipo de filtro */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-3">Tipo de Reporte:</label>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-white cursor-pointer group">
              <input
                type="radio"
                name="tipoFiltro"
                value="dia"
                checked={tipoFiltro === 'dia'}
                onChange={() => handleTipoFiltroChange('dia')}
                className="accent-gold w-4 h-4 cursor-pointer"
              />
              <span className="group-hover:text-gold transition-colors">Día Específico</span>
            </label>
            <label className="flex items-center gap-2 text-white cursor-pointer group">
              <input
                type="radio"
                name="tipoFiltro"
                value="rango"
                checked={tipoFiltro === 'rango'}
                onChange={() => handleTipoFiltroChange('rango')}
                className="accent-gold w-4 h-4 cursor-pointer"
              />
              <span className="group-hover:text-gold transition-colors">Rango de Fechas</span>
            </label>
            <label className="flex items-center gap-2 text-white cursor-pointer group">
              <input
                type="radio"
                name="tipoFiltro"
                value="mes"
                checked={tipoFiltro === 'mes'}
                onChange={() => handleTipoFiltroChange('mes')}
                className="accent-gold w-4 h-4 cursor-pointer"
              />
              <span className="group-hover:text-gold transition-colors">Mes Completo</span>
            </label>
          </div>
        </div>

        {/* Selectores de fecha */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2">
              {tipoFiltro === 'mes' ? 'Mes:' : 'Fecha Inicio:'}
            </label>
            <input
              type={tipoFiltro === 'mes' ? 'month' : 'date'}
              className="w-full px-4 py-2 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold transition-colors"
              value={
                tipoFiltro === 'mes'
                  ? fechaInicio.substring(0, 7)
                  : fechaInicio
              }
              onChange={(e) => {
                if (tipoFiltro === 'mes') {
                  setFechaInicio(`${e.target.value}-01`)
                } else {
                  setFechaInicio(e.target.value)
                  if (tipoFiltro === 'dia') {
                    setFechaFin(e.target.value)
                  }
                }
              }}
            />
          </div>

          {tipoFiltro === 'rango' && (
            <div>
              <label className="block text-xs font-bold text-white/70 uppercase tracking-wider mb-2">Fecha Fin:</label>
              <input
                type="date"
                className="w-full px-4 py-2 bg-[#0a0a0a] border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold transition-colors"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                min={fechaInicio}
              />
            </div>
          )}
        </div>
      </div>

      {/* Tarjetas de Totales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/[0.02] border border-white/10 p-6 rounded-2xl backdrop-blur-xl group hover:border-gold/30 transition-all">
          <div className="flex gap-4 items-center">
            <div className="w-14 h-14 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              <i className="fas fa-dollar-sign"></i>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-1">Total Ventas</h4>
              <p className="text-3xl font-black text-white mb-1">${totales.total_ventas.toFixed(2)}</p>
              <p className="text-xs text-white/40">
                {totales.numero_servicios} servicio{totales.numero_servicios !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/10 p-6 rounded-2xl backdrop-blur-xl group hover:border-gold/30 transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          <div className="flex gap-4 items-center relative z-10">
            <div className="w-14 h-14 rounded-xl bg-gold/10 text-gold flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              <i className="fas fa-wallet"></i>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-1">Mis Ganancias</h4>
              <p className="text-3xl font-black text-gold mb-1">${totales.total_comisiones.toFixed(2)}</p>
              <p className="text-xs text-white/40">
                {totales.total_ventas > 0
                  ? `${((totales.total_comisiones / totales.total_ventas) * 100).toFixed(1)}%`
                  : '0%'}{' '}
                de comisión
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/10 p-6 rounded-2xl backdrop-blur-xl group hover:border-gold/30 transition-all">
          <div className="flex gap-4 items-center">
            <div className="w-14 h-14 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              <i className="fas fa-chart-bar"></i>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-1">Promedio por Servicio</h4>
              <p className="text-3xl font-black text-white mb-1">
                ${totales.numero_servicios > 0
                  ? (totales.total_comisiones / totales.numero_servicios).toFixed(2)
                  : '0.00'}
              </p>
              <p className="text-xs text-white/40">
                Ganancia por servicio
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Ganancias por Día */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl backdrop-blur-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gold">
            <i className="fas fa-spinner fa-spin text-4xl mb-4"></i>
            <p className="text-white/70 font-bold uppercase tracking-wider text-sm">Cargando ganancias...</p>
          </div>
        ) : ganancias.length === 0 ? (
          <div className="p-12 text-center text-white/40">
            <i className="fas fa-inbox text-5xl mb-4 text-white/20"></i>
            <p className="font-medium">No hay ventas registradas en el período seleccionado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white/5">
                <tr>
                  <th className="p-4 text-xs font-bold text-white/70 uppercase tracking-wider border-b border-white/10">Fecha</th>
                  <th className="p-4 text-xs font-bold text-white/70 uppercase tracking-wider border-b border-white/10 text-center">Servicios</th>
                  <th className="p-4 text-xs font-bold text-white/70 uppercase tracking-wider border-b border-white/10 text-right">Total Ventas</th>
                  <th className="p-4 text-xs font-bold text-white/70 uppercase tracking-wider border-b border-white/10 text-center">% Comisión</th>
                  <th className="p-4 text-xs font-bold text-white/70 uppercase tracking-wider border-b border-white/10 text-right">Mis Ganancias</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {ganancias.map((ganancia) => (
                  <tr key={ganancia.fecha} className="hover:bg-white/[0.03] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3 text-white font-medium">
                        <i className="fas fa-calendar text-gold"></i>
                        <span>{formatearFecha(ganancia.fecha)}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-bold">
                        {ganancia.numero_servicios}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <strong className="text-white">${ganancia.total_ventas.toFixed(2)}</strong>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1 bg-gold/20 text-gold rounded-lg text-xs font-bold">
                        {ganancia.porcentaje_promedio.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-gold font-black text-lg">
                        ${ganancia.comision_barbero.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {ganancias.length > 1 && (
                <tfoot className="bg-white/5 border-t-2 border-gold/30">
                  <tr>
                    <td className="p-4 text-white font-black uppercase tracking-wider text-sm">
                      TOTALES
                    </td>
                    <td className="p-4 text-center text-white font-bold">
                      {totales.numero_servicios}
                    </td>
                    <td className="p-4 text-right text-white font-bold">
                      ${totales.total_ventas.toFixed(2)}
                    </td>
                    <td className="p-4 text-center text-white font-bold">
                      {totales.total_ventas > 0
                        ? `${((totales.total_comisiones / totales.total_ventas) * 100).toFixed(1)}%`
                        : '-'}
                    </td>
                    <td className="p-4 text-right text-gold font-black text-lg">
                      ${totales.total_comisiones.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
