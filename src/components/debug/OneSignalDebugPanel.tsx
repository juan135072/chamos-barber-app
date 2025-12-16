/**
 * =====================================================
 * 🔧 ONESIGNAL DEBUG PANEL
 * =====================================================
 * Panel flotante para probar OneSignal en desarrollo
 */

'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, Send, User, Settings, X } from 'lucide-react'

interface OneSignalDebugPanelProps {
  appId?: string
}

export default function OneSignalDebugPanel({ appId = '63aa14ec-de8c-46b3-8949-e9fd221f8d70' }: OneSignalDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [permission, setPermission] = useState<'default' | 'granted' | 'denied'>('default')
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null)
  const [externalUserId, setExternalUserId] = useState<string | null>(null)
  const [tags, setTags] = useState<Record<string, any>>({})

  // Verificar estado de OneSignal
  useEffect(() => {
    const checkOneSignalStatus = async () => {
      try {
        const OneSignal = (window as any).OneSignal
        if (!OneSignal) {
          setStatus('error')
          return
        }

        setStatus('ready')

        // Obtener permisos
        const perm = await OneSignal.Notifications.permission
        setPermission(perm)

        // Obtener subscription ID
        const subId = await OneSignal.User.PushSubscription.id
        setSubscriptionId(subId)

        // Obtener external user ID
        const extId = await OneSignal.User.externalId
        setExternalUserId(extId)

        // Obtener tags
        const userTags = await OneSignal.User.getTags()
        setTags(userTags || {})

        // Escuchar cambios
        OneSignal.Notifications.addEventListener('permissionChange', (granted: boolean) => {
          setPermission(granted ? 'granted' : 'denied')
        })
      } catch (error) {
        console.error('Error checking OneSignal status:', error)
        setStatus('error')
      }
    }

    // Retry si OneSignal no está disponible
    const interval = setInterval(() => {
      if ((window as any).OneSignal) {
        checkOneSignalStatus()
        clearInterval(interval)
      }
    }, 500)

    return () => clearInterval(interval)
  }, [])

  // Solicitar permisos
  const requestPermission = async () => {
    try {
      const OneSignal = (window as any).OneSignal
      if (!OneSignal) return

      const granted = await OneSignal.Notifications.requestPermission()
      setPermission(granted ? 'granted' : 'denied')

      if (granted) {
        const subId = await OneSignal.User.PushSubscription.id
        setSubscriptionId(subId)
      }
    } catch (error) {
      console.error('Error requesting permission:', error)
    }
  }

  // Enviar notificación de prueba
  const sendTestNotification = async () => {
    try {
      const OneSignal = (window as any).OneSignal
      if (!OneSignal) return

      // Crear notificación de prueba local
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('🔔 OneSignal Test', {
          body: 'Esta es una notificación de prueba local',
          icon: '/icon-192x192.png',
          badge: '/icon-96x96.png',
          tag: 'test',
          timestamp: Date.now()
        })
      }

      console.log('📤 Notificación de prueba enviada (local)')
      alert('✅ Notificación de prueba enviada (local)\n\nPara enviar notificaciones reales, usa el Dashboard de OneSignal:\nhttps://app.onesignal.com/apps/' + appId)
    } catch (error) {
      console.error('Error sending test notification:', error)
    }
  }

  // Refrescar estado
  const refreshStatus = async () => {
    const OneSignal = (window as any).OneSignal
    if (!OneSignal) return

    const perm = await OneSignal.Notifications.permission
    setPermission(perm)

    const subId = await OneSignal.User.PushSubscription.id
    setSubscriptionId(subId)

    const extId = await OneSignal.User.externalId
    setExternalUserId(extId)

    const userTags = await OneSignal.User.getTags()
    setTags(userTags || {})
  }

  // Solo mostrar en desarrollo
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="onesignal-debug-toggle"
        title="OneSignal Debug"
      >
        <Bell size={24} />
        {status === 'ready' && permission === 'granted' && (
          <span className="onesignal-debug-badge">✓</span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="onesignal-debug-panel">
          <div className="onesignal-debug-header">
            <h3>🔔 OneSignal Debug</h3>
            <button onClick={() => setIsOpen(false)} className="onesignal-debug-close">
              <X size={20} />
            </button>
          </div>

          <div className="onesignal-debug-content">
            {/* Estado */}
            <div className="onesignal-debug-section">
              <h4>Estado del SDK</h4>
              <div className="onesignal-debug-status">
                {status === 'ready' ? (
                  <span className="status-ready">✅ Listo</span>
                ) : status === 'error' ? (
                  <span className="status-error">❌ Error</span>
                ) : (
                  <span className="status-loading">⏳ Cargando...</span>
                )}
              </div>
            </div>

            {/* Permisos */}
            <div className="onesignal-debug-section">
              <h4>Permisos de Notificación</h4>
              <div className="onesignal-debug-permission">
                {permission === 'granted' ? (
                  <>
                    <Bell size={20} className="text-green-500" />
                    <span className="status-ready">Concedidos</span>
                  </>
                ) : permission === 'denied' ? (
                  <>
                    <BellOff size={20} className="text-red-500" />
                    <span className="status-error">Denegados</span>
                  </>
                ) : (
                  <>
                    <Bell size={20} className="text-yellow-500" />
                    <span className="status-loading">Sin solicitar</span>
                  </>
                )}
              </div>
              {permission !== 'granted' && (
                <button onClick={requestPermission} className="onesignal-debug-btn">
                  <Bell size={16} />
                  Solicitar Permisos
                </button>
              )}
            </div>

            {/* Información de suscripción */}
            {permission === 'granted' && (
              <div className="onesignal-debug-section">
                <h4>Información de Suscripción</h4>
                <div className="onesignal-debug-info">
                  <div className="info-row">
                    <span className="info-label">App ID:</span>
                    <span className="info-value">{appId.substring(0, 12)}...</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Subscription ID:</span>
                    <span className="info-value">
                      {subscriptionId ? `${subscriptionId.substring(0, 12)}...` : 'N/A'}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">External User ID:</span>
                    <span className="info-value">
                      {externalUserId ? externalUserId : 'No configurado'}
                    </span>
                  </div>
                </div>

                {/* Tags */}
                {Object.keys(tags).length > 0 && (
                  <div className="onesignal-debug-tags">
                    <h5>Tags Personalizados:</h5>
                    {Object.entries(tags).map(([key, value]) => (
                      <div key={key} className="tag-item">
                        <span className="tag-key">{key}:</span>
                        <span className="tag-value">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Acciones */}
            <div className="onesignal-debug-section">
              <h4>Acciones de Prueba</h4>
              <div className="onesignal-debug-actions">
                <button 
                  onClick={sendTestNotification}
                  className="onesignal-debug-btn"
                  disabled={permission !== 'granted'}
                >
                  <Send size={16} />
                  Enviar Notificación de Prueba
                </button>
                <button onClick={refreshStatus} className="onesignal-debug-btn">
                  <Settings size={16} />
                  Refrescar Estado
                </button>
              </div>
            </div>

            {/* Enlaces útiles */}
            <div className="onesignal-debug-section">
              <h4>Enlaces Útiles</h4>
              <div className="onesignal-debug-links">
                <a 
                  href={`https://app.onesignal.com/apps/${appId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="debug-link"
                >
                  📊 Dashboard de OneSignal
                </a>
                <a 
                  href={`https://app.onesignal.com/apps/${appId}/notifications/new`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="debug-link"
                >
                  📤 Enviar Notificación
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        /* Botón flotante */
        .onesignal-debug-toggle {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, #d4af37 0%, #f4d03f 100%);
          border: none;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(212, 175, 55, 0.4);
          cursor: pointer;
          z-index: 9998;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #121212;
          transition: all 0.3s ease;
        }

        .onesignal-debug-toggle:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 16px rgba(212, 175, 55, 0.5);
        }

        .onesignal-debug-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          width: 20px;
          height: 20px;
          background: #10b981;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          color: white;
        }

        /* Panel */
        .onesignal-debug-panel {
          position: fixed;
          bottom: 90px;
          right: 20px;
          width: 360px;
          max-height: 80vh;
          background: #1a1a1a;
          border: 2px solid #d4af37;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
          z-index: 9999;
          overflow: hidden;
          animation: slideUp 0.3s ease-out;
        }

        .onesignal-debug-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          background: linear-gradient(135deg, #d4af37 0%, #f4d03f 100%);
          color: #121212;
        }

        .onesignal-debug-header h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 700;
        }

        .onesignal-debug-close {
          background: none;
          border: none;
          cursor: pointer;
          color: #121212;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .onesignal-debug-content {
          padding: 1rem;
          max-height: calc(80vh - 60px);
          overflow-y: auto;
        }

        .onesignal-debug-section {
          margin-bottom: 1.5rem;
        }

        .onesignal-debug-section h4 {
          font-size: 0.875rem;
          font-weight: 600;
          color: #d4af37;
          margin: 0 0 0.75rem 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .onesignal-debug-section h5 {
          font-size: 0.75rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.7);
          margin: 0.5rem 0 0.5rem 0;
        }

        .onesignal-debug-status,
        .onesignal-debug-permission {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          margin-bottom: 0.5rem;
        }

        .status-ready {
          color: #10b981;
          font-weight: 600;
        }

        .status-error {
          color: #ef4444;
          font-weight: 600;
        }

        .status-loading {
          color: #f59e0b;
          font-weight: 600;
        }

        .onesignal-debug-info {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 0.75rem;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .info-row:last-child {
          border-bottom: none;
        }

        .info-label {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.6);
          font-weight: 500;
        }

        .info-value {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.9);
          font-family: 'Courier New', monospace;
          background: rgba(0, 0, 0, 0.3);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .onesignal-debug-tags {
          margin-top: 0.75rem;
          padding: 0.75rem;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
        }

        .tag-item {
          display: flex;
          gap: 0.5rem;
          padding: 0.25rem 0;
          font-size: 0.75rem;
        }

        .tag-key {
          color: #d4af37;
          font-weight: 600;
        }

        .tag-value {
          color: rgba(255, 255, 255, 0.8);
        }

        .onesignal-debug-actions {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .onesignal-debug-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: linear-gradient(135deg, #d4af37 0%, #f4d03f 100%);
          color: #121212;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .onesignal-debug-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(212, 175, 55, 0.4);
        }

        .onesignal-debug-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .onesignal-debug-links {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .debug-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.9);
          text-decoration: none;
          border-radius: 8px;
          font-size: 0.875rem;
          transition: all 0.3s ease;
        }

        .debug-link:hover {
          background: rgba(212, 175, 55, 0.2);
          color: #d4af37;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Responsive */
        @media (max-width: 480px) {
          .onesignal-debug-panel {
            right: 10px;
            left: 10px;
            width: auto;
          }

          .onesignal-debug-toggle {
            bottom: 80px;
            right: 10px;
          }
        }
      `}</style>
    </>
  )
}
