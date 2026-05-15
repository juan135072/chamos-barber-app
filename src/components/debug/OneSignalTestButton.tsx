/**
 * =====================================================
 * 🧪 ONESIGNAL TEST BUTTON
 * =====================================================
 * Botón de prueba para solicitar permisos manualmente
 */

'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'

export default function OneSignalTestButton() {
  const [status, setStatus] = useState<string>('Probar Notificaciones')
  const [loading, setLoading] = useState(false)

  const requestPermission = async () => {
    setLoading(true)
    setStatus('Solicitando...')

    try {
      const OneSignal = (window as any).OneSignal
      
      if (!OneSignal) {
        setStatus('❌ OneSignal no disponible')
        console.error('❌ OneSignal no está disponible en window')
        setLoading(false)
        return
      }

      console.log('🔔 Solicitando permisos de notificación...')
      
      // Método 1: Usar requestPermission directo
      const granted = await OneSignal.Notifications.requestPermission()
      
      if (granted) {
        setStatus('✅ Permisos Concedidos')
        console.log('✅ Permisos concedidos')
        
        // Obtener subscription ID
        const subId = await OneSignal.User.PushSubscription.id
        console.log('📬 Subscription ID:', subId)
      } else {
        setStatus('❌ Permisos Denegados')
        console.log('❌ Permisos denegados')
      }
    } catch (error) {
      console.error('❌ Error solicitando permisos:', error)
      setStatus('❌ Error: ' + (error as Error).message)
    } finally {
      setLoading(false)
      setTimeout(() => setStatus('Probar Notificaciones'), 3000)
    }
  }

  // Solo mostrar en desarrollo
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <button
      onClick={requestPermission}
      disabled={loading}
      className="onesignal-test-button"
    >
      <Bell size={20} />
      {status}

      <style jsx>{`
        .onesignal-test-button {
          position: fixed;
          top: 20px;
          right: 20px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, #d4af37 0%, #f4d03f 100%);
          color: #121212;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(212, 175, 55, 0.4);
          transition: all 0.3s ease;
          z-index: 9997;
        }

        .onesignal-test-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(212, 175, 55, 0.5);
        }

        .onesignal-test-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .onesignal-test-button:active:not(:disabled) {
          transform: scale(0.98);
        }

        @media (max-width: 768px) {
          .onesignal-test-button {
            top: 10px;
            right: 10px;
            padding: 0.75rem 1rem;
            font-size: 0.875rem;
          }
        }
      `}</style>
    </button>
  )
}
