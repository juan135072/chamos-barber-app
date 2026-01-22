/**
 * =====================================================
 * 🔔 ONESIGNAL PROVIDER
 * =====================================================
 * Inicializa OneSignal y maneja permisos de notificaciones
 * App ID: 63aa14ec-de8c-46b3-8949-e9fd221f8d70
 */

'use client'

import React, { useEffect, useState, createContext, useContext } from 'react'
import { Bell, BellOff, X } from 'lucide-react'

interface OneSignalContextType {
  initialized: boolean
  permissionStatus: 'default' | 'granted' | 'denied'
  showPrompt: boolean
  triggerPrompt: () => void
  setExternalId: (id: string) => Promise<void>
}

const OneSignalContext = createContext<OneSignalContextType | undefined>(undefined)

export const useOneSignal = () => {
  const context = useContext(OneSignalContext)
  if (context === undefined) {
    throw new Error('useOneSignal must be used within a OneSignalProvider')
  }
  return context
}

interface OneSignalProviderProps {
  children: React.ReactNode
  appId?: string
  autoPrompt?: boolean
  enabled?: boolean
}

export default function OneSignalProvider({
  children,
  appId = '63aa14ec-de8c-46b3-8949-e9fd221f8d70',
  autoPrompt = true,
  enabled = true
}: OneSignalProviderProps) {
  const [initialized, setInitialized] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState<'default' | 'granted' | 'denied'>('default')
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    // Solo ejecutar en el cliente y si está habilitado
    if (typeof window === 'undefined' || !enabled) {
      if (!enabled) console.log('🔕 OneSignal está deshabilitado para esta ruta')
      return
    }

    // Usar variable de entorno si está disponible
    const finalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || appId

    console.log('🔔 Inicializando OneSignal...')

    // Función para inicializar OneSignal
    const initOneSignal = async () => {
      try {
        // Función que configura OneSignal una vez que el SDK está disponible
        const configureOneSignal = () => {
          const OneSignal = (window as any).OneSignal

          if (!OneSignal) {
            console.error('❌ [OneSignal] SDK no disponible después de cargar')
            return
          }

          console.log('🔔 [OneSignal] Iniciando OneSignal.init()...')

          OneSignal.init({
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
            serviceWorkerPath: '/OneSignalSDKWorker.js'
          }).then(() => {
            console.log('✅ [OneSignal] Inicializado correctamente')
            setInitialized(true)

            // Verificar estado de permisos actual
            const permission = OneSignal.Notifications.permission
            const permStatus = permission ? 'granted' : 'default'
            setPermissionStatus(permStatus as 'default' | 'granted' | 'denied')

            // Escuchar cambios de permisos
            OneSignal.Notifications.addEventListener('permissionChange', (granted: boolean) => {
              console.log('🔔 Permiso cambió:', granted ? 'concedido' : 'denegado')
              setPermissionStatus(granted ? 'granted' : 'denied')
              if (granted) {
                setShowPrompt(false)
              }
            })

            // Log de suscripción (seguro)
            try {
              if (OneSignal.User && OneSignal.User.PushSubscription) {
                console.log('📬 Usuario suscrito:', OneSignal.User.PushSubscription.optedIn)
              }
            } catch (e) {
              console.warn('OneSignal PushSubscription state not ready for log')
            }

            // Si autoPrompt está habilitado y no hay permisos, mostrar prompt personalizado
            if (autoPrompt && permStatus === 'default') {
              setTimeout(() => {
                console.log('🔔 Mostrando prompt de notificaciones...')
                setShowPrompt(true)
              }, 2000)
            }
          })
        }

        // Esperar a que OneSignal esté disponible
        const waitForOneSignal = () => {
          if ((window as any).OneSignal) {
            configureOneSignal()
          } else {
            setTimeout(waitForOneSignal, 100)
          }
        }

        waitForOneSignal()
      } catch (error) {
        console.error('❌ Error inicializando OneSignal:', error)
      }
    }

    initOneSignal()
  }, [appId, autoPrompt])

  // Función para solicitar permisos
  const requestPermission = async () => {
    try {
      const OneSignal = (window as any).OneSignal
      if (!OneSignal) {
        console.error('❌ OneSignal SDK no disponible')
        alert('Error: El sistema de notificaciones no está listo. Por favor recarga la página.')
        return
      }

      console.log('🔔 Solicitando permisos de notificación...')

      // En OneSignal Web SDK v16, cuando slidedown está deshabilitado,
      // debemos usar showSlidedownPrompt() o el método nativo del navegador
      // La mejor opción es usar Slidedown de OneSignal que maneja todo correctamente

      try {
        // Mostrar el slidedown prompt de OneSignal (maneja el prompt nativo internamente)
        await OneSignal.Slidedown.promptPush()

        // Verificar el resultado después de que el usuario responda
        setTimeout(async () => {
          const permission = OneSignal.Notifications.permission
          console.log('📬 Resultado de permisos:', permission)
          setPermissionStatus(permission ? 'granted' : 'denied')

          if (permission) {
            console.log('✅ Notificaciones habilitadas exitosamente')
            alert('✅ ¡Notificaciones activadas! Ahora recibirás alertas de nuevas citas.')
          } else {
            console.log('❌ Permisos denegados por el usuario')
          }

          setShowPrompt(false)
        }, 500)
      } catch (slidedownError) {
        // Si Slidedown falla, intentar con el método directo del navegador
        console.warn('⚠️ Slidedown no disponible, usando método nativo del navegador')

        const browserPermission = await Notification.requestPermission()
        const granted = browserPermission === 'granted'

        setPermissionStatus(granted ? 'granted' : 'denied')
        setShowPrompt(false)

        if (granted) {
          // Notificar a OneSignal que el permiso fue otorgado
          console.log('✅ Permiso otorgado mediante navegador nativo')
          alert('✅ ¡Notificaciones activadas! Ahora recibirás alertas de nuevas citas.')
        }
      }
    } catch (error) {
      console.error('❌ Error solicitando permisos:', error)
      alert('Hubo un problema al activar las notificaciones. Por favor intenta nuevamente o contacta al administrador.')
    }
  }

  // Función para cerrar el prompt
  const dismissPrompt = () => {
    setShowPrompt(false)
    console.log('⏭️ Prompt de notificaciones cerrado')
  }

  // Función para disparar el prompt manualmente
  const triggerPrompt = () => {
    if (permissionStatus === 'default') {
      setShowPrompt(true)
    }
  }

  // Función para establecer external ID
  const setExternalId = async (id: string) => {
    if (!id) return

    try {
      const OneSignal = (window as any).OneSignal

      // Función recursiva con límite de intentos
      const attemptLogin = async (attemptsLeft: number) => {
        if (attemptsLeft <= 0) {
          console.error('❌ [OneSignal] Se agotaron los reintentos para establecer External ID')
          return
        }

        // Verificar que OneSignal esté completamente inicializado
        // IMPORTANTE: Verificar que User.PushSubscription exista antes de llamar a login()
        // Esto previene el error: "Cannot read properties of undefined (reading 'tt')"
        if (
          OneSignal &&
          OneSignal.login &&
          OneSignal.User &&
          OneSignal.User.PushSubscription &&
          typeof OneSignal.login === 'function'
        ) {
          try {
            console.log(`🆔 [OneSignal] Intentando vincular ID: ${id} (Intentos restantes: ${attemptsLeft})`)
            await OneSignal.login(id)

            // Verificar si se aplicó correctamente
            setTimeout(() => {
              const currentId = OneSignal.User?.externalId
              if (currentId === id) {
                console.log('✅ [OneSignal] External ID verificado exitosamente:', id)
              } else {
                console.warn('⚠️ [OneSignal] Login llamado pero externalId no coincide aún')
              }
            }, 1000)
          } catch (loginError) {
            console.error('❌ [OneSignal] Error en login():', loginError)
            // Reintentar si hay errores
            if (attemptsLeft > 1) {
              setTimeout(() => attemptLogin(attemptsLeft - 1), 2000)
            }
          }
        } else {
          const readyStatus = {
            hasOneSignal: !!OneSignal,
            hasLogin: !!OneSignal?.login,
            hasUser: !!OneSignal?.User,
            hasPushSubscription: !!OneSignal?.User?.PushSubscription
          }
          console.warn(`⚠️ [OneSignal] SDK no completamente inicializado (${attemptsLeft}):`, readyStatus)
          setTimeout(() => attemptLogin(attemptsLeft - 1), 2000)
        }
      }

      await attemptLogin(5)
    } catch (error) {
      console.error('❌ Error estableciendo External ID en OneSignal:', error)
    }
  }

  return (
    <OneSignalContext.Provider value={{
      initialized,
      permissionStatus,
      showPrompt,
      triggerPrompt,
      setExternalId
    }}>
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
              <span className="text-green-500 flex items-center gap-1"><Bell size={16} /> Activas</span>
            ) : permissionStatus === 'denied' ? (
              <span className="text-red-500 flex items-center gap-1"><BellOff size={16} /> Bloqueadas</span>
            ) : (
              <span className="text-yellow-500 flex items-center gap-1"><Bell size={16} /> Sin Permisos</span>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .onesignal-prompt-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          padding: 1rem;
          animation: fadeIn 0.3s ease-out;
        }

        .onesignal-prompt {
          position: relative;
          background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
          border: 2px solid var(--accent-color, #D4AF37);
          border-radius: 16px;
          padding: 2rem;
          max-width: 440px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          animation: slideUp 0.4s ease-out;
        }

        .onesignal-prompt-close {
          position: absolute;
          top: 1rem; right: 1rem;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          padding: 0.5rem;
          cursor: pointer;
          color: white;
        }

        .onesignal-prompt-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 80px; height: 80px;
          margin: 0 auto 1.5rem;
          background: var(--accent-color, #D4AF37);
          border-radius: 50%;
        }

        .onesignal-prompt-icon :global(svg) { color: #121212; }

        .onesignal-prompt-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--accent-color, #D4AF37);
          text-align: center;
          margin-bottom: 1rem;
        }

        .onesignal-prompt-message {
          font-size: 0.938rem;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.8);
          text-align: center;
          margin-bottom: 2rem;
        }

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
          padding: 1rem;
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
          border: none;
        }

        .onesignal-btn-primary {
          background: var(--accent-color, #D4AF37);
          color: #121212;
        }

        .onesignal-btn-secondary {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .onesignal-dev-indicator {
          position: fixed;
          bottom: 1rem; right: 1rem;
          z-index: 9999;
          background: rgba(0, 0, 0, 0.8);
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.75rem;
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </OneSignalContext.Provider>
  )
}
