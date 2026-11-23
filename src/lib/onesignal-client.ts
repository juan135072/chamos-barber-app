/**
 * Browser side of OneSignal Web SDK v16.
 *
 * The SDK is loaded and initialised once per page lifetime through the
 * documented `OneSignalDeferred` queue. Every consumer awaits the same
 * promise instead of polling `window.OneSignal`.
 *
 * external_id in OneSignal = barberos.id. `login()` runs after init on every
 * barber page load, whether or not notifications are allowed yet: OneSignal
 * links the push subscription to that user as soon as one exists.
 */

export const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || '63aa14ec-de8c-46b3-8949-e9fd221f8d70'
// With the dashboard integration set to "Custom Code", Safari on macOS takes its
// web ID from init() instead of the dashboard. Public value, from the app's web config.
export const ONESIGNAL_SAFARI_WEB_ID = 'web.onesignal.auto.34cabfa2-ddd9-46d0-b8b2-6fad793020e0'
export const ONESIGNAL_SDK_SRC = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'

const isDev = process.env.NODE_ENV === 'development'

let sdkPromise: Promise<any | null> | null = null
let initCall: Promise<any | null> | null = null
let readySdk: any | null = null
let desiredExternalId: string | null = null
let linkedExternalId: string | null = null
let desiredTags: Record<string, any> | null = null
let sentTags: string | null = null
// login and tags run one after another, in the order they were asked.
let userSync: Promise<void> = Promise.resolve()

// ----------------------------------------------------------------
// Push support (pure, so it can be tested without a browser)
// ----------------------------------------------------------------

export type PushSupport = 'supported' | 'ios-install' | 'ios-update' | 'unsupported'

export interface PushEnvironment {
  userAgent: string
  maxTouchPoints: number
  standalone: boolean
  hasServiceWorker: boolean
  hasPushManager: boolean
  hasNotification: boolean
}

/**
 * iPhone/iPad only expose web push to apps added to the Home Screen
 * (iOS 16.4+). A Safari tab has no PushManager at all.
 */
export function detectPushSupport(env: PushEnvironment): PushSupport {
  if (env.hasServiceWorker && env.hasPushManager && env.hasNotification) return 'supported'

  // iPadOS reports itself as a Mac; touch points tell them apart.
  const isIOS = /iPad|iPhone|iPod/.test(env.userAgent) || (/Macintosh/.test(env.userAgent) && env.maxTouchPoints > 1)
  if (isIOS) return env.standalone ? 'ios-update' : 'ios-install'
  return 'unsupported'
}

export function readPushEnvironment(): PushEnvironment {
  const nav: any = typeof navigator !== 'undefined' ? navigator : {}
  const win: any = typeof window !== 'undefined' ? window : {}
  return {
    userAgent: String(nav.userAgent || ''),
    maxTouchPoints: Number(nav.maxTouchPoints || 0),
    standalone: nav.standalone === true || Boolean(win.matchMedia?.('(display-mode: standalone)')?.matches),
    hasServiceWorker: 'serviceWorker' in nav,
    // Same check OneSignalSDK.page.js makes before loading the real SDK; when it
    // fails the SDK never starts, so there is nothing to wait for.
    hasPushManager: 'PushManager' in win &&
      typeof win.PushSubscriptionOptions !== 'undefined' &&
      Object.prototype.hasOwnProperty.call(win.PushSubscriptionOptions.prototype, 'applicationServerKey'),
    hasNotification: 'Notification' in win,
  }
}

export type PermissionStatus = 'default' | 'granted' | 'denied'

/**
 * `OneSignal.Notifications.permission` is a boolean (granted or not); only the
 * browser's own Notification.permission tells "blocked" from "not asked yet".
 */
export function resolvePermissionStatus(sdkPermission: unknown, nativePermission: string | null | undefined): PermissionStatus {
  if (sdkPermission === true || nativePermission === 'granted') return 'granted'
  if (nativePermission === 'denied') return 'denied'
  return 'default'
}

export function readNativePermission(): string | null {
  if (typeof window === 'undefined' || !('Notification' in window)) return null
  return (window as any).Notification.permission ?? null
}

/**
 * `PushSubscription.optedIn` only says the browser allows notifications and the
 * device did not opt out; it stays true when subscribing failed. Only a push
 * token means OneSignal can reach this device.
 */
export function hasPushSubscription(sdk: any): boolean {
  const subscription = sdk?.User?.PushSubscription
  return subscription?.optedIn === true && Boolean(subscription?.token)
}

// ----------------------------------------------------------------
// Permission flow decisions (pure, used by OneSignalProvider)
// ----------------------------------------------------------------

