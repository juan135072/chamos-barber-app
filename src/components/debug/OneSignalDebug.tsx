/**
 * =====================================================
 * 🔧 ONESIGNAL DEBUG PANEL
 * =====================================================
 * Panel de debug para probar OneSignal en desarrollo
 * Solo visible en modo desarrollo
 */

'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Send, RefreshCw, UserCheck, Info } from 'lucide-react'

export default function OneSignalDebug() {
  const [oneSignalReady, setOneSignalReady] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState<string>('checking...')
  const [subscriptionId, setSubscriptionId] = useState<string>('')
  const [externalUserId, setExternalUserId] = useState<string>('')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [tags, setTags] = useState<any>({})

  // Solo en desarrollo
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  useEffect(() => {
    checkOneSignalStatus()
    const interval = setInterval(checkOneSignalStatus, 3000)
    return () => clearInterval(interval)
  }, [])

  const checkOneSignalStatus = async () => {
    const OneSignal = (window as any).OneSignal
    if (!OneSignal) {
      setOneSignalReady(false)
      return
    }

    setOneSignalReady(true)

    try {
      // Verificar permisos
      const permission = await OneSignal.Notifications.permission
      setPermissionStatus(permission ? 'granted' : 'denied')

      // Verificar suscripción
      const subscribed = await OneSignal.User.PushSubscription.optedIn
      setIsSubscribed(subscribed)

      // Obtener IDs
      const subId = await OneSignal.User.PushSubscription.id
      setSubscriptionId(subId || 'No disponible')

      const extId = await OneSignal.User.PushSubscription.token
      setExternalUserId(extId || 'No configurado')

      // Obtener tags
      const userTags = await OneSignal.User.getTags()
      setTags(userTags || {})
    } catch (error) {
      console.error('Error verificando OneSignal:', error)
    }
  }

  const requestPermission = async () => {
    const OneSignal = (window as any).OneSignal
    if (!OneSignal) return

    try {
      const permission = await OneSignal.Notifications.requestPermission()
      console.log('✅ Permiso:', permission)
      checkOneSignalStatus()
    } catch (error) {
      console.error('❌ Error:', error)
    }
  }

  const sendTestNotification = async () => {
    const OneSignal = (window as any).OneSignal
    if (!OneSignal) return

    console.log('🔔 Enviando notificación de prueba...')
    
    // Mostrar notificación local
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Prueba de OneSignal', {
        body: 'Esta es una notificación de prueba local',
        icon: '/android-chrome-192x192.png',
        badge: '/favicon-32x32.png'
      })
    }
  }

  const setTestTags = async () => {
    const OneSignal = (window as any).OneSignal
    if (!OneSignal) return

    try {
      await OneSignal.User.addTags({
        test_tag: 'test_value',
        environment: 'development',
        timestamp: new Date().toISOString()
      })
      console.log('✅ Tags enviados')
      checkOneSignalStatus()
    } catch (error) {
      console.error('❌ Error enviando tags:', error)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '1rem',
      left: '1rem',
      background: 'rgba(0, 0, 0, 0.95)',
      border: '2px solid #D4AF37',
      borderRadius: '12px',
      padding: '1rem',
      maxWidth: '400px',
      zIndex: 99999,
      fontSize: '0.813rem',
      color: 'white',
      fontFamily: 'monospace',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)'
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.5rem',
        marginBottom: '1rem',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid rgba(212, 175, 55, 0.3)'
      }}>
        <Bell size={16} style={{ color: '#D4AF37' }} />
        <strong style={{ color: '#D4AF37' }}>OneSignal Debug</strong>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* Estado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Info size={14} style={{ color: oneSignalReady ? '#22c55e' : '#ef4444' }} />
          <span>Estado: {oneSignalReady ? '✅ Listo' : '⏳ Cargando...'}</span>
        </div>

        {/* Permisos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {permissionStatus === 'granted' ? (
            <Bell size={14} style={{ color: '#22c55e' }} />
          ) : (
            <BellOff size={14} style={{ color: '#ef4444' }} />
          )}
          <span>Permisos: {permissionStatus}</span>
        </div>

        {/* Suscripción */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserCheck size={14} style={{ color: isSubscribed ? '#22c55e' : '#ef4444' }} />
          <span>Suscrito: {isSubscribed ? 'Sí' : 'No'}</span>
        </div>

        {/* Subscription ID */}
        {subscriptionId && subscriptionId !== 'No disponible' && (
          <div style={{ 
            padding: '0.5rem', 
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '6px',
            fontSize: '0.75rem',
            wordBreak: 'break-all'
          }}>
            <strong style={{ color: '#D4AF37' }}>Sub ID:</strong>
            <div style={{ marginTop: '0.25rem', opacity: 0.8 }}>
              {subscriptionId.substring(0, 30)}...
            </div>
          </div>
        )}

        {/* Tags */}
        {Object.keys(tags).length > 0 && (
          <div style={{ 
            padding: '0.5rem', 
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '6px',
            fontSize: '0.75rem'
          }}>
            <strong style={{ color: '#D4AF37' }}>Tags:</strong>
            <pre style={{ 
              marginTop: '0.25rem', 
              opacity: 0.8,
              overflow: 'auto',
              maxHeight: '100px'
            }}>
              {JSON.stringify(tags, null, 2)}
            </pre>
          </div>
        )}

        {/* Botones */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.5rem',
          marginTop: '0.5rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid rgba(212, 175, 55, 0.3)'
        }}>
          <button
            onClick={requestPermission}
            style={{
              padding: '0.5rem',
              background: 'linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%)',
              border: 'none',
              borderRadius: '6px',
              color: '#121212',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '0.813rem'
            }}
          >
            <Bell size={14} />
            Solicitar Permisos
          </button>

          <button
            onClick={sendTestNotification}
            disabled={!isSubscribed}
            style={{
              padding: '0.5rem',
              background: isSubscribed ? '#22c55e' : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              fontWeight: 'bold',
              cursor: isSubscribed ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '0.813rem',
              opacity: isSubscribed ? 1 : 0.5
            }}
          >
            <Send size={14} />
            Enviar Prueba Local
          </button>

          <button
            onClick={setTestTags}
            disabled={!isSubscribed}
            style={{
              padding: '0.5rem',
              background: isSubscribed ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              fontWeight: 'bold',
              cursor: isSubscribed ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '0.813rem',
              opacity: isSubscribed ? 1 : 0.5
            }}
          >
            <UserCheck size={14} />
            Establecer Tags
          </button>

          <button
            onClick={checkOneSignalStatus}
            style={{
              padding: '0.5rem',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '0.813rem'
            }}
          >
            <RefreshCw size={14} />
            Actualizar Estado
          </button>
        </div>

        {/* Info */}
        <div style={{ 
          padding: '0.5rem',
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '6px',
          fontSize: '0.75rem',
          color: '#93c5fd',
          marginTop: '0.5rem'
        }}>
          💡 Panel de debug solo visible en desarrollo
        </div>
      </div>
    </div>
  )
}
