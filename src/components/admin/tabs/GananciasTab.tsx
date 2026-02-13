import { useState, useEffect } from 'react'
import { supabase, Database } from '@/lib/supabase'
import { getChileHoy } from '@/lib/date-utils'

type Factura = Database['public']['Tables']['facturas']['Row']
type Barbero = Database['public']['Tables']['barberos']['Row']

interface GananciaBarberoDia {
  barbero_id: string
  barbero_nombre: string
  total_ventas: number
  numero_servicios: number
  comision_barbero: number
  ingreso_casa: number
  porcentaje_promedio: number
}

export default function GananciasTab() {
  const [ganancias, setGanancias] = useState<GananciaBarberoDia[]>([])
  const [loading, setLoading] = useState(true)
  const [fechaInicio, setFechaInicio] = useState<string>(getChileHoy())
  const [fechaFin, setFechaFin] = useState<string>(getChileHoy())
  const [tipoFiltro, setTipoFiltro] = useState<'dia' | 'rango' | 'mes'>('dia')

  useEffect(() => {
    cargarGanancias()
  }, [fechaInicio, fechaFin, tipoFiltro])

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

      // Crear fechas con hora para incluir todo el día (sin Z para respetar timezone local)
      const fechaInicioCompleta = `${inicio}T00:00:00`
      const fechaFinCompleta = `${fin}T23:59:59`

      // Obtener facturas del rango de fechas (solo las no anuladas)
      const { data: facturas, error: errorFacturas } = await (supabase as any)
        .from('facturas')
        .select('barbero_id, total, comision_barbero, ingreso_casa, porcentaje_comision')
        .gte('created_at', fechaInicioCompleta)
        .lte('created_at', fechaFinCompleta)
        .eq('anulada', false)
        .order('created_at', { ascending: false })

      if (errorFacturas) throw errorFacturas

      // Obtener todos los barberos
      const { data: barberos, error: errorBarberos } = await (supabase as any)
        .from('barberos')
        .select('*')
        .eq('activo', true)
        .order('nombre')

      if (errorBarberos) throw errorBarberos

      // Agrupar facturas por barbero y calcular totales
      const gananciasMap = new Map<string, GananciaBarberoDia>()

      // Inicializar todos los barberos activos con 0
      barberos?.forEach((barbero: Barbero) => {
        gananciasMap.set(barbero.id, {
          barbero_id: barbero.id,
          barbero_nombre: `${barbero.nombre} ${barbero.apellido}`,
          total_ventas: 0,
          numero_servicios: 0,
          comision_barbero: 0,
          ingreso_casa: 0,
          porcentaje_promedio: 0,
        })
      })

      // Sumar las ventas de cada barbero
      facturas?.forEach((factura: Factura) => {
        const existing = gananciasMap.get(factura.barbero_id)
        const barberoInfo = barberos?.find((b: Barbero) => b.id === factura.barbero_id)

        if (existing) {
          // Usar la suma de distribuciones para el total de ventas del reporte
          // Esto evita discrepancias si existen descuentos que solo afectan el 'total' de la factura
          const totalVenta = Number(factura.comision_barbero) + Number(factura.ingreso_casa)

          existing.total_ventas += totalVenta
          existing.numero_servicios += 1

          // Priorizar el porcentaje configurado actualmente en el barbero para el reporte
          // o usar el de la factura si no se encuentra el barbero (raro)
          const pct = barberoInfo?.porcentaje_comision || Number(factura.porcentaje_comision) || 0

          // Recalcular la comisión basándonos en el porcentaje para que el Reporte sea matemático
          const comisionCalculada = Math.round((totalVenta * pct) / 100)

          existing.comision_barbero += comisionCalculada
          existing.ingreso_casa += (totalVenta - comisionCalculada)
        }
      })

      // Calcular porcentajes promedio al final
      gananciasMap.forEach((g) => {
        if (g.total_ventas > 0) {
          g.porcentaje_promedio = (g.comision_barbero / g.total_ventas) * 100
        }
      })

      // Convertir a array y ordenar por total de ventas (descendente)
      const gananciasArray = Array.from(gananciasMap.values()).sort(
        (a, b) => b.total_ventas - a.total_ventas
      )

      setGanancias(gananciasArray)
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
        acc.total_casa += ganancia.ingreso_casa
        acc.numero_servicios += ganancia.numero_servicios
        return acc
      },
      {
        total_ventas: 0,
        total_comisiones: 0,
        total_casa: 0,
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
    const hoy = getChileHoy()
    setFechaInicio(hoy)
    setFechaFin(hoy)
    setTipoFiltro('dia')
  }

  const setAyer = () => {
    const hoy = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }))
    hoy.setDate(hoy.getDate() - 1)
    const fecha = hoy.toISOString().split('T')[0]
    setFechaInicio(fecha)
    setFechaFin(fecha)
    setTipoFiltro('dia')
  }

  const setMesActual = () => {
    const hoy = getChileHoy()
    setFechaInicio(hoy)
    setTipoFiltro('mes')
  }

  const totales = calcularTotales()

  return (
    <div className="ganancias-tab">
      <div className="tab-header">
        <div>
          <h2>
            <i className="fas fa-chart-line"></i> Ganancias por Barbero
          </h2>
          <p className="subtitle">
            Visualiza las ganancias diarias de cada barbero
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
            <i className="fas fa-user-tie"></i>
          </div>
          <div className="card-content">
            <h4>Comisiones Barberos</h4>
            <p className="card-value">${totales.total_comisiones.toFixed(2)}</p>
            <p className="card-detail">
              {totales.total_ventas > 0
                ? `${((totales.total_comisiones / totales.total_ventas) * 100).toFixed(1)}%`
                : '0%'}{' '}
              del total
            </p>
          </div>
        </div>

        <div className="total-card">
          <div className="card-icon casa">
            <i className="fas fa-store"></i>
          </div>
          <div className="card-content">
            <h4>Ingreso Casa</h4>
            <p className="card-value">${totales.total_casa.toFixed(2)}</p>
            <p className="card-detail">
              {totales.total_ventas > 0
                ? `${((totales.total_casa / totales.total_ventas) * 100).toFixed(1)}%`
                : '0%'}{' '}
              del total
            </p>
          </div>
        </div>
      </div>

      {/* Tabla de Ganancias por Barbero */}
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
                  <th>Barbero</th>
                  <th className="text-center">Servicios</th>
                  <th className="text-right">Total Ventas</th>
                  <th className="text-center">% Comisión</th>
                  <th className="text-right">Ganancia Barbero</th>
                  <th className="text-right">Ingreso Casa</th>
                </tr>
              </thead>
              <tbody>
                {ganancias.map((ganancia) => (
                  <tr
                    key={ganancia.barbero_id}
                    className={
                      ganancia.numero_servicios === 0 ? 'row-inactive' : ''
                    }
                  >
                    <td>
                      <div className="barbero-info">
                        <i className="fas fa-user-circle"></i>
                        <span>{ganancia.barbero_nombre}</span>
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
                      {ganancia.numero_servicios > 0 ? (
                        <span className="badge badge-primary">
                          {ganancia.porcentaje_promedio.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td className="text-right">
                      <span className="amount-positive">
                        ${ganancia.comision_barbero.toFixed(2)}
                      </span>
                    </td>
                    <td className="text-right">
                      <span className="amount-neutral">
                        ${ganancia.ingreso_casa.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
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
                        ? `${Math.round((totales.total_comisiones / totales.total_ventas) * 100)}%`
                        : '-'}
                    </strong>
                  </td>
                  <td className="text-right">
                    <strong>${totales.total_comisiones.toFixed(2)}</strong>
                  </td>
                  <td className="text-right">
                    <strong>${totales.total_casa.toFixed(2)}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        .ganancias-tab {
          padding: 0;
        }

        .tab-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .tab-header h2 {
          margin: 0;
          color: var(--text-primary);
          font-size: 1.8rem;
        }

        .tab-header h2 i {
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
          background: rgba(96, 165, 250, 0.1);
          color: #60a5fa;
        }

        .card-icon.casa {
          background: rgba(212, 175, 55, 0.1);
          color: var(--accent-color);
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

        .data-table tbody tr.row-inactive {
          opacity: 0.5;
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

        .barbero-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .barbero-info i {
          color: var(--accent-color);
          font-size: 1.2rem;
        }

        .text-center {
          text-align: center;
        }

        .text-right {
          text-align: right;
        }

        .text-muted {
          color: var(--text-secondary);
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
          color: #34d399;
          font-weight: 600;
        }

        .amount-neutral {
          color: var(--text-primary);
          font-weight: 600;
        }

        .totales-row {
          font-size: 1.1rem;
        }

        @media (max-width: 768px) {
          .tab-header h2 {
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
