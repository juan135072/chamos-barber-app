/**
 * =====================================================
 * 🔔 ONESIGNAL PROVIDER
 * =====================================================
 * Inicializa OneSignal y maneja permisos de notificaciones
 * App ID: 63aa14ec-de8c-46b3-8949-e9fd221f8d70
 */

'use client'

import React, { useEffect, useState, createContext, useContext, useCallback } from 'react'
import { Bell, BellOff, X } from 'lucide-react'
import { usePathname } from 'next/navigation'

interface OneSignalContextType {
  initialized: boolean
  permissionStatus: 'default' | 'granted' | 'denied'
  showPrompt: boolean
  triggerPrompt: () => void
  setExternalId: (id: string) => Promise<void>
  sendTags: (tags: Record<string, any>) => Promise<void>
  repairSubscription: () => Promise<void>
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

const isDev = process.env.NODE_ENV === 'development'

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
  const pathname = usePathname()
  const isAdminRoute = pathname?.startsWith('/admin')

  // Función para inicializar OneSignal (definida a nivel de componente para ser accesible)
  const initOneSignal = useCallback(async () => {
    if (typeof window === 'undefined' || !enabled) return

    try {
      const finalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || appId
      if (isDev) console.log('🔔 Inicializando OneSignal...')

      // 1. CARGA DINÁMICA DEL SDK
      if (!(window as any).OneSignal) {
        if (isDev) console.log('📥 Cargando OneSignal SDK desde CDN...')
        const script = document.createElement('script')
        script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'
        script.async = true
        script.defer = true
        document.head.appendChild(script)

        await new Promise((resolve) => {
          script.onload = () => resolve(true)
          script.onerror = () => resolve(false)
        })
      }

      // 2. ESPERAR A QUE EL OBJETO ONESIGNAL ESTÉ LISTO
      let attempts = 0
      while (!(window as any).OneSignal && attempts < 20) {
        await new Promise(r => setTimeout(r, 100))
        attempts++
      }

      const OneSignal = (window as any).OneSignal
      if (!OneSignal) {
        console.error('❌ [OneSignal] SDK no se pudo cargar después de varios intentos')
        return
      }

      // Evitar inicialización duplicada
      if (OneSignal.initialized) {
        if (isDev) console.log('✅ [OneSignal] El SDK ya está inicializado')
        setInitialized(true)
        return
      }

      if (isDev) console.log('🔔 [OneSignal] Ejecutando OneSignal.init()...')

      await OneSignal.init({
        appId: finalAppId,
        allowLocalhostAsSecureOrigin: process.env.NODE_ENV === 'development',
        notifyButton: { enable: false },
        promptOptions: {
          slidedown: {
            enabled: true,
            autoPrompt: false
          }
        },
        serviceWorkerParam: { scope: '/' },
        serviceWorkerPath: '/OneSignalSDKWorker.js'
      })

      if (isDev) console.log('✅ [OneSignal] Inicializado correctamente')
      setInitialized(true)

      // Diagnóstico de Service Worker (solo en desarrollo)
      if (isDev && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(reg => {
          console.log('📡 [OneSignal SW Status]', reg ? {
            script: reg.active?.scriptURL,
            state: reg.active?.state,
            scope: reg.scope
          } : 'No hay Service Worker registrado');
        });
      }

      // Configurar permisos y listeners
      try {
        // Detectar permiso inicial de forma más precisa
        const osPermission = OneSignal.Notifications?.permission
        const browserPermission = typeof Notification !== 'undefined' ? Notification.permission : 'default'

        if (isDev) console.log('📊 [OneSignal Status]', {
          osPermission,
          browserPermission,
          isStandalone: window.matchMedia('(display-mode: standalone)').matches
        })

        if (osPermission === true) {
          setPermissionStatus('granted')
        } else if (browserPermission === 'denied') {
          setPermissionStatus('denied')
        } else {
          setPermissionStatus('default')
        }

        // AUTO-FIX AGRESIVO: Si hay permisos pero no hay suscripción
        setTimeout(async () => {
          const subId = OneSignal.User?.PushSubscription?.id;
          const optedOut = OneSignal.User?.PushSubscription?.optedOut;

          if (isDev) {
            console.log('📊 [OneSignal Initial State]', {
              permission: OneSignal.Notifications?.permission,
              subscriptionId: subId,
              optedOut: optedOut,
              externalId: OneSignal.User?.externalId
            });

            console.log('🔴 [DEBUG] Estado completo de OneSignal:', {
              'Permisos del Navegador': browserPermission,
              'Permisos de OneSignal': OneSignal.Notifications?.permission,
              'Subscription ID': subId || '❌ NO HAY',
              'External ID': OneSignal.User?.externalId || '❌ NO CONFIGURADO',
              'Opted Out': optedOut === true ? '❌ SÍ' : optedOut === false ? '✅ NO' : '⚠️ DESCONOCIDO',
              'Service Worker': 'serviceWorker' in navigator ? '✅ Soportado' : '❌ No soportado'
            });
          }

          if (browserPermission === 'granted' && !subId && !optedOut) {
            if (isDev) console.warn('⚠️ [OneSignal] Permisos concedidos pero sin suscripción activa. Intentando registrar...');
            try {
              // En v16, llamar a requestPermission() cuando ya hay permisos suele disparar el registro
              await OneSignal.Notifications.requestPermission();
            } catch (err) {
              console.error('❌ Error forzando registro:', err);
            }
          }

          // Auto-resucitar si está opted-out O si el estado es desconocido (undefined)
          if (browserPermission === 'granted' && (optedOut === true || optedOut === undefined)) {
            const reason = optedOut === true ? 'OPTED-OUT' : 'ESTADO DESCONOCIDO (undefined)';
            if (isDev) console.warn(`🔄 [AUTOFIX] Usuario con permisos pero ${reason}. Intentando auto-resucitación...`);
            try {
              if (OneSignal.User?.PushSubscription?.optIn) {
                await OneSignal.User.PushSubscription.optIn();
                if (isDev) console.log('✅ [AUTOFIX] Llamada a optIn() exitosa. Verificando estado en 2s...');
                setTimeout(() => {
                  const newOptedOut = OneSignal.User?.PushSubscription?.optedOut;
                  const newSubId = OneSignal.User?.PushSubscription?.id;
                  if (isDev) console.log('📊 [AUTOFIX] Estado después de auto-resucitación:', {
                    optedOut: newOptedOut,
                    subscriptionId: newSubId,
                    resultado: newOptedOut === false ? '✅ ÉXITO' : '❌ FALLÓ'
                  });

                  // Si falló, recomendar Nuclear Reset
                  if (newOptedOut !== false) {
                    console.error('❌ [AUTOFIX] El auto-fix falló. RECOMENDACIÓN: Usa el botón "RESETEO NUCLEAR" en el panel de debug.');
                  }
                }, 2000);
              }
            } catch (err) {
              console.error('❌ [AUTOFIX] Error en auto-resucitación:', err);
            }
          } else if (browserPermission === 'granted' && optedOut === false) {
            if (isDev) console.log('✅ [OneSignal] Estado correcto: Usuario suscrito');
          }
        }, 3000);

        OneSignal.Notifications?.addEventListener('permissionChange', (granted: boolean) => {
          if (isDev) console.log('🔔 [OneSignal] Permiso cambió:', granted ? 'concedido' : 'denegado')
          setPermissionStatus(granted ? 'granted' : 'denied')
          if (granted) setShowPrompt(false)
        })
      } catch (e) {
        console.warn('⚠️ Error en listeners de permisos', e)
      }

      // Manejar autoPrompt (desactivado explícitamente en admin para evitar molestias)
      if (autoPrompt && OneSignal.Notifications && !OneSignal.Notifications.permission && Notification.permission !== 'denied') {
        if (!isAdminRoute) {
          setTimeout(() => setShowPrompt(true), 2000)
        }
      }
    } catch (error: any) {
      console.error('❌ Error inicializando OneSignal:', error)
      if (error.toString().includes('indexedDB') || error.message?.includes('backing store')) {
        console.error('💾 ERROR CRÍTICO: Base de datos del navegador corrupta.')
        alert('⚠️ Error de sistema: Tu navegador tiene un problema con la base de datos interna (IndexedDB).\n\nPara solucionarlo:\n1. Cierra todas las pestañas de este sitio.\n2. Limpia los datos de navegación/caché.\n3. Reinicia tu navegador.')
      }
    }
  }, [appId, autoPrompt, enabled])

