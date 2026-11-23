/**
 * =====================================================
 * 🔔 ONESIGNAL PROVIDER
 * =====================================================
 * Inicializa OneSignal (Web SDK v16) y maneja permisos de notificaciones.
 * La carga, login y logout, y las decisiones del flujo de permisos (estado,
 * pedido, resultado y vista del overlay), viven en @/lib/onesignal-client.
 */

'use client'

import React, { useEffect, useRef, useState, createContext, useContext, useCallback } from 'react'
import { Bell, BellOff, Smartphone, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  ONESIGNAL_APP_ID,
  canRetryOneSignalLoad,
  classifyPermissionResult,
  detectPushSupport,
  getReadyOneSignal,
  hasPushSubscription,
  linkOneSignalUser,
  loadOneSignal,
  readNativePermission,
  readPushEnvironment,
  resolveDeviceStatus,
  resolvePermissionStatus,
  resolvePromptView,
  sendOneSignalTags,
  startPermissionRequest,
  type PermissionStatus,
  type PushSupport,
  type SdkState,
} from '@/lib/onesignal-client'

interface OneSignalContextType {
  initialized: boolean
  /** 'granted' only when the browser allows it and this device has a OneSignal push token. */
  permissionStatus: PermissionStatus
  pushSupport: PushSupport
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

const isDev = process.env.NODE_ENV === 'development'

// Only for the UI: past this the overlay offers a retry instead of waiting.
const SDK_UI_TIMEOUT_MS = 20000
// The browser prompt can stay open as long as the barber wants, and an SDK that
// never finished starting (e.g. IndexedDB unavailable on iOS) never settles its
// requests: past this the overlay only adds a neutral hint, no error.
const PERMISSION_SLOW_MS = 30000

export default function OneSignalProvider({
  children,
  appId = ONESIGNAL_APP_ID,
  autoPrompt = true,
  enabled = true
}: OneSignalProviderProps) {
  const [sdkState, setSdkState] = useState<SdkState>('idle')
  const [pushSupport, setPushSupport] = useState<PushSupport>('supported')
  const [permission, setPermission] = useState<PermissionStatus>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isRequesting, setIsRequesting] = useState(false)
  const [requestSlow, setRequestSlow] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  // Set inside the tap itself, so a second tap sees it before React re-renders.
  const requestInFlight = useRef(false)
  const pathname = usePathname()
  const isAdminRoute = pathname?.startsWith('/admin')

  useEffect(() => {
    if (typeof window === 'undefined' || !enabled) return

    const support = detectPushSupport(readPushEnvironment())
    setPushSupport(support)
    if (support !== 'supported') {
      setSdkState('unsupported')
      return
    }

    let cancelled = false
    let detach = () => {}
    setSdkState((current) => (current === 'ready' ? current : 'loading'))
    const uiTimer = setTimeout(() => {
      if (!cancelled) setSdkState((current) => (current === 'loading' ? 'failed' : current))
    }, SDK_UI_TIMEOUT_MS)

    loadOneSignal(appId).then((OneSignal) => {
      clearTimeout(uiTimer)
      if (cancelled) return
      if (!OneSignal) {
        setSdkState('failed')
        return
      }
      if (OneSignal.Notifications?.isPushSupported?.() === false) {
        setPushSupport('unsupported')
        setSdkState('unsupported')
        return
      }

      const sync = () => {
        setPermission(resolvePermissionStatus(OneSignal.Notifications?.permission, readNativePermission()))
        setSubscribed(hasPushSubscription(OneSignal))
      }
      OneSignal.Notifications?.addEventListener?.('permissionChange', sync)
      OneSignal.User?.PushSubscription?.addEventListener?.('change', sync)
      detach = () => {
        OneSignal.Notifications?.removeEventListener?.('permissionChange', sync)
        OneSignal.User?.PushSubscription?.removeEventListener?.('change', sync)
      }

      sync()
      setSdkState('ready')
      if (isDev) {
        console.log('📊 [OneSignal Status]', {
          permission: OneSignal.Notifications?.permission,
          optedIn: OneSignal.User?.PushSubscription?.optedIn,
          hasToken: Boolean(OneSignal.User?.PushSubscription?.token),
          subscriptionId: OneSignal.User?.PushSubscription?.id,
          externalId: OneSignal.User?.externalId,
        })
      }
    })

    return () => {
      cancelled = true
      clearTimeout(uiTimer)
      detach()
    }
  }, [appId, enabled, loadAttempt])

