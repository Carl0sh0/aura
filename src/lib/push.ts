// Subscribes/unsubscribes this browser to the daily reminder push.
// Deliberately anonymous: a random id generated once and kept only in this
// browser's localStorage, never tied to a name, email, or Google account —
// a reminder doesn't need to know who you are, only which browser to nudge.
import type { Lang } from './prompts'

const PUSH_ID_KEY = 'aura.pushId'

function getPushId(): string {
  let id = localStorage.getItem(PUSH_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(PUSH_ID_KEY, id)
  }
  return id
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    !!import.meta.env.VITE_VAPID_PUBLIC_KEY
  )
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(safe)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

/** Requests Notification permission and subscribes this browser to a daily reminder at the given local time. */
export async function subscribeToReminders(hour: number, minute: number, lang: Lang): Promise<boolean> {
  if (!isPushSupported()) return false

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  const reg = await navigator.serviceWorker.ready
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY as string) as BufferSource,
  })

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pushId: getPushId(), subscription: subscription.toJSON(), hour, minute, tz, lang }),
  })
  return res.ok
}

export async function unsubscribeFromReminders(): Promise<void> {
  if (!isPushSupported()) return
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    await sub?.unsubscribe()
  } catch {
    // best-effort
  }
  await fetch('/api/push/subscribe', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pushId: getPushId() }),
  }).catch(() => {})
}