  useEffect(() => {
    initOneSignal()
  }, [initOneSignal])

  // Función para solicitar permisos
  const requestPermission = useCallback(async () => {
    if (isRequesting) {
      console.log('⏳ Ya hay una solicitud de permisos en curso, ignorando...')
      return
    }

    setIsRequesting(true)
    console.log('🔔 Solicitando permisos de notificación...')

    try {
      const OneSignal = (window as any).OneSignal
      if (!OneSignal?.Notifications) {
        console.error('❌ OneSignal SDK no listo para solicitar permisos')
        // Re-intentar inicialización si es posible
        await initOneSignal()
        if (!(window as any).OneSignal?.Notifications) {
          alert('Error: El sistema de notificaciones aún se está cargando. Por favor espera 3 segundos e intenta nuevamente.')
          return
        }
      }

      // Verificar si ya están denegados a nivel de navegador
      if (Notification.permission === 'denied') {
        alert('⚠️ Las notificaciones están bloqueadas en tu navegador.\n\nPor favor, haz clic en el icono del candado junto a la URL y cambia el permiso de Notificaciones a "Permitir" para continuar.')
        setShowPrompt(false)
        setPermissionStatus('denied')
        return
      }

      // En OneSignal Web SDK v16, el método directo es Notifications.requestPermission()
      const granted = await OneSignal.Notifications.requestPermission()
      console.log('📬 Resultado de requestPermission():', granted)

      if (granted) {
        setPermissionStatus('granted')
        setShowPrompt(false)
        console.log('✅ Notificaciones habilitadas exitosamente')
        alert('✅ ¡Notificaciones activadas! Ahora recibirás alertas de nuevas citas.')

        // Log details after permission granted
        setTimeout(async () => {
          const subId = OneSignal.User?.PushSubscription?.id
          const extId = OneSignal.User?.externalId
          const optedOut = OneSignal.User?.PushSubscription?.optedOut

          console.log('📊 [OneSignal Diagnostics] Permission Granted')
          console.log('🆔 Subscription ID:', subId)
          console.log('🆔 External ID:', extId)
          console.log('🚫 Opted Out:', optedOut)

          // Auto-resuscitation: If permission is granted but user is opted out, force opt-in
          if (optedOut && OneSignal.User?.PushSubscription?.optIn) {
            console.log('🔄 [OneSignal] El usuario está marcado como optedOut pero tiene permisos. Auto-resucitando...');
            try {
              await OneSignal.User.PushSubscription.optIn();
              console.log('✅ [OneSignal] Auto-resucitación completada');
            } catch (optError) {
              console.error('❌ [OneSignal] Error durante auto-resucitación:', optError);
            }
          }
        }, 1000)

        // Vincular ID pendiente si existe
        const pendingId = (window as any).__pendingBarberExternalId
        if (pendingId && OneSignal.login) {
          console.log('🆔 [OneSignal] Vinculando ID pendiente:', pendingId)
          try {
            await OneSignal.login(pendingId)
            console.log('✅ [OneSignal] ID vinculado exitosamente')
            delete (window as any).__pendingBarberExternalId
          } catch (err) {
            console.error('❌ Error vinculando ID:', err)
          }
        }
      } else {
        // Si no se concedió, verificar si es por bloqueo o simplemente el usuario cerró el prompt
        if ((Notification.permission as string) === 'denied') {
          setPermissionStatus('denied')
          alert('⚠️ Has bloqueado las notificaciones. Para activarlas, cambia los permisos en la configuración de tu navegador.')
        } else {
          // Intentar Slidedown como fallback si el nativo falló o fue ignorado
          console.log('⚠️ Intentando Slidedown como fallback...')
          try {
            await OneSignal.Slidedown.promptPush()
          } catch (slidedownError) {
            console.error('❌ Error lanzando Slidedown:', slidedownError)
          }
        }
        setShowPrompt(false)
      }
    } catch (error) {
      console.error('❌ Error solicitando permisos:', error)
      alert('Hubo un problema al activar las notificaciones. Por favor intenta nuevamente.')
    } finally {
      setIsRequesting(false)
    }
  }, [isRequesting])