  // Allowed by the browser but this device has no push token in OneSignal
  // (subscribing failed or the barber opted out): the overlay stays available
  // so the barber can tap "Activar" again.
  const permissionStatus = resolveDeviceStatus(permission, subscribed)

  // Manejar autoPrompt (desactivado explícitamente en admin para evitar molestias)
  useEffect(() => {
    if (!autoPrompt || isAdminRoute || sdkState !== 'ready' || permissionStatus !== 'default') return
    const timer = setTimeout(() => setShowPrompt(true), 2000)
    return () => clearTimeout(timer)
  }, [autoPrompt, isAdminRoute, sdkState, permissionStatus])

  // Runs inside the tap: browsers ignore permission requests made after an await.
  const requestPermission = useCallback(() => {
    const OneSignal = getReadyOneSignal()
    // One request at a time: a second tap while the browser prompt may still be
    // open must not ask again nor add a second outcome toast.
    if (!OneSignal || requestInFlight.current) return
    requestInFlight.current = true
    const request = startPermissionRequest(OneSignal)

    setIsRequesting(true)
    const slow = setTimeout(() => setRequestSlow(true), PERMISSION_SLOW_MS)
    request
      .then((accepted) => {
        const status = resolvePermissionStatus(OneSignal.Notifications.permission, readNativePermission())
        const active = hasPushSubscription(OneSignal)
        setPermission(status)
        setSubscribed(active)
        const outcome = classifyPermissionResult(accepted, status, active)
        if (outcome === 'subscribed') {
          setShowPrompt(false)
          toast.success('¡Listo! Te avisaremos cuando tengas nuevas citas.')
        } else if (outcome === 'not-subscribed') {
          // Allowed, but there is still no push token: keep the overlay to retry.
          toast.error('No pudimos activar las notificaciones en este dispositivo. Inténtalo de nuevo.')
        } else if (outcome === 'dismissed') {
          // The barber closed the browser prompt without choosing.
          setShowPrompt(false)
        }
        // 'blocked': the overlay switches to the unblock instructions.
      })
      .catch((error) => {
        console.error('❌ [OneSignal] Error solicitando permisos:', error)
        toast.error('No pudimos activar las notificaciones. Inténtalo de nuevo.')
      })
      .finally(() => {
        clearTimeout(slow)
        requestInFlight.current = false
        setIsRequesting(false)
        setRequestSlow(false)
      })
  }, [])

  // Función para cerrar el prompt
  const dismissPrompt = useCallback(() => {
    setShowPrompt(false)
  }, [])

  // Función para disparar el prompt manualmente (el overlay decide qué mostrar)
  const triggerPrompt = useCallback(() => {
    setShowPrompt(true)
  }, [])

  const retryLoad = useCallback(() => {
    // A failed download is retried in place; an SDK that arrived but did not
    // start (or is stuck) only starts again with a new page load.
    if (!canRetryOneSignalLoad()) {
      window.location.reload()
      return
    }
    setLoadAttempt((attempt) => attempt + 1)
  }, [])

  // Función para establecer external ID (barberos.id)
  const setExternalId = useCallback(async (id: string) => {
    await linkOneSignalUser(id)
  }, [])

  // Función para enviar tags
  const sendTags = useCallback(async (tags: Record<string, any>) => {
    await sendOneSignalTags(tags)
  }, [])

  const overlayVisible = enabled && showPrompt && !isAdminRoute && permissionStatus !== 'granted'
  const view = resolvePromptView(sdkState, pushSupport, permissionStatus)

