import { useEffect, useRef } from 'react'
import { GOOGLE_CLIENT_ID, decodeIdToken, googleSignInAvailable, loadGsi, useProfile, type Profile } from '../lib/auth'

// Renders the official Google Identity Services button and stores the decoded
// profile locally on success. Renders nothing when no client ID is configured
// or when already signed in — safe to drop anywhere.
export default function GoogleSignInButton({
  onSignedIn,
}: {
  onSignedIn?: (profile: Profile) => void
}) {
  const { profile, setProfile } = useProfile()
  const ref = useRef<HTMLDivElement>(null)
  const onSignedInRef = useRef(onSignedIn)
  onSignedInRef.current = onSignedIn

  useEffect(() => {
    if (profile || !googleSignInAvailable() || !ref.current) return
    let cancelled = false
    loadGsi()
      .then(() => {
        if (cancelled || !ref.current) return
        const google = (window as any).google
        google?.accounts?.id?.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (res: { credential: string }) => {
            const p = decodeIdToken(res.credential)
            if (p) {
              setProfile(p)
              onSignedInRef.current?.(p)
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
  }, [profile, setProfile])

  if (profile || !googleSignInAvailable()) return null
  return <div ref={ref} className="flex justify-center" />
}
