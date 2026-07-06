// =====================================================================
// Optional Google Sign-In — client-side only (Google Identity Services).
// There is still no Aura backend: the ID token Google returns is decoded
// in the browser and the profile (name/email/picture) lives only in
// localStorage, same as every other piece of Aura data. Signing out just
// clears that local copy.
//
// Both this and the email-updates card stay hidden until configured via
// env vars (set in Vercel → Project → Settings → Environment Variables):
//   VITE_GOOGLE_CLIENT_ID   — OAuth Web client ID from Google Cloud Console
//   VITE_SUBSCRIBE_ENDPOINT — form endpoint (e.g. Formspree) that accepts
//                             a POSTed { email } JSON body
// =====================================================================
import { useCallback } from 'react'
import { usePersistentState } from './store'

export type Profile = {
  name: string
  email: string
  picture?: string
}

export const GOOGLE_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
export const SUBSCRIBE_ENDPOINT: string = import.meta.env.VITE_SUBSCRIBE_ENDPOINT || ''

export function googleSignInAvailable() {
  return !!GOOGLE_CLIENT_ID
}

// The raw ID token from the most recent sign-in, kept in memory only (never
// persisted — it expires in about an hour anyway) so features that need to
// prove identity to the backend (encrypted backup) can use it without a
// second round-trip through Google. Resets on page reload by design; the
// backup UI re-prompts sign-in when it finds none.
let latestIdToken: string | null = null
export function getLatestIdToken(): string | null {
  return latestIdToken
}
export function setLatestIdToken(token: string | null) {
  latestIdToken = token
}

export function emailCaptureAvailable() {
  return !!SUBSCRIBE_ENDPOINT
}

/** The locally-stored Google profile, or null when signed out / never signed in. */
export function useProfile() {
  const [profile, setProfile] = usePersistentState<Profile | null>('aura.profile', null)
  const signOut = useCallback(() => setProfile(null), [setProfile])
  return { profile, setProfile, signOut }
}

/** Decodes the payload of a Google ID token (JWT) without verification — fine here
 *  because the token comes straight from Google's own SDK callback in this browser
 *  session and is used only for local display, never sent anywhere. */
export function decodeIdToken(credential: string): Profile | null {
  try {
    const payload = JSON.parse(
      atob(credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
    )
    if (!payload?.email) return null
    return {
      name: payload.name || payload.given_name || '',
      email: payload.email,
      picture: payload.picture,
    }
  } catch {
    return null
  }
}

let gsiLoaded: Promise<void> | null = null

/** Loads the Google Identity Services script once. */
export function loadGsi(): Promise<void> {
  if (gsiLoaded) return gsiLoaded
  gsiLoaded = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      gsiLoaded = null
      reject(new Error('Failed to load Google Sign-In'))
    }
    document.head.appendChild(s)
  })
  return gsiLoaded
}

/** Sends an email to the configured capture endpoint. Resolves true on success. */
export async function subscribeEmail(email: string): Promise<boolean> {
  if (!SUBSCRIBE_ENDPOINT) return false
  try {
    const res = await fetch(SUBSCRIBE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email }),
    })
    return res.ok
  } catch {
    return false
  }
}