  const renderPromptContent = () => {
    if (view === 'ios-install') {
      return {
        icon: <Smartphone size={48} />,
        title: 'Instala la app en tu iPhone',
        body: (
          <>
            <p className="onesignal-prompt-message">
              En iPhone, las notificaciones solo funcionan desde la app instalada en tu pantalla de inicio.
            </p>
            <ol className="onesignal-prompt-steps">
              <li>Abre <strong>chamosbarber.com</strong> en Safari.</li>
              <li>Toca <strong>Compartir</strong> y elige <strong>«Agregar a inicio»</strong>.</li>
              <li>Abre la app desde el ícono y permite las notificaciones.</li>
            </ol>
          </>
        ),
        actions: <button className="onesignal-btn onesignal-btn-primary" onClick={dismissPrompt}>Entendido</button>,
      }
    }

    if (view === 'ios-update' || view === 'unsupported') {
      return {
        icon: <BellOff size={48} />,
        title: 'Notificaciones no disponibles',
        body: (
          <p className="onesignal-prompt-message">
            {view === 'ios-update'
              ? 'Tu iPhone necesita iOS 16.4 o superior para recibir notificaciones. Actualízalo en Ajustes > General > Actualización de software.'
              : 'Este navegador no admite notificaciones. Abre chamosbarber.com en Chrome, Edge, Firefox o Safari actualizado.'}
          </p>
        ),
        actions: <button className="onesignal-btn onesignal-btn-primary" onClick={dismissPrompt}>Entendido</button>,
      }
    }

    if (view === 'failed') {
      return {
        icon: <BellOff size={48} />,
        title: 'No pudimos cargar las notificaciones',
        body: (
          <p className="onesignal-prompt-message">
            Revisa tu conexión a internet e inténtalo de nuevo.
          </p>
        ),
        actions: (
          <>
            <button className="onesignal-btn onesignal-btn-primary" onClick={retryLoad}>Reintentar</button>
            <button className="onesignal-btn onesignal-btn-secondary" onClick={dismissPrompt}>Ahora no</button>
          </>
        ),
      }
    }

    if (view === 'blocked') {
      return {
        icon: <BellOff size={48} />,
        title: 'Notificaciones bloqueadas',
        body: (
          <p className="onesignal-prompt-message">
            Bloqueaste las notificaciones para este sitio. Para recibirlas, entra a la configuración del sitio (icono del candado 🔒) o a los ajustes de notificaciones de tu teléfono y cambia el permiso a «Permitir».
          </p>
        ),
        actions: <button className="onesignal-btn onesignal-btn-primary" onClick={dismissPrompt}>Entendido</button>,
      }
    }

    const ready = sdkState === 'ready'
    return {
      icon: <Bell size={48} />,
      title: 'Activa las notificaciones',
      body: (
        <>
          <p className="onesignal-prompt-message">
            Recibe un aviso al instante cada vez que te reserven, reagenden o cancelen una cita.
          </p>
          {requestSlow && (
            <p className="onesignal-prompt-hint" role="status">
              Si no ves el aviso del navegador para permitir las notificaciones, cierra la app y vuelve a abrirla.
            </p>
          )}
        </>
      ),
      actions: (
        <>
          <button
            className="onesignal-btn onesignal-btn-primary"
            onClick={requestPermission}
            disabled={!ready || isRequesting}
          >
            <Bell size={20} />
            {ready ? (permission === 'granted' ? 'Activar notificaciones' : 'Permitir notificaciones') : 'Preparando...'}
          </button>
          <button className="onesignal-btn onesignal-btn-secondary" onClick={dismissPrompt}>
            Ahora no
          </button>
        </>
      ),
    }
  }

  const prompt = overlayVisible ? renderPromptContent() : null

  return (
    <OneSignalContext.Provider value={{
      initialized: sdkState === 'ready',
      permissionStatus,
      pushSupport,
      showPrompt,
      triggerPrompt,
      setExternalId,
      sendTags
    }}>
      {children}

      {/* Prompt personalizado de notificaciones (Oculto en rutas Admin) */}
      {prompt && (
        <div className="onesignal-prompt-overlay">
          <div className="onesignal-prompt">
            <button
              className="onesignal-prompt-close"
              onClick={dismissPrompt}
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>

            <div className={`onesignal-prompt-icon ${view === 'blocked' ? 'bg-red-500' : ''}`}>
              {prompt.icon}
            </div>

            <h3 className="onesignal-prompt-title">{prompt.title}</h3>

            {prompt.body}

            <div className="onesignal-prompt-actions">
              {prompt.actions}
            </div>
          </div>
        </div>
      )}

      {/* Indicador de estado en desarrollo */}
      {isDev && sdkState === 'ready' && (
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

        .onesignal-prompt-hint {
          font-size: 0.875rem;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.65);
          text-align: center;
          margin: -1.25rem 0 1.5rem;
        }

        .onesignal-prompt-steps {
          font-size: 0.938rem;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.8);
          margin: -1rem 0 2rem;
          padding-left: 1.25rem;
          list-style: decimal;
        }

        .onesignal-prompt-steps li + li { margin-top: 0.5rem; }

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

        .onesignal-btn:disabled {
          opacity: 0.6;
          cursor: wait;
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
