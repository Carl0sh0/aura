// Read-only view of the aggregate counters written by beacon.ts. Protected by
// its own ADMIN_SECRET — deliberately separate from CRON_SECRET (which
// authenticates the GitHub Actions reminders job, not a human) so the admin
// panel can use a short, memorable password without weakening that one.
// Example: curl -H "Authorization: Bearer $ADMIN_SECRET" \
//   "https://aurahelps.vercel.app/api/analytics/stats?days=7"
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { redis } from '../_lib/redis.js'

const KNOWN_VIEWS = ['today', 'chat', 'journal', 'routines', 'calm', 'insights', 'settings']

function utcDateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// Reads a set of bucket names for the day (e.g. which countries showed up),
// then the count for each — so the response only ever lists buckets that
// actually had at least one visit that day.
async function bucketCounts(
  r: ReturnType<typeof redis>,
  setKey: string,
  countKeyFor: (bucket: string) => string,
): Promise<Record<string, number>> {
  const members = await r.smembers(setKey)
  if (!members.length) return {}
  const counts = await Promise.all(members.map((m) => r.get<number>(countKeyFor(m))))
  const out: Record<string, number> = {}
  members.forEach((m, i) => {
    if (counts[i]) out[m] = counts[i] as number
  })
  return out
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method not allowed' })
    return
  }
  if (req.headers.authorization !== `Bearer ${process.env.ADMIN_SECRET}`) {
    res.status(403).json({ error: 'forbidden' })
    return
  }

  // The admin dashboard requests 2x its visible range to compute a
  // vs-previous-period delta client-side, so the cap needs headroom above
  // the largest range it offers (90 days) rather than matching it exactly.
  const days = Math.min(Number(req.query.days) || 7, 200)
  const r = redis()
  const out = []

  for (let i = 0; i < days; i++) {
    const date = utcDateKey(new Date(Date.now() - i * 86400000))

    const [
      visits,
      sessionSeconds,
      sessionCount,
      visitorsNew,
      visitorsReturning,
      featureCounts,
      countries,
      devices,
      browsers,
      hourCounts,
    ] = await Promise.all([
      r.get<number>(`analytics:visits:${date}`),
      r.get<number>(`analytics:sessionSeconds:${date}`),
      r.get<number>(`analytics:sessionCount:${date}`),
      r.get<number>(`analytics:visitorsNew:${date}`),
      r.get<number>(`analytics:visitorsReturning:${date}`),
      Promise.all(KNOWN_VIEWS.map((v) => r.get<number>(`analytics:feature:${v}:${date}`))),
      bucketCounts(r, `analytics:countries:${date}`, (c) => `analytics:country:${date}:${c}`),
      bucketCounts(r, `analytics:devices:${date}`, (d) => `analytics:device:${date}:${d}`),
      bucketCounts(r, `analytics:browsers:${date}`, (b) => `analytics:browser:${date}:${b}`),
      Promise.all(
        Array.from({ length: 24 }, (_, h) => r.get<number>(`analytics:hour:${date}:${h}`)),
      ),
    ])

    const features: Record<string, number> = {}
    KNOWN_VIEWS.forEach((v, idx) => {
      if (featureCounts[idx]) features[v] = featureCounts[idx] as number
    })

    out.push({
      date,
      visits: visits || 0,
      newVisitors: visitorsNew || 0,
      returningVisitors: visitorsReturning || 0,
      avgSessionSeconds:
        sessionCount && sessionSeconds ? Math.round((sessionSeconds as number) / (sessionCount as number)) : 0,
      features,
      countries,
      devices,
      browsers,
      hourly: hourCounts.map((c) => c || 0), // index 0-23, UTC hour
    })
  }

  res.status(200).json(out)
}
