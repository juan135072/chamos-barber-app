import { useState, useEffect } from 'react'
import { supabase, Database } from '@/lib/supabase'

type Barbero = Database['public']['Tables']['barberos']['Row']
type ConfiguracionComision = Database['public']['Tables']['configuracion_comisiones']['Row']

interface BarberoConComision extends Barbero {
  comision?: ConfiguracionComision
}

export default function ComisionesTab() {
  const [barberos, setBarberos] = useState<BarberoConComision[]>([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<string | null>(null)
  const [nuevoPorcentaje, setNuevoPorcentaje] = useState<string>('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    cargarBarberos()
  }, [])

  const cargarBarberos = async () => {
    try {
      setLoading(true)

      // Obtener barberos activos
      const { data: barberosData, error: barberosError } = await (supabase as any)
        .from('barberos')
        .select('*')
        .eq('activo', true)
        .order('nombre')

      if (barberosError) throw barberosError

      // Obtener configuraciones de comisiones
      const { data: comisionesData, error: comisionesError } = await (supabase as any)
        .from('configuracion_comisiones')
        .select('*')

      if (comisionesError) throw comisionesError

      // Combinar datos
      const barberosConComision = (barberosData || []).map((barbero: Barbero) => ({
        ...barbero,
        comision: (comisionesData || []).find((c: ConfiguracionComision) => c.barbero_id === barbero.id)
      }))

      setBarberos(barberosConComision)
    } catch (error) {
      console.error('Error cargando barberos:', error)
      alert('Error al cargar los barberos')
    } finally {
      setLoading(false)
    }
  }

  const iniciarEdicion = (barbero: BarberoConComision) => {
    setEditando(barbero.id)
    setNuevoPorcentaje(barbero.comision?.porcentaje?.toString() || '50.00')
  }

  const cancelarEdicion = () => {
    setEditando(null)
    setNuevoPorcentaje('')
  }

  const guardarComision = async (barberoId: string) => {
    try {
      setGuardando(true)

      const porcentaje = parseFloat(nuevoPorcentaje)

      // Validar porcentaje
      if (isNaN(porcentaje) || porcentaje < 0 || porcentaje > 100) {
        alert('El porcentaje debe estar entre 0 y 100')
        return
      }

      const barbero = barberos.find(b => b.id === barberoId)

      if (barbero?.comision) {
        // Actualizar existente
        const { error } = await (supabase as any)
          .from('configuracion_comisiones')
          .update({ 
            porcentaje,
            updated_at: new Date().toISOString()
          })
          .eq('barbero_id', barberoId)

        if (error) throw error
      } else {
        // Crear nuevo
        const { error } = await (supabase as any)
          .from('configuracion_comisiones')
          .insert({
            barbero_id: barberoId,
            porcentaje,
            notas: 'Configurado desde panel de administración'
          })

        if (error) throw error
      }

      alert('Comisión actualizada exitosamente')
      await cargarBarberos()
      cancelarEdicion()
    } catch (error) {
      console.error('Error guardando comisión:', error)
      alert('Error al guardar la comisión')
    } finally {
      setGuardando(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner mr-3"></div>
        <span style={{ color: 'var(--text-primary)' }}>Cargando barberos...</span>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold" style={{ color: 'var(--accent-color)' }}>
          <i className="fas fa-percentage mr-2"></i>
          Configuración de Comisiones
        </h2>
        <p className="mt-2" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
          Configura el porcentaje de comisión para cada barbero. Este porcentaje determina cuánto gana el barbero de cada venta.
        </p>
        <p className="mt-1 text-sm" style={{ color: 'var(--accent-color)', opacity: 0.9 }}>
          <i className="fas fa-info-circle mr-2"></i>
          <strong>Importante:</strong> El porcentaje de comisión NO aparecerá en la factura impresa del cliente.
        </p>
      </div>

      <div className="grid gap-4">
        {barberos.map((barbero) => {
          const porcentajeActual = barbero.comision?.porcentaje || 50.00
          const estaEditando = editando === barbero.id

          return (
            <div
              key={barbero.id}
              className="rounded-lg p-6"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                boxShadow: 'var(--shadow)'
              }}
            >
              <div className="flex items-center justify-between">
                {/* Información del barbero */}
                <div className="flex items-center space-x-4">
                  {barbero.imagen_url ? (
                    <img
                      src={barbero.imagen_url}
                      alt={`${barbero.nombre} ${barbero.apellido}`}
                      className="w-16 h-16 rounded-full object-cover"
                      style={{ border: '2px solid var(--accent-color)' }}
                    />
                  ) : (
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-2xl"
                      style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--accent-color)' }}
                    >
                      <i className="fas fa-user"></i>
                    </div>
                  )}

                  <div>
                    <h3 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {barbero.nombre} {barbero.apellido}
                    </h3>
                    <p className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                      <i className="fas fa-cut mr-2"></i>
                      {barbero.especialidad}
                    </p>
                  </div>
                </div>

                {/* Configuración de comisión */}
                <div className="flex items-center space-x-4">
                  {estaEditando ? (
                    <>
                      {/* Modo edición */}
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={nuevoPorcentaje}
                          onChange={(e) => setNuevoPorcentaje(e.target.value)}
                          className="form-input w-24"
                          placeholder="50.00"
                        />
                        <span style={{ color: 'var(--text-primary)' }}>%</span>
                      </div>

                      <button
                        onClick={() => guardarComision(barbero.id)}
                        disabled={guardando}
                        className="px-4 py-2 rounded-lg font-medium transition-all"
                        style={{
                          backgroundColor: 'var(--accent-color)',
                          color: 'var(--bg-primary)',
                          opacity: guardando ? 0.6 : 1,
                          cursor: guardando ? 'not-allowed' : 'pointer'
                        }}
                        onMouseEnter={(e) => !guardando && (e.currentTarget.style.backgroundColor = '#B8941F')}
                        onMouseLeave={(e) => !guardando && (e.currentTarget.style.backgroundColor = 'var(--accent-color)')}
                      >
                        {guardando ? (
                          <>
                            <div className="spinner mr-2"></div>
                            Guardando...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-check mr-2"></i>
                            Guardar
                          </>
                        )}
                      </button>

                      <button
                        onClick={cancelarEdicion}
                        disabled={guardando}
                        className="px-4 py-2 rounded-lg font-medium transition-all"
                        style={{
                          backgroundColor: 'var(--bg-primary)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-color)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-color)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                      >
                        <i className="fas fa-times mr-2"></i>
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Modo vista */}
                      <div className="text-right">
                        <div className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                          Comisión del barbero
                        </div>
                        <div className="text-3xl font-bold" style={{ color: 'var(--accent-color)' }}>
                          {porcentajeActual.toFixed(2)}%
                        </div>
                      </div>

                      <button
                        onClick={() => iniciarEdicion(barbero)}
                        className="px-4 py-2 rounded-lg font-medium transition-all"
                        style={{
                          backgroundColor: 'var(--bg-primary)',
                          color: 'var(--accent-color)',
                          border: '1px solid var(--border-color)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--accent-color)'
                          e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.1)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border-color)'
                          e.currentTarget.style.backgroundColor = 'var(--bg-primary)'
                        }}
                      >
                        <i className="fas fa-edit mr-2"></i>
                        Editar
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Información adicional */}
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Casa recibe:</span>
                    <span className="ml-2 font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {(100 - porcentajeActual).toFixed(2)}%
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Por cada $10:</span>
                    <span className="ml-2 font-semibold" style={{ color: 'var(--accent-color)' }}>
                      Barbero: ${(10 * porcentajeActual / 100).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-primary)', opacity: 0.7 }}>Por cada $10:</span>
                    <span className="ml-2 font-semibold" style={{ color: 'var(--accent-color)' }}>
                      Casa: ${(10 * (100 - porcentajeActual) / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {barberos.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👨‍💼</div>
            <p style={{ color: 'var(--text-primary)', opacity: 0.6 }}>
              No hay barberos activos registrados
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