  /**
   * REPARAR SUSCRIPCIÓN (Diagnóstico Avanzado)
   */
  const repairSubscription = useCallback(async () => {
    if (!confirm('¿Problemas con las notificaciones? Esto reiniciará la conexión con OneSignal y limpiará la caché. ¿Continuar?')) {
      return
    }

    console.log('🛠️ Iniciando reparación de OneSignal...')
    try {
      // 1. Desregistrar Service Workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const registration of registrations) {
          if (registration.active?.scriptURL.includes('OneSignal') || registration.active?.scriptURL.includes('sw.js')) {
            console.log('🗑️ Desregistrando SW:', registration.active.scriptURL)
            await registration.unregister()
          }
        }
      }

      // 2. Limpiar cache
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(name => caches.delete(name)))
      }

      alert('⚙️ Conexión reiniciada. Por favor recarga la página para activar los cambios.')
      window.location.reload()
    } catch (err) {
      console.error('❌ Error en reparación:', err)
      alert('Error al intentar reparar. Por favor limpia la caché de tu navegador manualmente.')
    }
  }, [])

  // Función para cerrar el prompt
  const dismissPrompt = useCallback(() => {
    setShowPrompt(false)
    console.log('⏭️ Prompt de notificaciones cerrado')
  }, [])

  // Función para disparar el prompt manualmente
  const triggerPrompt = useCallback(() => {
    console.log('🎯 triggerPrompt llamado. Estado actual:', { permissionStatus, initialized, showPrompt })
    if (permissionStatus === 'default' || permissionStatus === 'denied') {
      setShowPrompt(true)
    } else {
      console.log('⏭️ triggerPrompt ignorado porque ya hay permisos o están denegados:', permissionStatus)
      // Si el usuario insiste (clic manual), podrías mostrar un alert o similar
    }
  }, [permissionStatus, initialized, showPrompt])

  // Función para establecer external ID
  const setExternalId = useCallback(async (id: string) => {
    if (!id) return

    try {
      const OneSignal = (window as any).OneSignal

      // Evitar bucle: Si el ID ya es el mismo, no hacer nada
      // Usar try/catch y navegación segura porque el SDK v16 puede fallar internamente
      try {
        if (OneSignal?.User && OneSignal.User.externalId === id) {
          console.log('✅ [OneSignal] External ID ya coincide, saltando login:', id)
          return
        }
      } catch (e) {
        console.log('⏭️ [OneSignal] No se pudo leer externalId de forma segura, procediendo...')
      }

      // NUEVA ESTRATEGIA: Solo vincular External ID DESPUÉS de que el usuario haya
      // otorgado permisos de notificación. Esto asegura que OneSignal esté 100% inicializado.

      // Guardar el ID para vincularlo más tarde
      if (typeof window !== 'undefined') {
        const cleanId = id.trim()
          ; (window as any).__pendingBarberExternalId = cleanId
        console.log('📝 [OneSignal] ID guardado para vincular después de activar notificaciones:', cleanId)
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
            setTimeout(async () => {
              const currentId = OneSignal.User?.externalId
              const optedOut = OneSignal.User?.PushSubscription?.optedOut

              if (currentId === id) {
                console.log('✅ [OneSignal] External ID verificado exitosamente:', id)
                // Limpiar el ID pendiente
                delete (window as any).__pendingBarberExternalId
              } else {
                console.warn('⚠️ [OneSignal] Login llamado pero externalId no coincide aún')
              }

              // También verificar estado de suscripción aquí durante el login
              if (optedOut && OneSignal.User?.PushSubscription?.optIn) {
                console.log('🔄 [OneSignal] Detectado optedOut durante login. Intentando optIn...');
                await OneSignal.User.PushSubscription.optIn().catch(e => console.error('Error auto-optin:', e));
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
  }, [])

  // Función para enviar tags
  const sendTags = useCallback(async (tags: Record<string, any>) => {
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
  }, [])

  return (
    <OneSignalContext.Provider value={{
      initialized,
      permissionStatus,
      showPrompt,
      triggerPrompt,
      setExternalId,
      sendTags,
      repairSubscription
    }}>
      {children}

      {/* Prompt personalizado de notificaciones (Oculto en rutas Admin) */}
      {showPrompt && !isAdminRoute && (permissionStatus === 'default' || permissionStatus === 'denied') && (
        <div className="onesignal-prompt-overlay">
          <div className="onesignal-prompt">
            <button
              className="onesignal-prompt-close"
              onClick={dismissPrompt}
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>

            <div className={`onesignal-prompt-icon ${permissionStatus === 'denied' ? 'bg-red-500' : ''}`}>
              {permissionStatus === 'denied' ? <BellOff size={48} /> : <Bell size={48} />}
            </div>

            <h3 className="onesignal-prompt-title">
              {permissionStatus === 'denied' ? 'Notificaciones Bloqueadas' : 'Activa las Notificaciones'}
            </h3>

            <p className="onesignal-prompt-message">
              {permissionStatus === 'denied'
                ? 'Has bloqueado las notificaciones en tu navegador. Para recibirlas, debes entrar a la configuración del sitio (icono del candado 🔒) y cambiar el permiso a "Permitir".'
                : 'Recibe notificaciones en tiempo real sobre nuevas citas, actualizaciones importantes y mensajes del sistema.'
              }
            </p>

            <div className="onesignal-prompt-actions">
              {permissionStatus === 'denied' ? (
                <button
                  className="onesignal-btn onesignal-btn-primary"
                  onClick={dismissPrompt}
                >
                  Entendido
                </button>
              ) : (
                <>
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
                </>
              )}
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
