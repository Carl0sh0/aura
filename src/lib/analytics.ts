// Aggregate-only, anonymous usage beacons — see api/analytics/beacon.ts. No
// cookie, name, or content is ever sent; the server only keeps daily sums and
// counts (visits, feature opens, total seconds visible, country/device/browser
// buckets, new-vs-returning). Country comes from Vercel's edge, not the
// client; device/browser come from the User-Agent header the browser already
// sends with every request regardless.
function send(payload: Record<string, unknown>) {
  try {
    navigator.sendBeacon?.(
      '/api/analytics/beacon',
      new Blob([JSON.stringify(payload)], { type: 'application/json' }),
    )
  } catch {
    // analytics should never break the app
  }
}

// A random id kept only to tell "new" from "returning" visits (see
// beacon.ts) — never linked to anything read/written/said in the app, and
// the server forgets it after 90 days of inactivity.
const VISITOR_ID_KEY = 'aura.visitorId'
function getVisitorId(): string {
  let id = localStorage.getItem(VISITOR_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(VISITOR_ID_KEY, id)
  }
  return id
}

export function trackPageview() {
  send({ type: 'pageview', visitorId: getVisitorId() })
}

export function trackFeature(view: string) {
  send({ type: 'feature', view })
}

// Foreground-time accounting: flushed whenever the tab is backgrounded/closed
// (visibilitychange → hidden is the reliable cross-platform signal; pagehide
// as a second net) and resumed when it comes back to the foreground. Each
// flush is its own "session" beacon, so a visit with several tab-switches
// counts as several shorter sessions rather than one long one — an accepted
// simplification for a rough usage signal, not a precise analytics product.
let visibleSince = Date.now()

export function resumeSessionTimer() {
  visibleSince = Date.now()
}

export function flushSessionDuration() {
  const seconds = Math.round((Date.now() - visibleSince) / 1000)
  visibleSince = Date.now()
  if (seconds > 0) send({ type: 'session', seconds })
}
