// Aggregate-only, anonymous usage counters. No cookies, no email, no IP or
// user-agent ever stored raw — country/device/browser are classified into a
// handful of buckets and only the bucket counts are incremented. The one
// exception is `visitorId`: a random id the client keeps in localStorage
// (src/lib/analytics.ts) solely to tell "new" from "returning" visits — it's
// never linked to anything they read/write/say in the app, and expires after
// 90 days. There is still no way to reconstruct "what did visitor X do".
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { redis } from '../_lib/redis.js'

const KNOWN_VIEWS = new Set(['today', 'chat', 'journal', 'routines', 'calm', 'insights', 'settings'])
const MAX_SESSION_SECONDS = 4 * 60 * 60 // clamp obviously-bogus values, not a real session cap
const FIRST_SEEN_TTL_SECONDS = 90 * 24 * 60 * 60

function utcDateKey(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}

function classifyDevice(ua: string): 'mobile' | 'tablet' | 'desktop' {
  if (/ipad|tablet/i.test(ua)) return 'tablet'
  if (/mobile|iphone|android/i.test(ua)) return 'mobile'
  return 'desktop'
}

function classifyBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return 'Edge'
  if (/(chrome|crios)\//i.test(ua)) return 'Chrome'
  if (/firefox|fxios/i.test(ua)) return 'Firefox'
  if (/safari/i.test(ua)) return 'Safari'
  return 'Other'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' })
    return
  }
  const body = req.body as { type?: string; view?: string; seconds?: number; visitorId?: string }
  const date = utcDateKey()
  const r = redis()

  if (body?.type === 'pageview') {
    const now = new Date()
    const country = (req.headers['x-vercel-ip-country'] as string) || 'unknown'
    const ua = (req.headers['user-agent'] as string) || ''
    const device = classifyDevice(ua)
    const browser = classifyBrowser(ua)
    const hour = now.getUTCHours()

    const ops: Promise<unknown>[] = [
      r.incr(`analytics:visits:${date}`),
      r.incr(`analytics:country:${date}:${country}`),
      r.sadd(`analytics:countries:${date}`, country),
      r.incr(`analytics:device:${date}:${device}`),
      r.sadd(`analytics:devices:${date}`, device),
      r.incr(`analytics:browser:${date}:${browser}`),
      r.sadd(`analytics:browsers:${date}`, browser),
      r.incr(`analytics:hour:${date}:${hour}`),
    ]

    if (body.visitorId && /^[a-zA-Z0-9-]{10,64}$/.test(body.visitorId)) {
      const firstSeenKey = `analytics:firstSeen:${body.visitorId}`
      const firstSeen = await r.get<string>(firstSeenKey)
      if (!firstSeen) {
        ops.push(r.set(firstSeenKey, date, { ex: FIRST_SEEN_TTL_SECONDS }))
        ops.push(r.incr(`analytics:visitorsNew:${date}`))
      } else if (firstSeen !== date) {
        ops.push(r.incr(`analytics:visitorsReturning:${date}`))
      }
    }

    await Promise.all(ops)
  } else if (body?.type === 'feature' && body.view && KNOWN_VIEWS.has(body.view)) {
    await r.incr(`analytics:feature:${body.view}:${date}`)
  } else if (body?.type === 'session' && typeof body.seconds === 'number' && body.seconds > 0) {
    const seconds = Math.min(Math.round(body.seconds), MAX_SESSION_SECONDS)
    await r.incrby(`analytics:sessionSeconds:${date}`, seconds)
    await r.incr(`analytics:sessionCount:${date}`)
  } else {
    res.status(400).json({ error: 'invalid body' })
    return
  }

  res.status(204).end()
}
