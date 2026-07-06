// Server-side verification of a Google ID token. The client (src/lib/auth.ts)
// decodes the token's payload without checking its signature — safe there
// because it never leaves the device. The backup endpoint uses the token's
// `sub` to decide whose encrypted blob to read/write, so here we must
// actually verify it; otherwise anyone could hand-craft a token claiming to
// be someone else's account and read/overwrite their backup.
//
// Uses Google's tokeninfo endpoint rather than local JWKS verification —
// simplest possible correct implementation, no extra crypto dependency.
// Google documents this endpoint as fine for low-volume server-side checks;
// if Aura's traffic grows enough to hit its rate limit, switch to
// `google-auth-library`'s local JWKS verification instead.
export type VerifiedGoogleUser = { sub: string; email: string }

export async function verifyGoogleToken(idToken: string): Promise<VerifiedGoogleUser | null> {
  const clientId = process.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId || !idToken) return null

  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    )
    if (!res.ok) return null
    const payload = await res.json()
    if (payload.aud !== clientId) return null
    if (!payload.sub || !payload.email) return null
    const exp = Number(payload.exp)
    if (!exp || exp * 1000 < Date.now()) return null
    return { sub: payload.sub, email: payload.email }
  } catch {
    return null
  }
}
