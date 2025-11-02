import React, { useState, useEffect } from 'react'
import { chamosSupabase } from '../../../../lib/supabase-helpers'
import toast from 'react-hot-toast'

interface ConfigItem {
  clave: string
  valor: string | null
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
    { clave: 'sitio_nombre', label: 'Nombre del Negocio', tipo: 'texto', placeholder: 'Chamos Barber Shop', icon: 'fas fa-store', valor: '' },
    { clave: 'sitio_telefono', label: 'Teléfono', tipo: 'tel', placeholder: '+56 9 1234 5678', icon: 'fas fa-phone', valor: '' },
    { clave: 'sitio_email', label: 'Email', tipo: 'email', placeholder: 'contacto@chamosbarber.com', icon: 'fas fa-envelope', valor: '' },
    { clave: 'sitio_direccion', label: 'Dirección', tipo: 'texto', placeholder: 'Av. Principal 123, Santiago', icon: 'fas fa-map-marker-alt', valor: '' },
    { clave: 'google_maps_url', label: 'Google Maps URL', tipo: 'url', placeholder: 'https://maps.google.com/?q=...', icon: 'fas fa-map', valor: '' },
    { clave: 'facebook_url', label: 'Facebook URL', tipo: 'url', placeholder: 'https://facebook.com/chamosbarber', icon: 'fab fa-facebook', valor: '' },
    { clave: 'instagram_url', label: 'Instagram URL', tipo: 'url', placeholder: 'https://instagram.com/chamosbarber', icon: 'fab fa-instagram', valor: '' },
    { clave: 'whatsapp_numero', label: 'WhatsApp', tipo: 'tel', placeholder: '+56 9 1234 5678', icon: 'fab fa-whatsapp', valor: '' }
  ]

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      const data = await chamosSupabase.getConfiguracion()
      const configMap: Record<string, string> = {}
      data.forEach((item: any) => {
        configMap[item.clave] = item.valor || ''
      })
      setConfig(configMap)
    } catch (error) {
      console.error('Error loading config:', error)
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
      
      for (const item of configItems) {
        const valor = config[item.clave] || ''
        await chamosSupabase.updateConfiguracion(item.clave, valor)
      }

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Configuración del Sitio</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configura la información general del negocio
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
        >
          {saving && <i className="fas fa-spinner fa-spin mr-2"></i>}
          <i className="fas fa-save mr-2"></i>
          Guardar Cambios
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="space-y-6">
          {/* Información General */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <i className="fas fa-info-circle text-amber-600 mr-2"></i>
              Información General
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {configItems.slice(0, 4).map(item => (
                <div key={item.clave}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <i className={`${item.icon} mr-2 text-gray-400`}></i>
                    {item.label}
                  </label>
                  <input
                    type={item.tipo}
                    value={config[item.clave] || ''}
                    onChange={(e) => handleChange(item.clave, e.target.value)}
                    placeholder={item.placeholder}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Redes Sociales */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <i className="fas fa-share-alt text-amber-600 mr-2"></i>
              Redes Sociales y Contacto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {configItems.slice(4).map(item => (
                <div key={item.clave}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <i className={`${item.icon} mr-2 text-gray-400`}></i>
                    {item.label}
                  </label>
                  <input
                    type={item.tipo}
                    value={config[item.clave] || ''}
                    onChange={(e) => handleChange(item.clave, e.target.value)}
                    placeholder={item.placeholder}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Preview de Google Maps */}
          {config['google_maps_url'] && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                <i className="fas fa-map-marked-alt text-amber-600 mr-2"></i>
                Vista Previa de Mapa
              </h3>
              <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-lg overflow-hidden">
                <iframe
                  src={config['google_maps_url'].replace('?q=', '/embed?q=')}
                  width="100%"
                  height="300"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  className="rounded-lg"
                ></iframe>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ConfiguracionTab
