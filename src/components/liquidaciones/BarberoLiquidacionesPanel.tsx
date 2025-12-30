/**
 * =====================================================
 * ✂️ PANEL BARBERO - MIS LIQUIDACIONES
 * =====================================================
 * Panel para que los barberos vean sus propias liquidaciones
 * Solo lectura: no pueden crear ni pagar
 */

'use client'

import { useState, useEffect } from 'react'
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  Download,
  RefreshCw,
  Calendar
} from 'lucide-react'
import {
  BarberoResumen,
  Liquidacion,
  getBarberoResumen,
  getLiquidacionesByBarbero,
  formatCLP,
  formatFecha,
  getEstadoBadgeColor,
  getEstadoLabel
} from '@/lib/supabase-liquidaciones'
import styles from '@/styles/liquidaciones.module.css'

interface Props {
  barberoId: string
}

export default function BarberoLiquidacionesPanel({ barberoId }: Props) {
  // Estado
  const [barbero, setBarbero] = useState<BarberoResumen | null>(null)
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)

  // Cargar datos
  useEffect(() => {
    cargarDatos()

    // Detectar modo PWA
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');

    setIsStandalone(isStandaloneMode);
  }, [barberoId])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      setError(null)

      const [barberoData, liquidacionesData] = await Promise.all([
        getBarberoResumen(barberoId),
        getLiquidacionesByBarbero(barberoId)
      ])

      setBarbero(barberoData)
      setLiquidaciones(liquidacionesData)
    } catch (err) {
      console.error('Error cargando datos:', err)
      setError('Error al cargar tus liquidaciones')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
      </div>
    )
  }

  if (error || !barbero) {
    return (
      <div className={`${styles.alert} ${styles.error}`}>
        <p>{error || 'No se pudo cargar la información'}</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginTop: isStandalone ? '1.5rem' : '0'
      }}>
        <div>
          <h1 className={styles.headerTitle} style={{
            fontSize: isStandalone ? '2.25rem' : '2rem'
          }}>
            Mis Liquidaciones
          </h1>
          <p className={styles.headerSubtitle} style={{ fontSize: '1.1rem', fontWeight: 500 }}>
            {barbero.nombre} {barbero.apellido}
          </p>
        </div>
        {!isStandalone && (
          <button
            onClick={cargarDatos}
            className={`${styles.btn} ${styles.btnSecondary}`}
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
        )}
      </div>

      {/* Resumen de Comisiones */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} premium-glow`}>
          <div className={styles.statCardHeader}>
            <div>
              <p className={styles.statLabel}>Total Ventas</p>
              <p className={styles.statValue}>{barbero.total_ventas}</p>
            </div>
            <TrendingUp className="w-10 h-10" style={{ color: 'var(--accent-color)', opacity: 0.6 }} />
          </div>
          <p className={styles.statFooter}>
            Monto: {formatCLP(barbero.total_vendido)}
          </p>
        </div>

        <div className={`${styles.statCard} ${styles.pending} premium-glow`}>
          <div className={styles.statCardHeader}>
            <div>
              <p className={styles.statLabel}>Comisiones Pendientes</p>
              <p className={styles.statValue}>{formatCLP(barbero.comisiones_pendientes)}</p>
            </div>
            <Clock className="w-10 h-10" style={{ color: 'var(--accent-color)', opacity: 0.6 }} />
          </div>
          <p className={styles.statFooter}>Por liquidar</p>
        </div>

        <div className={`${styles.statCard} ${styles.success} premium-glow`}>
          <div className={styles.statCardHeader}>
            <div>
              <p className={styles.statLabel} style={{ color: '#86efac' }}>Comisiones Pagadas</p>
              <p className={`${styles.statValue} ${styles.success}`}>{formatCLP(barbero.comisiones_pagadas)}</p>
            </div>
            <CheckCircle className="w-10 h-10" style={{ color: '#22c55e' }} />
          </div>
          <p className={styles.statFooter} style={{ color: '#86efac' }}>Total recibido</p>
        </div>

        <div className={`${styles.statCard} premium-glow`}>
          <div className={styles.statCardHeader}>
            <div>
              <p className={styles.statLabel}>Mi Comisión</p>
              <p className={styles.statValue}>{barbero.porcentaje_comision}%</p>
            </div>
            <DollarSign className="w-10 h-10" style={{ color: 'var(--accent-color)', opacity: 0.6 }} />
          </div>
          <p className={styles.statFooter}>Por cada venta</p>
        </div>
      </div>

      {/* Información Bancaria */}
      {barbero && (barbero as any).banco && (
        <div className={styles.tableContainer}>
          <div className={styles.tableHeader}>
            <h2 className={styles.tableTitle}>Mi Información Bancaria</h2>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
              <div>
                <p className={styles.textMuted} style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Banco</p>
                <p className={styles.textBold}>{(barbero as any).banco}</p>
              </div>
              <div>
                <p className={styles.textMuted} style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Tipo de Cuenta</p>
                <p className={styles.textBold}>{(barbero as any).tipo_cuenta?.toUpperCase()}</p>
              </div>
              <div>
                <p className={styles.textMuted} style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Número de Cuenta</p>
                <p className={`${styles.textBold} ${styles.fontMono}`}>{(barbero as any).numero_cuenta}</p>
              </div>
              <div>
                <p className={styles.textMuted} style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Titular</p>
                <p className={styles.textBold}>{(barbero as any).titular_cuenta}</p>
              </div>
            </div>
            <div className={`${styles.alert} ${styles.info}`} style={{ marginTop: '1.5rem' }}>
              💡 Si necesitas actualizar tu información bancaria, contacta al administrador
            </div>
          </div>
        </div>
      )}

      {/* Historial de Liquidaciones */}
      <div className={`${styles.tableContainer} premium-glow`}>
        <div className={styles.tableHeader}>
          <h2 className={styles.tableTitle}>
            Historial de Liquidaciones
          </h2>
          <p className={styles.tableSubtitle}>
            Visualiza todas tus liquidaciones y pagos
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={styles.tableHeaderRow}>
              <tr>
                <th className={styles.tableTh}>Número</th>
                <th className={styles.tableTh}>Período</th>
                <th className={styles.tableTh}>Ventas</th>
                <th className={styles.tableTh}>Monto Vendido</th>
                <th className={styles.tableTh}>Comisión</th>
                <th className={styles.tableTh}>Estado</th>
                <th className={styles.tableTh}>Fecha Pago</th>
                <th className={styles.tableTh}>Acción</th>
              </tr>
            </thead>
            <tbody className={styles.tableBody}>
              {liquidaciones.map((liquidacion) => (
                <tr key={liquidacion.id} className={styles.tableRow}>
                  <td>
                    <span className={`${styles.fontMono} ${styles.textBold} ${styles.textAccent}`}>
                      #{liquidacion.numero_liquidacion}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar className="w-4 h-4" style={{ color: 'var(--accent-color)', opacity: 0.6 }} />
                      <div>
                        <p style={{ fontSize: '0.9rem' }}>{formatFecha(liquidacion.fecha_inicio)}</p>
                        <p className={styles.textMuted} style={{ fontSize: '0.75rem' }}>
                          al {formatFecha(liquidacion.fecha_fin)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className={styles.textBold}>{liquidacion.cantidad_servicios}</td>
                  <td className={styles.textBold} style={{ whiteSpace: 'nowrap' }}>{formatCLP(liquidacion.total_ventas)}</td>
                  <td>
                    <div>
                      <p className={styles.textSuccess} style={{ fontWeight: 700 }}>
                        {formatCLP(liquidacion.total_comision)}
                      </p>
                      <p className={styles.textMuted} style={{ fontSize: '0.75rem' }}>
                        ({liquidacion.porcentaje_comision}%)
                      </p>
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${liquidacion.estado === 'pagada' ? styles.paid : liquidacion.estado === 'pendiente' ? styles.pending : styles.cancelled}`}>
                      {getEstadoLabel(liquidacion.estado)}
                    </span>
                  </td>
                  <td>
                    {liquidacion.fecha_pago ? (
                      <div>
                        <p>{formatFecha(liquidacion.fecha_pago)}</p>
                        {liquidacion.metodo_pago && (
                          <p className={styles.textMuted} style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}>
                            {liquidacion.metodo_pago}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className={styles.textMuted}>-</span>
                    )}
                  </td>
                  <td>
                    {liquidacion.estado === 'pagada' && liquidacion.comprobante_url ? (
                      <button
                        className={`${styles.btn} ${styles.btnSuccess}`}
                        style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                      >
                        <Download className="w-4 h-4" />
                        PDF
                      </button>
                    ) : liquidacion.estado === 'pendiente' ? (
                      <span className={styles.textWarning} style={{ fontSize: '0.875rem' }}>En proceso</span>
                    ) : (
                      <span className={styles.textMuted}>-</span>
                    )}
                  </td>
                </tr>
              ))}
              {liquidaciones.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                    <div className={styles.emptyState}>
                      <Calendar className="w-16 h-16" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                      <p>Aún no tienes liquidaciones registradas</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info adicional */}
      <div className={`${styles.alert} ${styles.info}`}>
        <h3 style={{ fontWeight: 600, marginBottom: '0.75rem', fontSize: '1.125rem' }}>
          ℹ️ Información Importante
        </h3>
        <ul style={{ fontSize: '0.938rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <li>• Las liquidaciones son creadas por el administrador según el período acordado</li>
          <li>• Una vez creada una liquidación, aparecerá como "Pendiente" hasta que sea pagada</li>
          <li>• Cuando se realice el pago, recibirás un comprobante que podrás descargar</li>
          <li>• Las comisiones pendientes son las que aún no han sido liquidadas</li>
        </ul>
      </div>
    </div>
  )
}
