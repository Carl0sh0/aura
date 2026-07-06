import { useEffect, useRef } from 'react'
import {
  GOOGLE_CLIENT_ID,
  decodeIdToken,
  googleSignInAvailable,
  loadGsi,
  setLatestIdToken,
  useProfile,
  type Profile,
} from '../lib/auth'

// Renders the official Google Identity Services button and stores the decoded
// profile locally on success. Renders nothing when no client ID is configured
// or when already signed in — safe to drop anywhere. Pass `forceRender` to
// show it even when already signed in — used by the backup card to mint a
// fresh ID token (the raw token isn't persisted, so it's gone after a reload).
export default function GoogleSignInButton({
  onSignedIn,
  forceRender,
}: {
  onSignedIn?: (profile: Profile, idToken: string) => void
  forceRender?: boolean
}) {
  const { profile, setProfile } = useProfile()
  const ref = useRef<HTMLDivElement>(null)
  const onSignedInRef = useRef(onSignedIn)
  onSignedInRef.current = onSignedIn
  const shouldRender = forceRender || !profile

  useEffect(() => {
    if (!shouldRender || !googleSignInAvailable() || !ref.current) return
    let cancelled = false
    loadGsi()
      .then(() => {
        if (cancelled || !ref.current) return
        const google = (window as any).google
        google?.accounts?.id?.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (res: { credential: string }) => {
            const p = decodeIdToken(res.credential)
            setLatestIdToken(res.credential)
            if (p) {
              setProfile(p)
              onSignedInRef.current?.(p, res.credential)
            }
          },
        })
        google?.accounts?.id?.renderButton(ref.current, {
          theme: 'outline',
          size: 'large',
          shape: 'pill',
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [shouldRender, setProfile])

  if (!shouldRender) return null
  return <div ref={ref} className="flex justify-center" />
}