/**
 * The state the app shows for this device. Allowed by the browser but without
 * a OneSignal push token (subscribing failed or the barber opted out) is not
 * active yet, so "Activar" stays offered.
 */
export function resolveDeviceStatus(permission: PermissionStatus, subscribed: boolean): PermissionStatus {
  return permission === 'granted' && !subscribed ? 'default' : permission
}

/**
 * How a tap gets this device subscribed:
 *   prompt    → not allowed yet: the browser asks.
 *   opt-in    → allowed but opted out: optIn(), then requestPermission() if
 *               there is still no push token.
 *   subscribe → allowed and opted in without a token: requestPermission()
 *               subscribes; it does not ask again once permission is granted.
 */
export type PermissionRequestPlan = 'prompt' | 'opt-in' | 'subscribe'

export function planPermissionRequest(sdkPermission: unknown, optedIn: unknown): PermissionRequestPlan {
  if (sdkPermission !== true) return 'prompt'
  return optedIn === true ? 'subscribe' : 'opt-in'
}

/**
 * Starts the request for a tap. With the 'prompt' plan the browser prompt is
 * asked before this returns: browsers ignore permission requests made after an
 * await, so callers must not await anything before calling it. Resolves with
 * what requestPermission() resolved (false = allowed but the device could not
 * subscribe); an SDK that throws gives a rejected promise.
 */
export function startPermissionRequest(sdk: any): Promise<unknown> {
  try {
    const plan = planPermissionRequest(sdk.Notifications.permission, sdk.User?.PushSubscription?.optedIn)
    if (plan === 'prompt') return Promise.resolve(sdk.Notifications.requestPermission())
    // Already allowed, so no browser prompt and awaiting is fine.
    const optIn = plan === 'opt-in' ? sdk.User.PushSubscription.optIn() : undefined
    return Promise.resolve(optIn).then(() => hasPushSubscription(sdk) || sdk.Notifications.requestPermission())
  } catch (error) {
    return Promise.reject(error)
  }
}

/**
 * Outcome of a finished request, from what it resolved (`accepted`), the
 * browser permission afterwards and whether the device now has a push token:
 *   subscribed     → success toast, the overlay closes.
 *   not-subscribed → allowed but no push token: retry toast, the overlay stays.
 *   dismissed      → the prompt was closed without choosing: the overlay closes.
 *   blocked        → denied: the overlay shows how to unblock.
 */
export type PermissionOutcome = 'subscribed' | 'not-subscribed' | 'dismissed' | 'blocked'

export function classifyPermissionResult(accepted: unknown, status: PermissionStatus, active: boolean): PermissionOutcome {
  if (status === 'granted') return accepted !== false && (active || accepted === true) ? 'subscribed' : 'not-subscribed'
  return status === 'denied' ? 'blocked' : 'dismissed'
}

export type SdkState = 'idle' | 'loading' | 'ready' | 'unsupported' | 'failed'
export type PromptView = 'ios-install' | 'ios-update' | 'unsupported' | 'failed' | 'blocked' | 'ask'

/** Which content the notifications overlay shows. */
export function resolvePromptView(sdkState: SdkState, pushSupport: PushSupport, status: PermissionStatus): PromptView {
  if (sdkState === 'unsupported') return pushSupport === 'ios-install' || pushSupport === 'ios-update' ? pushSupport : 'unsupported'
  if (sdkState === 'failed') return 'failed'
  return status === 'denied' ? 'blocked' : 'ask'
}

// ----------------------------------------------------------------
// SDK lifecycle
// ----------------------------------------------------------------

function initOnce(OneSignal: any, appId: string): Promise<any | null> {
  if (!initCall) {
    initCall = Promise.resolve()
      .then(() => OneSignal.init({
        appId,
        safari_web_id: ONESIGNAL_SAFARI_WEB_ID,
        allowLocalhostAsSecureOrigin: isDev,
        // Re-registers the device if the browser lost its push token.
        autoResubscribe: true,
        notifyButton: { enable: false },
        // Our own Spanish overlay asks first. These options (no auto slidedown, no
        // welcome push) only apply with the dashboard integration set to "Custom
        // Code"; under "Typical Site" the dashboard settings win.
        promptOptions: {
          slidedown: {
            prompts: [{
              type: 'push',
              autoPrompt: false,
              text: {
                actionMessage: 'Activa las notificaciones para enterarte al instante de tus nuevas citas.',
                acceptButton: 'Permitir',
                cancelButton: 'Ahora no',
              },
            }],
          },
        },
        // The default welcome push is in English and adds nothing for barbers.
        // Also ignored unless the dashboard integration is "Custom Code".
        welcomeNotification: { disable: true },
        serviceWorkerParam: { scope: '/' },
        serviceWorkerPath: '/OneSignalSDKWorker.js',
      }))
      .then(() => {
        readySdk = OneSignal
        void scheduleUserSync(OneSignal)
        return OneSignal
      })
      .catch((error: unknown) => {
        console.error('[OneSignal] init failed:', error)
        return null
      })
  }
  return initCall
}

