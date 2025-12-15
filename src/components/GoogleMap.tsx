import { useEffect, useRef, useState } from 'react'

interface GoogleMapProps {
  apiKey: string
  center: { lat: number; lng: number }
  zoom?: number
  markerTitle?: string
  className?: string
  style?: React.CSSProperties
}

export default function GoogleMap({
  apiKey,
  center,
  zoom = 16,
  markerTitle = 'Ubicación',
  className,
  style
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!apiKey) {
      setError('API Key no configurada')
      setIsLoading(false)
      return
    }

    // Verificar si Google Maps ya está cargado
    if (window.google && window.google.maps) {
      initMap()
      return
    }

    // Cargar script de Google Maps
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMap`
    script.async = true
    script.defer = true

    // Función global de callback
    window.initGoogleMap = () => {
      initMap()
    }

    script.onerror = () => {
      setError('Error al cargar Google Maps')
      setIsLoading(false)
    }

    document.head.appendChild(script)

    return () => {
      // Cleanup
      if (window.initGoogleMap) {
        delete window.initGoogleMap
      }
    }
  }, [apiKey])

  const initMap = () => {
    if (!mapRef.current) return

    try {
      const map = new window.google.maps.Map(mapRef.current, {
        center: center,
        zoom: zoom,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'on' }]
          }
        ],
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true
      })

      // Agregar marcador
      new window.google.maps.Marker({
        position: center,
        map: map,
        title: markerTitle,
        animation: window.google.maps.Animation.DROP
      })

      setIsLoading(false)
      setError(null)
    } catch (err) {
      setError('Error al inicializar el mapa')
      setIsLoading(false)
      console.error('Error initializing map:', err)
    }
  }

  if (error) {
    return (
      <div
        className={className}
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
          color: '#666',
          fontSize: '14px',
          padding: '20px',
          textAlign: 'center'
        }}
      >
        <div>
          <i className="fas fa-exclamation-circle" style={{ fontSize: '24px', marginBottom: '10px', display: 'block' }}></i>
          {error}
          <br />
          <small>Por favor, verifica la configuración de Google Maps API</small>
        </div>
      </div>
    )
  }

  return (
    <>
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f5f5f5',
            zIndex: 10
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                border: '4px solid #D4AF37',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 10px'
              }}
            ></div>
            <div style={{ color: '#666', fontSize: '14px' }}>Cargando mapa...</div>
          </div>
        </div>
      )}
      <div ref={mapRef} className={className} style={style} />
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  )
}

// Declaración de tipos para TypeScript
declare global {
  interface Window {
    google: any
    initGoogleMap: () => void
  }
}
