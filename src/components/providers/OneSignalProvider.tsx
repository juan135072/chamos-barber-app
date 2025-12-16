/**
 * =====================================================
 * 🔔 ONESIGNAL PROVIDER
 * =====================================================
 * Inicializa OneSignal y maneja permisos de notificaciones
 * App ID: 63aa14ec-de8c-46b3-8949-e9fd221f8d70
 */

'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, X } from 'lucide-react'

interface OneSignalProviderProps {
  children: React.ReactNode
  appId?: string
  autoPrompt?: boolean
}

export default function OneSignalProvider({ 
  children, 
  appId = '63aa14ec-de8c-46b3-8949-e9fd221f8d70',
  autoPrompt = true 
}: OneSignalProviderProps) {
  const [initialized, setInitialized] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState<'default' | 'granted' | 'denied'>('default')
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    // Solo ejecutar en el cliente
    if (typeof window === 'undefined') return

    // Usar variable de entorno si está disponible
    const finalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || appId

    console.log('🔔 Inicializando OneSignal...')
    console.log('📱 App ID:', finalAppId)

    // Función para inicializar OneSignal
    const initOneSignal = async () => {
      try {
        // Importar SDK de OneSignal
        const OneSignalDeferred = (window as any).OneSignalDeferred || []
        
        // Configurar OneSignal
        OneSignalDeferred.push(async function(OneSignal: any) {
          await OneSignal.init({
            appId: finalAppId,
            allowLocalhostAsSecureOrigin: process.env.NODE_ENV === 'development',
            
            // Configuración de notificaciones
            notifyButton: {
              enable: false // Usaremos nuestro propio botón
            },
            
            // Configuración de prompts
            promptOptions: {
              slidedown: {
                enabled: false // Deshabilitamos el slidedown por defecto
              }
            },

            // Configuración de Service Worker
            serviceWorkerParam: {
              scope: '/'
            },

            serviceWorkerPath: 'OneSignalSDKWorker.js'
          })

          console.log('✅ OneSignal inicializado correctamente')
          setInitialized(true)

          // Verificar estado de permisos actual
          const permission = await OneSignal.Notifications.permission
          console.log('🔔 Estado de permisos:', permission)
          setPermissionStatus(permission)

          // Escuchar cambios de permisos
          OneSignal.Notifications.addEventListener('permissionChange', (granted: boolean) => {
            console.log('🔔 Permiso cambió:', granted ? 'concedido' : 'denegado')
            setPermissionStatus(granted ? 'granted' : 'denied')
            if (granted) {
              setShowPrompt(false)
            }
          })

          // Verificar si el usuario ya está suscrito
          const isSubscribed = await OneSignal.User.PushSubscription.optedIn
          console.log('📬 Usuario suscrito:', isSubscribed)

          // Si autoPrompt está habilitado y no hay permisos, mostrar prompt
          if (autoPrompt && permission === 'default') {
            setTimeout(() => {
              setShowPrompt(true)
            }, 2000) // Esperar 2 segundos antes de mostrar el prompt
          }
        })

        // Cargar script de OneSignal si no está cargado
        if (!(window as any).OneSignalDeferred) {
          const script = document.createElement('script')
          script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'
          script.async = true
          script.defer = true
          document.head.appendChild(script)
          
          script.onload = () => {
            console.log('✅ OneSignal SDK cargado')
          }
        }
      } catch (error) {
        console.error('❌ Error inicializando OneSignal:', error)
      }
    }

    initOneSignal()
  }, [appId, autoPrompt])

  // Función para solicitar permisos
  const requestPermission = async () => {
    try {
      console.log('🔔 Solicitando permisos de notificación...')
      
      const OneSignal = (window as any).OneSignal
      if (!OneSignal) {
        console.error('❌ OneSignal no está disponible')
        return
      }

      // Solicitar permisos
      const permission = await OneSignal.Notifications.requestPermission()
      console.log('✅ Permiso de notificación:', permission ? 'concedido' : 'denegado')
      
      setPermissionStatus(permission ? 'granted' : 'denied')
      setShowPrompt(false)

      if (permission) {
        // Obtener subscription ID
        const subscriptionId = await OneSignal.User.PushSubscription.id
        console.log('📬 Subscription ID:', subscriptionId)
      }
    } catch (error) {
      console.error('❌ Error solicitando permisos:', error)
    }
  }

  // Función para cerrar el prompt
  const dismissPrompt = () => {
    setShowPrompt(false)
    console.log('⏭️ Prompt de notificaciones cerrado')
  }

  return (
    <>
      {children}

      {/* Prompt personalizado de notificaciones */}
      {showPrompt && permissionStatus === 'default' && (
        <div className="onesignal-prompt-overlay">
          <div className="onesignal-prompt">
            <button 
              className="onesignal-prompt-close"
              onClick={dismissPrompt}
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>

            <div className="onesignal-prompt-icon">
              <Bell size={48} />
            </div>

            <h3 className="onesignal-prompt-title">
              Activa las Notificaciones
            </h3>

            <p className="onesignal-prompt-message">
              Recibe notificaciones en tiempo real sobre nuevas citas, actualizaciones importantes y mensajes del sistema.
            </p>

            <div className="onesignal-prompt-actions">
              <button 
                className="onesignal-btn onesignal-btn-primary"
                onClick={requestPermission}
              >
                <Bell size={20} />
                Permitir Notificaciones
              </button>
              <button 
                className="onesignal-btn onesignal-btn-secondary"
                onClick={dismissPrompt}
              >
                Ahora No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Indicador de estado en desarrollo */}
      {process.env.NODE_ENV === 'development' && initialized && (
        <div className="onesignal-dev-indicator">
          <div className="onesignal-dev-status">
            {permissionStatus === 'granted' ? (
              <>
                <Bell size={16} className="text-green-500" />
                <span className="text-green-500">Notificaciones Activas</span>
              </>
            ) : permissionStatus === 'denied' ? (
              <>
                <BellOff size={16} className="text-red-500" />
                <span className="text-red-500">Notificaciones Bloqueadas</span>
              </>
            ) : (
              <>
                <Bell size={16} className="text-yellow-500" />
                <span className="text-yellow-500">Sin Permisos</span>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        /* Overlay del prompt */
        .onesignal-prompt-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          padding: 1rem;
          animation: fadeIn 0.3s ease-out;
        }

        /* Prompt card */
        .onesignal-prompt {
          position: relative;
          background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
          border: 2px solid var(--accent-color, #D4AF37);
          border-radius: 16px;
          padding: 2rem;
          max-width: 440px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(212, 175, 55, 0.2);
          animation: slideUp 0.4s ease-out;
        }

        /* Botón de cerrar */
        .onesignal-prompt-close {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          padding: 0.5rem;
          cursor: pointer;
          color: rgba(255, 255, 255, 0.8);
          transition: all 0.3s ease;
        }

        .onesignal-prompt-close:hover {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }

        /* Icono del prompt */
        .onesignal-prompt-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 80px;
          height: 80px;
          margin: 0 auto 1.5rem;
          background: linear-gradient(135deg, var(--accent-color, #D4AF37) 0%, #F4D03F 100%);
          border-radius: 50%;
          box-shadow: 0 8px 24px rgba(212, 175, 55, 0.4);
          animation: pulse 2s infinite;
        }

        .onesignal-prompt-icon :global(svg) {
          color: #121212;
        }

        /* Título */
        .onesignal-prompt-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--accent-color, #D4AF37);
          text-align: center;
          margin: 0 0 1rem 0;
        }

        /* Mensaje */
        .onesignal-prompt-message {
          font-size: 0.938rem;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.8);
          text-align: center;
          margin: 0 0 2rem 0;
        }

        /* Botones */
        .onesignal-prompt-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .onesignal-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
        }

        .onesignal-btn-primary {
          background: linear-gradient(135deg, var(--accent-color, #D4AF37) 0%, #F4D03F 100%);
          color: #121212;
          box-shadow: 0 4px 12px rgba(212, 175, 55, 0.4);
        }

        .onesignal-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(212, 175, 55, 0.5);
        }

        .onesignal-btn-secondary {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .onesignal-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.15);
          color: white;
        }

        .onesignal-btn:active {
          transform: scale(0.98);
        }

        /* Indicador de desarrollo */
        .onesignal-dev-indicator {
          position: fixed;
          bottom: 1rem;
          right: 1rem;
          z-index: 9999;
        }

        .onesignal-dev-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: rgba(0, 0, 0, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        /* Animaciones */
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
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

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        /* Responsive */
        @media (max-width: 480px) {
          .onesignal-prompt {
            padding: 1.5rem;
          }

          .onesignal-prompt-title {
            font-size: 1.25rem;
          }

          .onesignal-prompt-message {
            font-size: 0.875rem;
          }

          .onesignal-prompt-icon {
            width: 64px;
            height: 64px;
          }

          .onesignal-prompt-icon :global(svg) {
            width: 32px;
            height: 32px;
          }
        }
      `}</style>
    </>
  )
}