/**
 * Loads the SDK script once and resolves with the initialised SDK, or null
 * when it could not start. A failed download can be retried by a later call.
 */
export function loadOneSignal(appId: string = ONESIGNAL_APP_ID): Promise<any | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return Promise.resolve(null)
  if (sdkPromise) return sdkPromise

  const attempt: Promise<any | null> = new Promise((resolve) => {
    const w = window as any
    w.OneSignalDeferred = w.OneSignalDeferred || []
    w.OneSignalDeferred.push(async (OneSignal: any) => {
      resolve(await initOnce(OneSignal, appId))
    })

    if (!document.querySelector(`script[src="${ONESIGNAL_SDK_SRC}"]`)) {
      const script = document.createElement('script')
      script.src = ONESIGNAL_SDK_SRC
      script.defer = true
      script.onerror = () => {
        // Offline or blocked: forget this attempt so the next call downloads again.
        script.remove()
        if (sdkPromise === attempt) sdkPromise = null
        resolve(null)
      }
      document.head.appendChild(script)
    }
  })
  sdkPromise = attempt
  return attempt
}

/**
 * True when a new `loadOneSignal()` call can download the SDK again (the
 * script failed to download). Once the script arrived, an SDK that did not
 * start only starts again with a new page load: it refuses a second init.
 */
export function canRetryOneSignalLoad(): boolean {
  return sdkPromise === null
}

/** The SDK if init already finished, for code that must not await (user gestures). */
export function getReadyOneSignal(): any | null {
  return readySdk
}

async function syncUser(sdk: any) {
  const id = desiredExternalId
  if (!sdk || !id) return

  if (id !== linkedExternalId) {
    try {
      await sdk.login(id)
      // A logout queued meanwhile already cleared the wanted id.
      if (desiredExternalId === id) linkedExternalId = id
      if (isDev) console.log('[OneSignal] login:', id)
    } catch (error) {
      console.warn('[OneSignal] login failed:', error)
      return
    }
  }

  // Tags go after login: tags set on the anonymous user are discarded by it.
  const serialized = desiredTags ? JSON.stringify(desiredTags) : null
  if (!serialized || serialized === sentTags || !sdk.User?.addTags) return
  try {
    await sdk.User.addTags(desiredTags)
    sentTags = serialized
  } catch (error) {
    console.warn('[OneSignal] addTags failed:', error)
  }
}

function enqueueUserTask(task: () => Promise<void>): Promise<void> {
  // A failed step must not stop the steps queued after it.
  userSync = userSync.then(task).catch((error) => console.warn('[OneSignal] user sync failed:', error))
  return userSync
}

function scheduleUserSync(sdk: any): Promise<void> {
  return enqueueUserTask(() => syncUser(sdk))
}

/** Links this device to the barber (external_id = barberos.id). */
export async function linkOneSignalUser(externalId: string): Promise<void> {
  const id = String(externalId || '').trim()
  if (!id) return
  desiredExternalId = id
  // Not loaded on this route yet: init applies the id when it finishes.
  if (!sdkPromise) return
  await scheduleUserSync(await sdkPromise)
}

export async function sendOneSignalTags(tags: Record<string, any>): Promise<void> {
  desiredTags = tags
  if (!sdkPromise) return
  await scheduleUserSync(await sdkPromise)
}

/**
 * Unlinks this device from the barber on logout. Best effort and bounded:
 * it never throws and never holds the logout longer than `timeoutMs`.
 */
export async function logoutOneSignal(timeoutMs = 2000): Promise<void> {
  desiredExternalId = null
  linkedExternalId = null
  desiredTags = null
  sentTags = null
  if (typeof window === 'undefined') return
  // Without web push there is no subscription on this device to unlink.
  if (!sdkPromise && detectPushSupport(readPushEnvironment()) !== 'supported') return

  // Not queued behind a pending login: the SDK already runs login and logout in
  // call order and keeps them queued while offline, so the logout is recorded
  // even if the page closes before OneSignal answers.
  const work = loadOneSignal()
    .then(async (sdk) => {
      if (sdk?.logout) await sdk.logout()
    })
    .catch((error) => console.warn('[OneSignal] logout failed:', error))

  let timer: ReturnType<typeof setTimeout> | undefined
  const limit = new Promise<void>((resolve) => { timer = setTimeout(resolve, timeoutMs) })
  await Promise.race([work, limit])
  clearTimeout(timer)
}
