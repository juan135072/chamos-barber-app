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
  sendTags: (tags: Record<string, any>) => Promise<void>
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
  const [isRequesting, setIsRequesting] = useState(false)

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
                enabled: true, // Habilitado para permitir promptPush()
                autoPrompt: false // Seguimos manejando el prompt manualmente
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
  }, [appId, autoPrompt, enabled])

  // Función para solicitar permisos
  const requestPermission = async () => {
    try {
      const OneSignal = (window as any).OneSignal
      if (!OneSignal) {
        console.error('❌ OneSignal SDK no disponible')
        alert('Error: El sistema de notificaciones no está listo. Por favor recarga la página.')
        return
      }

      if (isRequesting) {
        console.log('⏳ Ya hay una solicitud de permisos en curso, ignorando...')
        return
      }

      setIsRequesting(true)
      console.log('🔔 Solicitando permisos de notificación...')

      // Verificar si ya están denegados a nivel de navegador
      if (Notification.permission === 'denied') {
        alert('⚠️ Las notificaciones están bloqueadas en tu navegador.\n\nPor favor, haz clic en el icono del candado junto a la URL y cambia el permiso de Notificaciones a "Permitir" para continuar.')
        setShowPrompt(false)
        return
      }

      // En OneSignal Web SDK v16, el método directo es Notifications.requestPermission()
      try {
        const result = await OneSignal.Notifications.requestPermission()
        console.log('📬 Resultado de requestPermission():', result)

        // El resultado es un booleano en v16 (true si se concedió)
        // Si es false, puede ser que el usuario denegó o que el navegador bloqueó el prompt nativo
        if (result === true) {
          setPermissionStatus('granted')
          console.log('✅ Notificaciones habilitadas exitosamente')
          alert('✅ ¡Notificaciones activadas! Ahora recibirás alertas de nuevas citas.')

          // Vincular External ID
          const pendingId = (window as any).__pendingBarberExternalId
          if (pendingId && OneSignal.login) {
            console.log('🆔 [OneSignal] Vinculando ID después de activar notificaciones:', pendingId)
            setTimeout(async () => {
              try {
                await OneSignal.login(pendingId)
                console.log('✅ [OneSignal] ID vinculado exitosamente')
                delete (window as any).__pendingBarberExternalId
              } catch (err) {
                console.error('❌ Error vinculando ID:', err)
              }
            }, 1000)
          }
          setShowPrompt(false)
        } else {
          // requestPermission devolvió false - verificar si ahora están bloqueadas
          const currentPermission = Notification.permission

          if ((currentPermission as any) === 'denied') {
            console.log('❌ Notificaciones bloqueadas por el navegador')
            setPermissionStatus('denied')
            alert('⚠️ Las notificaciones están bloqueadas en tu navegador.\n\n' +
              'Para activarlas:\n' +
              '1. Haz clic en el icono del candado 🔒 junto a la URL\n' +
              '2. Busca "Notificaciones"\n' +
              '3. Cámbialo a "Permitir"\n' +
              '4. Recarga la página y vuelve a intentar')
            setShowPrompt(false)
          } else {
            // No están bloqueadas, solo el prompt nativo no funcionó - intentar Slidedown
            console.log('⚠️ Prompt nativo no mostrado, intentando Slidedown...')
            try {
              await OneSignal.Slidedown.promptPush()
              console.log('📬 Slidedown lanzado')
              setTimeout(() => setShowPrompt(false), 1000)
            } catch (slidedownError) {
              console.error('❌ Error lanzando Slidedown:', slidedownError)
              setShowPrompt(false)
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Error en Notifications.requestPermission():', error)
        // Verificar si están bloqueadas antes de intentar Slidedown
        if ((Notification.permission as any) === 'denied') {
          console.log('❌ Notificaciones bloqueadas, no se puede mostrar Slidedown')
          setPermissionStatus('denied')
          setShowPrompt(false)
        } else {
          try {
            console.log('⚠️ Intentando Slidedown como fallback...')
            await OneSignal.Slidedown.promptPush()
            console.log('📬 Slidedown lanzado como fallback')
            setShowPrompt(false)
          } catch (slidedownError) {
            console.error('❌ Error lanzando Slidedown:', slidedownError)
            setShowPrompt(false)
          }
        }
      }
    } catch (error) {
      console.error('❌ Error solicitando permisos:', error)
      alert('Hubo un problema al activar las notificaciones. Por favor intenta nuevamente o contacta al administrador.')
    } finally {
      setIsRequesting(false)
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

      // NUEVA ESTRATEGIA: Solo vincular External ID DESPUÉS de que el usuario haya
      // otorgado permisos de notificación. Esto asegura que OneSignal esté 100% inicializado.

      // Guardar el ID para vincularlo más tarde
      if (typeof window !== 'undefined') {
        (window as any).__pendingBarberExternalId = id
        console.log('📝 [OneSignal] ID guardado para vincular después de activar notificaciones:', id)
      }

      // Función recursiva con límite de intentos
      const attemptLogin = async (attemptsLeft: number) => {
        if (attemptsLeft <= 0) {
          console.warn('⏸️ [OneSignal] No se pudo vincular External ID automáticamente. Se vinculará cuando el usuario active las notificaciones.')
          return
        }

        // Solo intentar vincular si:
        // 1. OneSignal está completamente inicializado
        // 2. El usuario ya otorgó permisos de notificación
        const hasPermission = OneSignal?.Notifications?.permission

        if (!hasPermission) {
          console.log('⏸️ [OneSignal] Esperando a que el usuario active las notificaciones para vincular ID')
          return // No intentar vincular ahora, esperar a que se active
        }

        // Verificar que OneSignal esté completamente inicializado
        if (
          OneSignal &&
          OneSignal.login &&
          OneSignal.User &&
          OneSignal.User.PushSubscription &&
          typeof OneSignal.login === 'function'
        ) {
          try {
            console.log(`🆔 [OneSignal] Vinculando ID después de permisos otorgados: ${id}`)
            await OneSignal.login(id)

            // Verificar que se aplicó
            setTimeout(() => {
              const currentId = OneSignal.User?.externalId
              if (currentId === id) {
                console.log('✅ [OneSignal] External ID verificado exitosamente:', id)
                // Limpiar el ID pendiente
                delete (window as any).__pendingBarberExternalId
              } else {
                console.warn('⚠️ [OneSignal] Login llamado pero externalId no coincide aún')
              }
            }, 1000)
          } catch (loginError) {
            console.error('❌ [OneSignal] Error en login():', loginError)
            // Reintentar si hay errores
            if (attemptsLeft > 1) {
              setTimeout(() => attemptLogin(attemptsLeft - 1), 3000)
            }
          }
        } else {
          const readyStatus = {
            hasOneSignal: !!OneSignal,
            hasLogin: !!OneSignal?.login,
            hasUser: !!OneSignal?.User,
            hasPushSubscription: !!OneSignal?.User?.PushSubscription,
            hasPermission
          }
          console.warn(`⚠️ [OneSignal] SDK no completamente inicializado (${attemptsLeft}):`, readyStatus)
          setTimeout(() => attemptLogin(attemptsLeft - 1), 3000)
        }
      }

      // Solo intentar inmediatamente si ya tiene permisos
      const currentPermission = OneSignal?.Notifications?.permission
      if (currentPermission) {
        await attemptLogin(3) // Solo 3 intentos cuando ya hay permisos
      } else {
        console.log('⏸️ [OneSignal] External ID se vinculará automáticamente cuando el usuario active las notificaciones')
      }
    } catch (error) {
      console.error('❌ Error estableciendo External ID en OneSignal:', error)
    }
  }

  // Función para enviar tags
  const sendTags = async (tags: Record<string, any>) => {
    try {
      const OneSignal = (window as any).OneSignal
      if (OneSignal && OneSignal.User && OneSignal.User.addTags) {
        await OneSignal.User.addTags(tags)
        console.log('✅ [OneSignal] Tags actualizados:', tags)
      } else {
        console.warn('⚠️ [OneSignal] SDK no listo para enviar tags')
      }
    } catch (error) {
      console.error('❌ Error enviando tags a OneSignal:', error)
    }
  }

  return (
    <OneSignalContext.Provider value={{
      initialized,
      permissionStatus,
      showPrompt,
      triggerPrompt,
      setExternalId,
      sendTags
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
