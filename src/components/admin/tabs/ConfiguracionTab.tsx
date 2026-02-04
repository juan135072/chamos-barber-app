import React, { useState, useEffect } from 'react'
import { chamosSupabase } from '../../../../lib/supabase-helpers'
import toast from 'react-hot-toast'

interface ConfigItem {
  clave: string
  valor?: string | null
  label: string
  tipo: 'texto' | 'url' | 'email' | 'tel'
  placeholder: string
  icon: string
}

const ConfiguracionTab: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<Record<string, string>>({})

  const configItems: ConfigItem[] = [
    { clave: 'sitio_nombre', label: 'Nombre del Negocio', tipo: 'texto', placeholder: 'Chamos Barber Shop', icon: 'fas fa-store' },
    { clave: 'sitio_telefono', label: 'Teléfono', tipo: 'tel', placeholder: '+56 9 1234 5678', icon: 'fas fa-phone' },
    { clave: 'sitio_email', label: 'Email', tipo: 'email', placeholder: 'contacto@chamosbarber.com', icon: 'fas fa-envelope' },
    { clave: 'sitio_direccion', label: 'Dirección', tipo: 'texto', placeholder: 'Av. Principal 123, Santiago', icon: 'fas fa-map-marker-alt' },
    { clave: 'google_maps_url', label: 'Google Maps URL', tipo: 'url', placeholder: 'https://maps.google.com/?q=...', icon: 'fas fa-map' },
    { clave: 'facebook_url', label: 'Facebook URL', tipo: 'url', placeholder: 'https://facebook.com/chamosbarber', icon: 'fab fa-facebook' },
    { clave: 'instagram_url', label: 'Instagram URL', tipo: 'url', placeholder: 'https://instagram.com/chamosbarber', icon: 'fab fa-instagram' },
    { clave: 'whatsapp_numero', label: 'WhatsApp', tipo: 'tel', placeholder: '+56 9 1234 5678', icon: 'fab fa-whatsapp' },
    { clave: 'pos_clave_seguridad', label: 'Clave de Seguridad POS (Anulaciones/Edición)', tipo: 'texto', placeholder: 'PIN o Contraseña', icon: 'fas fa-key' }
  ]

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Cargar Configuración General
      const data = await chamosSupabase.getConfiguracion()
      const configMap: Record<string, string> = {}
      if (Array.isArray(data)) {
        data.forEach((item: any) => {
          configMap[item.clave] = item.valor || ''
        })
      }
      setConfig(configMap)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error al cargar configuración')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (clave: string, valor: string) => {
    setConfig(prev => ({ ...prev, [clave]: valor }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      // Guardar Configuración General
      for (const item of configItems) {
        const valor = config[item.clave] || ''
        await chamosSupabase.updateConfiguracion(item.clave, valor)
      }

      // Guardar Timezone (si se cambió)
      const timezone = config['sitio_timezone'] || 'America/Santiago'
      await chamosSupabase.updateConfiguracion('sitio_timezone', timezone)

      toast.success('Configuración guardada exitosamente')
    } catch (error: any) {
      console.error('Error saving config:', error)
      toast.error(error.message || 'Error al guardar configuración')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12" style={{ borderBottom: '2px solid var(--accent-color)' }}></div>
      </div>
    )
  }

  const renderInput = (item: ConfigItem) => (
    <div key={item.clave}>
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
        <i className={`${item.icon} mr-2`} style={{ color: 'var(--accent-color)' }}></i>
        {item.label}
      </label>
      <input
        type={item.tipo === 'url' ? 'text' : item.tipo}
        value={config[item.clave] || ''}
        onChange={(e) => handleChange(item.clave, e.target.value)}
        placeholder={item.placeholder}
        className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition-all"
        style={{
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      />
    </div>
  )

  return (
    <div className="pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--accent-color)' }}>Configuración del Sitio</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
            Gestiona la información global y seguridad de la barbería
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
          style={{
            backgroundColor: 'var(--accent-color)',
            color: 'var(--bg-primary)',
            boxShadow: '0 4px 15px rgba(212, 175, 55, 0.2)'
          }}
        >
          {saving ? (
            <i className="fas fa-spinner fa-spin mr-2"></i>
          ) : (
            <i className="fas fa-save mr-2"></i>
          )}
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      <div className="space-y-8">
        {/* Información General */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }} className="rounded-2xl p-6 shadow-xl">
          <div className="flex items-center mb-6 border-b pb-4" style={{ borderColor: 'var(--border-color)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center mr-4" style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)', color: 'var(--accent-color)' }}>
              <i className="fas fa-info-circle text-xl"></i>
            </div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Información General</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {configItems.slice(0, 4).map(renderInput)}
          </div>
        </div>

        {/* Redes Sociales y Contacto */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }} className="rounded-2xl p-6 shadow-xl">
          <div className="flex items-center mb-6 border-b pb-4" style={{ borderColor: 'var(--border-color)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center mr-4" style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)', color: 'var(--accent-color)' }}>
              <i className="fas fa-share-alt text-xl"></i>
            </div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Redes Sociales y Contacto</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {configItems.slice(4, 8).map(renderInput)}
          </div>
        </div>

        {/* Seguridad y Sistema */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Seguridad del Punto de Venta */}
          <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderLeft: '4px solid var(--accent-color)' }} className="rounded-2xl p-6 shadow-xl border-l-4">
            <div className="flex items-center mb-6 border-b pb-4" style={{ borderColor: 'var(--border-color)' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center mr-4" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-color)' }}>
                <i className="fas fa-shield-alt text-xl"></i>
              </div>
              <div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Seguridad del Punto de Venta (POS)</h3>
                <p className="text-xs" style={{ color: 'var(--text-primary)', opacity: 0.6 }}>Clave maestra para autorizar cambios críticos</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6">
              {renderInput(configItems[8])}
              <div className="flex items-center p-4 rounded-lg" style={{ backgroundColor: 'rgba(212, 175, 55, 0.05)', border: '1px dashed var(--accent-color)' }}>
                <i className="fas fa-lightbulb mr-3" style={{ color: 'var(--accent-color)' }}></i>
                <p className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
                  Esta clave protege las ventas ya cobradas contra ediciones o anulaciones no autorizadas.
                </p>
              </div>
            </div>
          </div>

          {/* Configuración de Sistema / Región */}
          <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderLeft: '4px solid #3B82F6' }} className="rounded-2xl p-6 shadow-xl border-l-4">
            <div className="flex items-center mb-6 border-b pb-4" style={{ borderColor: 'var(--border-color)' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center mr-4" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }}>
                <i className="fas fa-globe text-xl"></i>
              </div>
              <div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Región y Horario</h3>
                <p className="text-xs" style={{ color: 'var(--text-primary)', opacity: 0.6 }}>Configura la zona horaria del sistema</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)', opacity: 0.8 }}>
                  <i className="fas fa-clock mr-2" style={{ color: '#3B82F6' }}></i>
                  Zona Horaria
                </label>
                <select
                  value={config['sitio_timezone'] || 'America/Santiago'}
                  onChange={(e) => handleChange('sitio_timezone', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition-all"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  <option value="America/Santiago">Santiago, Chile (UTC-3/4)</option>
                  <option value="America/Bogota">Bogotá, Colombia (UTC-5)</option>
                  <option value="America/Mexico_City">Ciudad de México, México (UTC-6)</option>
                  <option value="America/Lima">Lima, Perú (UTC-5)</option>
                  <option value="America/Argentina/Buenos_Aires">Buenos Aires, Argentina (UTC-3)</option>
                  <option value="America/Caracas">Caracas, Venezuela (UTC-4)</option>
                  <option value="America/Guayaquil">Guayaquil, Ecuador (UTC-5)</option>
                  <option value="America/Madrid">Madrid, España (UTC+1/2)</option>
                </select>
                <p className="text-xs mt-2" style={{ color: 'var(--text-primary)', opacity: 0.5 }}>
                  Esto afecta la generación automática de claves de asistencia y el registro de horas.
                </p>
              </div>

              <div className="flex items-start p-3 rounded-lg mt-2" style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', border: '1px dashed #3B82F6' }}>
                <i className="fas fa-info-circle mr-2 mt-0.5" style={{ color: '#3B82F6' }}></i>
                <p className="text-[11px]" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>
                  <strong>Tip de Zona Horaria:</strong> Si cambias la zona horaria, las claves diarias se ajustarán automáticamente a la hora local seleccionada. Los barberos verán el horario de apertura basado en esta región.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Preview de Google Maps */}
        {config['google_maps_url'] && (
          <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }} className="rounded-2xl p-6 shadow-xl">
            <div className="flex items-center mb-6">
              <i className="fas fa-map-marked-alt mr-3" style={{ color: 'var(--accent-color)' }}></i>
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Ubicación en el Mapa</h3>
            </div>
            <div className="rounded-xl overflow-hidden shadow-inner" style={{ border: '2px solid var(--border-color)' }}>
              <iframe
                src={config['google_maps_url'].includes('/embed') ? config['google_maps_url'] : config['google_maps_url'].replace('?q=', '/embed?q=')}
                width="100%"
                height="350"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
              ></iframe>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ConfiguracionTab
