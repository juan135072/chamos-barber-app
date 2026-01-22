/**
 * =====================================================
 * 🔧 ONESIGNAL DEBUG PANEL
 * =====================================================
 * Panel flotante para probar OneSignal en desarrollo
 */

'use client'

import { useEffect, useState } from 'react'

interface OneSignalDebugPanelProps {
  appId?: string
}

export default function OneSignalDebugPanel({ appId = '63aa14ec-de8c-46b3-8949-e9fd221f8d70' }: OneSignalDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false) // Cerrado por defecto - el usuario debe hacer clic
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [permission, setPermission] = useState<'default' | 'granted' | 'denied'>('default')
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null)
  const [externalUserId, setExternalUserId] = useState<string | null>(null)
  const [optedOut, setOptedOut] = useState<boolean | null>(null)
  const [swStatus, setSwStatus] = useState<string>('Checking...')
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
        let subId = null
        try {
          if (OneSignal.User && OneSignal.User.PushSubscription) {
            subId = OneSignal.User.PushSubscription.id
          }
        } catch (e) {
          console.warn('OneSignal PushSubscription not ready')
        }
        setSubscriptionId(subId)

        // Obtener external user ID
        let extId = null
        try {
          if (OneSignal.User) {
            extId = OneSignal.User.externalId
          }
        } catch (e) {
          console.warn('OneSignal externalId not ready')
        }
        setExternalUserId(extId)

        // Obtener tags
        let userTags = {}
        try {
          if (OneSignal.User) {
            userTags = await OneSignal.User.getTags()
            setOptedOut(OneSignal.User.PushSubscription?.optedOut || false)
          }
        } catch (e) {
          console.warn('OneSignal getTags not ready')
        }
        setTags(userTags || {})

        // Check SW
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          const osSw = regs.find(r => r.active?.scriptURL.includes('OneSignal'));
          setSwStatus(osSw ? `Active (${osSw.active?.state})` : 'Missing');
        }

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
          tag: 'test'
        })
      }

      console.log('📤 Notificación de prueba enviada (local)')
      alert('✅ Notificación de prueba enviada (local)\n\nPara enviar notificaciones reales, usa el Dashboard de OneSignal:\nhttps://app.onesignal.com/apps/' + appId)
    } catch (error) {
      console.error('Error sending test notification:', error)
    }
  }

  // Enviar notificación de prueba desde el SERVIDOR
  const sendServerTestNotification = async () => {
    if (!externalUserId) {
      alert('⚠️ No se ha detectado un External User ID. No se puede enviar la prueba dirigida.')
      return
    }

    const confirmSend = confirm(`¿Enviar prueba desde el SERVIDOR a ${externalUserId}?`)
    if (!confirmSend) return

    try {
      const response = await fetch('/api/debug/test-onesignal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ barberId: externalUserId }),
      })

      const result = await response.json()

      if (response.ok) {
        console.log('✅ Server Test Success:', result)
        alert('✅ ¡ÉXITO! El servidor envió la notificación.\n\nStatus: ' + response.status + '\nDatos: ' + JSON.stringify(result.data))
      } else {
        console.error('❌ Server Test Failed:', result)
        alert('❌ ERROR AL ENVIAR DESDE SERVIDOR\n\nEl servidor falló al contactar a OneSignal.\n\nError: ' + result.error + '\n\nChequeo de Env Var: ' + JSON.stringify(result.envCheck))
      }
    } catch (error) {
      console.error('❌ Network Error:', error)
      alert('❌ Error de red al contactar con /api/debug/test-onesignal')
    }
  }

  // NUCLEAR RESET
  const nuclearReset = async () => {
    if (!confirm('⚠️ ALERTA NUCLEAR: Esto borrará TODO (IndexedDB, Service Workers, Cache) y cerrará sesión. Se usa solo si nada funciona. ¿Proceder?')) return;

    try {
      // 1. Unregister ALL Service Workers
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.unregister();
      }

      // 2. Clear IndexedDB
      const dbs = await window.indexedDB.databases();
      for (const db of dbs) {
        if (db.name) window.indexedDB.deleteDatabase(db.name);
      }

      // 3. Clear Cache
      const cacheNames = await caches.keys();
      for (const name of cacheNames) await caches.delete(name);

      // 4. Clear Storage
      localStorage.clear();
      sessionStorage.clear();

      alert('✅ Limpieza completa. La página se recargará ahora.');
      window.location.reload();
    } catch (err) {
      alert('Error en reseteo: ' + err);
    }
  }

  // FORCE OPT-IN
  const forceOptIn = async () => {
    try {
      const OneSignal = (window as any).OneSignal;
      if (OneSignal?.User?.PushSubscription?.optIn) {
        await OneSignal.User.PushSubscription.optIn();
        alert('🔄 Intento de Opt-In enviado. Refresca para ver cambios.');
        refreshStatus();
      }
    } catch (err) {
      alert('Error en opt-in: ' + err);
    }
  }

  // Refrescar estado
  const refreshStatus = async () => {
    const OneSignal = (window as any).OneSignal
    if (!OneSignal) return

    // Obtener permisos
    try {
      const perm = await OneSignal.Notifications.permission
      setPermission(perm)
    } catch (e) {
      console.warn('OneSignal permission check failed')
    }

    // Obtener subscription
    try {
      if (OneSignal.User && OneSignal.User.PushSubscription) {
        setSubscriptionId(OneSignal.User.PushSubscription.id)
      }
    } catch (e) {
      console.warn('OneSignal PushSubscription not ready')
    }

    // Obtener external id
    try {
      if (OneSignal.User) {
        setExternalUserId(OneSignal.User.externalId)
      }
    } catch (e) {
      console.warn('OneSignal externalId not ready')
    }

    // Obtener tags
    try {
      if (OneSignal.User) {
        const userTags = await OneSignal.User.getTags()
        setTags(userTags || {})
      }
    } catch (e) {
      console.warn('OneSignal getTags not ready')
    }
  }

  // Mostrar en desarrollo o si el parámetro ?debug=true está presente
  const [showDebug, setShowDebug] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      setShowDebug(process.env.NODE_ENV === 'development' || urlParams.get('debug') === 'true')
    }
  }, [])

  if (!showDebug) {
    return null
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="onesignal-debug-toggle"
        style={{
          top: '20px',
          left: '20px',
          backgroundColor: '#d4af37',
          color: '#121212',
          width: 'auto',
          padding: '0 15px',
          borderRadius: '30px',
          fontSize: '12px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 100000
        }}
      >
        <i className="fas fa-bug"></i>
        <span>{isOpen ? 'CERRAR DEBUG' : 'DEBUG V2 (TEST)'}</span>
        {status === 'ready' && permission === 'granted' && (
          <span style={{ backgroundColor: '#10b981', borderRadius: '50%', width: '8px', height: '8px' }}></span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="onesignal-debug-panel" style={{ zIndex: 99999, bottom: '20px', left: '20px', right: '20px', width: 'auto', top: '80px' }}>
          <div className="onesignal-debug-header">
            <h3><i className="fas fa-shield-halved"></i> OneSignal Debug</h3>
            <button onClick={() => setIsOpen(false)} className="onesignal-debug-close">
              <i className="fas fa-times"></i>
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
                    <i className="fas fa-bell text-green-500"></i>
                    <span className="status-ready">Concedidos</span>
                  </>
                ) : permission === 'denied' ? (
                  <>
                    <i className="fas fa-bell-slash text-red-500"></i>
                    <span className="status-error">Denegados</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-bell text-yellow-500"></i>
                    <span className="status-loading">Sin solicitar</span>
                  </>
                )}
              </div>
              {permission !== 'granted' && (
                <button onClick={requestPermission} className="onesignal-debug-btn">
                  <i className="fas fa-bell" style={{ fontSize: '14px', marginRight: '8px' }}></i>
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
                  <div className="info-row">
                    <span className="info-label">Opted Out (Desuscrito):</span>
                    <span className="info-value" style={{ color: optedOut ? '#ef4444' : '#10b981' }}>
                      {optedOut ? 'SÍ (Opted Out)' : 'NO (Suscrito)'}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Service Worker:</span>
                    <span className="info-value">
                      {swStatus}
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
                  onClick={async () => {
                    const OneSignal = (window as any).OneSignal
                    if (!OneSignal) return
                    const barberId = prompt('Introduce el ID de Barbero para vincular manualmente:')
                    if (barberId) {
                      await OneSignal.login(barberId)
                      alert('Intentando vincular: ' + barberId)
                      refreshStatus()
                    }
                  }}
                  className="onesignal-debug-btn"
                  style={{ background: '#3b82f6', marginBottom: '8px' }}
                >
                  <i className="fas fa-link" style={{ fontSize: '14px', marginRight: '8px' }}></i>
                  Vincular ID Manualmente
                </button>

                <button
                  onClick={sendTestNotification}
                  className="onesignal-debug-btn"
                  disabled={permission !== 'granted'}
                >
                  <i className="fas fa-paper-plane" style={{ fontSize: '14px', marginRight: '8px' }}></i>
                  Enviar Notificación de Prueba (Local)
                </button>
                <button
                  onClick={sendServerTestNotification}
                  className="onesignal-debug-btn"
                  style={{ background: '#7c3aed', marginTop: '8px' }}
                  disabled={permission !== 'granted' || !externalUserId}
                >
                  <i className="fas fa-server" style={{ fontSize: '14px', marginRight: '8px' }}></i>
                  Probar Envío desde SERVIDOR
                </button>
                <button onClick={refreshStatus} className="onesignal-debug-btn">
                  <i className="fas fa-sync" style={{ fontSize: '14px', marginRight: '8px' }}></i>
                  Refrescar Estado
                </button>

                <button
                  onClick={forceOptIn}
                  className="onesignal-debug-btn"
                  style={{ background: '#10b981', marginTop: '8px' }}
                >
                  <i className="fas fa-toggle-on" style={{ fontSize: '14px', marginRight: '8px' }}></i>
                  Forzar Suscripción (Opt-In)
                </button>

                <button
                  onClick={nuclearReset}
                  className="onesignal-debug-btn"
                  style={{ background: '#ef4444', marginTop: '16px' }}
                >
                  <i className="fas fa-radiation" style={{ fontSize: '14px', marginRight: '8px' }}></i>
                  RESETEO NUCLEAR (Reset total)
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
        </div >
      )
      }

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
