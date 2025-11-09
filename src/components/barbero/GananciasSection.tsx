import { useState, useEffect } from 'react'
import { supabase, Database } from '@/lib/supabase'

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
        const totalVentas = facturas?.reduce((sum, f) => sum + f.total, 0) || 0
        const totalComision = facturas?.reduce((sum, f) => sum + f.comision_barbero, 0) || 0
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
      alert('Error al cargar las ganancias')
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
    <div className="ganancias-section">
      <div className="section-header">
        <div>
          <h2>
            <i className="fas fa-chart-line"></i> Mis Ganancias
          </h2>
          <p className="subtitle">
            Consulta tus ganancias y comisiones por período
          </p>
        </div>
      </div>

      {/* Filtros de Fecha */}
      <div className="filtros-section">
        <div className="filtros-header">
          <h3>
            <i className="fas fa-filter"></i> Filtros de Fecha
          </h3>
        </div>

        {/* Botones rápidos */}
        <div className="filtros-rapidos">
          <button className="btn btn-small" onClick={setHoy}>
            <i className="fas fa-calendar-day"></i> Hoy
          </button>
          <button className="btn btn-small" onClick={setAyer}>
            <i className="fas fa-calendar-minus"></i> Ayer
          </button>
          <button className="btn btn-small" onClick={setMesActual}>
            <i className="fas fa-calendar-alt"></i> Mes Actual
          </button>
        </div>

        {/* Tipo de filtro */}
        <div className="filtro-tipo">
          <label className="form-label">Tipo de Reporte:</label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="tipoFiltro"
                value="dia"
                checked={tipoFiltro === 'dia'}
                onChange={() => handleTipoFiltroChange('dia')}
              />
              <span>Día Específico</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="tipoFiltro"
                value="rango"
                checked={tipoFiltro === 'rango'}
                onChange={() => handleTipoFiltroChange('rango')}
              />
              <span>Rango de Fechas</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="tipoFiltro"
                value="mes"
                checked={tipoFiltro === 'mes'}
                onChange={() => handleTipoFiltroChange('mes')}
              />
              <span>Mes Completo</span>
            </label>
          </div>
        </div>

        {/* Selectores de fecha */}
        <div className="fecha-inputs">
          <div className="form-group">
            <label className="form-label">
              {tipoFiltro === 'mes' ? 'Mes:' : 'Fecha Inicio:'}
            </label>
            <input
              type={tipoFiltro === 'mes' ? 'month' : 'date'}
              className="form-input"
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
            <div className="form-group">
              <label className="form-label">Fecha Fin:</label>
              <input
                type="date"
                className="form-input"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                min={fechaInicio}
              />
            </div>
          )}
        </div>
      </div>

      {/* Tarjetas de Totales */}
      <div className="totales-cards">
        <div className="total-card">
          <div className="card-icon ventas">
            <i className="fas fa-dollar-sign"></i>
          </div>
          <div className="card-content">
            <h4>Total Ventas</h4>
            <p className="card-value">${totales.total_ventas.toFixed(2)}</p>
            <p className="card-detail">
              {totales.numero_servicios} servicio
              {totales.numero_servicios !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="total-card">
          <div className="card-icon comisiones">
            <i className="fas fa-wallet"></i>
          </div>
          <div className="card-content">
            <h4>Mis Ganancias</h4>
            <p className="card-value">${totales.total_comisiones.toFixed(2)}</p>
            <p className="card-detail">
              {totales.total_ventas > 0
                ? `${((totales.total_comisiones / totales.total_ventas) * 100).toFixed(1)}%`
                : '0%'}{' '}
              de comisión
            </p>
          </div>
        </div>

        <div className="total-card">
          <div className="card-icon promedio">
            <i className="fas fa-chart-bar"></i>
          </div>
          <div className="card-content">
            <h4>Promedio por Servicio</h4>
            <p className="card-value">
              $
              {totales.numero_servicios > 0
                ? (totales.total_comisiones / totales.numero_servicios).toFixed(2)
                : '0.00'}
            </p>
            <p className="card-detail">
              Ganancia por servicio
            </p>
          </div>
        </div>
      </div>

      {/* Tabla de Ganancias por Día */}
      <div className="tabla-ganancias">
        {loading ? (
          <div className="loading">
            <i className="fas fa-spinner fa-spin"></i> Cargando ganancias...
          </div>
        ) : ganancias.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-inbox"></i>
            <p>No hay ventas registradas en el período seleccionado</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th className="text-center">Servicios</th>
                  <th className="text-right">Total Ventas</th>
                  <th className="text-center">% Comisión</th>
                  <th className="text-right">Mis Ganancias</th>
                </tr>
              </thead>
              <tbody>
                {ganancias.map((ganancia) => (
                  <tr key={ganancia.fecha}>
                    <td>
                      <div className="fecha-info">
                        <i className="fas fa-calendar"></i>
                        <span>{formatearFecha(ganancia.fecha)}</span>
                      </div>
                    </td>
                    <td className="text-center">
                      <span className="badge badge-info">
                        {ganancia.numero_servicios}
                      </span>
                    </td>
                    <td className="text-right">
                      <strong>${ganancia.total_ventas.toFixed(2)}</strong>
                    </td>
                    <td className="text-center">
                      <span className="badge badge-primary">
                        {ganancia.porcentaje_promedio.toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-right">
                      <span className="amount-positive">
                        ${ganancia.comision_barbero.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {ganancias.length > 1 && (
                <tfoot>
                  <tr className="totales-row">
                    <td>
                      <strong>TOTALES</strong>
                    </td>
                    <td className="text-center">
                      <strong>{totales.numero_servicios}</strong>
                    </td>
                    <td className="text-right">
                      <strong>${totales.total_ventas.toFixed(2)}</strong>
                    </td>
                    <td className="text-center">
                      <strong>
                        {totales.total_ventas > 0
                          ? `${((totales.total_comisiones / totales.total_ventas) * 100).toFixed(1)}%`
                          : '-'}
                      </strong>
                    </td>
                    <td className="text-right">
                      <strong>${totales.total_comisiones.toFixed(2)}</strong>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        .ganancias-section {
          padding: 0;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .section-header h2 {
          margin: 0;
          color: var(--text-primary);
          font-size: 1.8rem;
        }

        .section-header h2 i {
          color: var(--accent-color);
          margin-right: 0.5rem;
        }

        .subtitle {
          color: var(--text-secondary);
          margin: 0.5rem 0 0 0;
        }

        /* Filtros */
        .filtros-section {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .filtros-header h3 {
          margin: 0 0 1rem 0;
          color: var(--text-primary);
          font-size: 1.2rem;
        }

        .filtros-header h3 i {
          color: var(--accent-color);
          margin-right: 0.5rem;
        }

        .filtros-rapidos {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        .btn-small {
          padding: 0.5rem 1rem;
          font-size: 0.9rem;
        }

        .btn-small i {
          margin-right: 0.5rem;
        }

        .filtro-tipo {
          margin-bottom: 1.5rem;
        }

        .radio-group {
          display: flex;
          gap: 1.5rem;
          margin-top: 0.5rem;
          flex-wrap: wrap;
        }

        .radio-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-primary);
          cursor: pointer;
        }

        .radio-label input[type='radio'] {
          cursor: pointer;
        }

        .fecha-inputs {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        /* Tarjetas de Totales */
        .totales-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .total-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
          display: flex;
          gap: 1rem;
          transition: all 0.3s ease;
        }

        .total-card:hover {
          border-color: var(--accent-color);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(212, 175, 55, 0.2);
        }

        .card-icon {
          width: 60px;
          height: 60px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.8rem;
        }

        .card-icon.ventas {
          background: rgba(52, 211, 153, 0.1);
          color: #34d399;
        }

        .card-icon.comisiones {
          background: rgba(212, 175, 55, 0.1);
          color: var(--accent-color);
        }

        .card-icon.promedio {
          background: rgba(96, 165, 250, 0.1);
          color: #60a5fa;
        }

        .card-content {
          flex: 1;
        }

        .card-content h4 {
          margin: 0 0 0.5rem 0;
          color: var(--text-secondary);
          font-size: 0.9rem;
          font-weight: 500;
        }

        .card-value {
          margin: 0 0 0.25rem 0;
          color: var(--text-primary);
          font-size: 1.8rem;
          font-weight: 700;
        }

        .card-detail {
          margin: 0;
          color: var(--text-secondary);
          font-size: 0.85rem;
        }

        /* Tabla */
        .tabla-ganancias {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .loading,
        .empty-state {
          text-align: center;
          padding: 3rem;
          color: var(--text-secondary);
        }

        .loading i,
        .empty-state i {
          font-size: 3rem;
          margin-bottom: 1rem;
          color: var(--accent-color);
          display: block;
        }

        .table-responsive {
          overflow-x: auto;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table th {
          background: var(--bg-primary);
          color: var(--text-secondary);
          padding: 1rem;
          text-align: left;
          font-weight: 600;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid var(--border-color);
        }

        .data-table td {
          padding: 1rem;
          color: var(--text-primary);
          border-bottom: 1px solid var(--border-color);
        }

        .data-table tbody tr {
          transition: background 0.2s ease;
        }

        .data-table tbody tr:hover {
          background: var(--bg-primary);
        }

        .data-table tfoot tr {
          background: var(--bg-primary);
          border-top: 2px solid var(--accent-color);
        }

        .data-table tfoot td {
          padding: 1rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .fecha-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .fecha-info i {
          color: var(--accent-color);
          font-size: 1.1rem;
        }

        .text-center {
          text-align: center;
        }

        .text-right {
          text-align: right;
        }

        .badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .badge-info {
          background: rgba(96, 165, 250, 0.2);
          color: #60a5fa;
        }

        .badge-primary {
          background: rgba(212, 175, 55, 0.2);
          color: var(--accent-color);
        }

        .amount-positive {
          color: var(--accent-color);
          font-weight: 700;
          font-size: 1.1rem;
        }

        .totales-row {
          font-size: 1.1rem;
        }

        @media (max-width: 768px) {
          .section-header h2 {
            font-size: 1.4rem;
          }

          .totales-cards {
            grid-template-columns: 1fr;
          }

          .filtros-rapidos {
            flex-direction: column;
          }

          .btn-small {
            width: 100%;
          }

          .radio-group {
            flex-direction: column;
            gap: 0.75rem;
          }

          .data-table {
            font-size: 0.85rem;
          }

          .data-table th,
          .data-table td {
            padding: 0.75rem 0.5rem;
          }

          .card-value {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  )
}
