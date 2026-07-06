import { useEffect, useMemo, useState } from 'react'
import { Clock, Globe, MonitorSmartphone, Smartphone, Sparkles, TrendingUp, Users } from 'lucide-react'

// Hidden operator-only view at /admin — not linked from anywhere in the app.
// Reads the same aggregate, anonymous counters described in
// api/analytics/stats.ts (country/device/browser are buckets, never raw IP or
// UA; there is no per-visitor identity here, only "new vs returning" counts).
// The secret is the ADMIN_SECRET env var, kept only in sessionStorage
// (cleared when the tab closes) so it isn't a standing secret in the browser.
type DayStats = {
  date: string
  visits: number
  newVisitors: number
  returningVisitors: number
  avgSessionSeconds: number
  features: Record<string, number>
  countries: Record<string, number>
  devices: Record<string, number>
  browsers: Record<string, number>
  hourly: number[]
}

const SECRET_KEY = 'aura.adminSecret'
const DAY_OPTIONS = [7, 14, 30, 90] as const

function formatDuration(seconds: number): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

function shortDate(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

function sumBuckets(days: DayStats[], key: 'countries' | 'devices' | 'browsers'): Record<string, number> {
  const out: Record<string, number> = {}
  for (const d of days) {
    for (const [k, v] of Object.entries(d[key])) out[k] = (out[k] || 0) + v
  }
  return out
}

function sumHourly(days: DayStats[]): number[] {
  const out = new Array(24).fill(0)
  for (const d of days) d.hourly.forEach((v, h) => (out[h] += v))
  return out
}

// Sequential, single-hue encoding (magnitude, not identity) — no legend
// needed for one series. Percentage rides alongside the bar as a direct
// label rather than a second color, per "text never wears the data color."
function BarList({ data, icon }: { data: Record<string, number>; icon?: React.ReactNode }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1
  const max = Math.max(1, ...entries.map(([, v]) => v))
  if (!entries.length) return <p className="text-xs text-muted">Sin datos todavía.</p>
  return (
    <div className="space-y-2">
      {entries.slice(0, 8).map(([k, v]) => (
        <div key={k} className="flex items-center gap-2.5 text-xs">
          <span className="w-20 shrink-0 truncate text-ink/80" title={k}>
            {icon}
            {k}
          </span>
          <div className="h-2 flex-1 rounded-full bg-ink/8">
            <div className="h-full rounded-r-full bg-sage" style={{ width: `${Math.max(3, (v / max) * 100)}%` }} />
          </div>
          <span className="w-16 shrink-0 text-right tabular-nums text-ink">
            {v} <span className="text-muted">({Math.round((v / total) * 100)}%)</span>
          </span>
        </div>
      ))}
      {entries.length > 8 && (
        <p className="pt-1 text-[11px] text-muted">+{entries.length - 8} más</p>
      )}
    </div>
  )
}

// Single-series trend line: 2px stroke, ~10% area wash, direct end-label
// (the only label — never one per point). No legend needed for one series.
function Sparkline({ values }: { values: number[] }) {
  const w = 240
  const h = 40
  const max = Math.max(1, ...values)
  const pts = values.map((v, i) => {
    const x = (i / Math.max(1, values.length - 1)) * w
    const y = h - (v / max) * (h - 6) - 2
    return [x, y] as const
  })
  const line = pts.map(([x, y]) => `${x},${y}`).join(' ')
  const area = `0,${h} ${line} ${w},${h}`
  const last = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${w + 28} ${h}`} className="mt-1 h-10 w-full max-w-[280px]">
      <polygon points={area} fill="var(--color-sage)" opacity="0.1" />
      <polyline points={line} fill="none" stroke="var(--color-sage)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {last && (
        <>
          <circle cx={last[0]} cy={last[1]} r="3" fill="var(--color-sage)" stroke="var(--card-bg)" strokeWidth="2" />
          <text x={last[0] + 6} y={last[1] + 4} fontSize="10" fill="var(--color-ink)">
            {values[values.length - 1]}
          </text>
        </>
      )}
    </svg>
  )
}

function Tile({
  label,
  value,
  delta,
  icon,
  trend,
}: {
  label: string
  value: string
  delta?: number
  icon: React.ReactNode
  trend?: number[]
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted">
        {icon}
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="font-sans text-2xl font-semibold text-ink">{value}</p>
        {typeof delta === 'number' && Number.isFinite(delta) && (
          <span className={`text-xs font-medium ${delta >= 0 ? 'text-sagedeep' : 'text-clay'}`}>
            {delta >= 0 ? '+' : ''}
            {delta}% vs. período anterior
          </span>
        )}
      </div>
      {trend && trend.length > 1 && <Sparkline values={trend} />}
    </div>
  )
}

export default function AdminDashboard() {
  const [secret, setSecret] = useState(() => sessionStorage.getItem(SECRET_KEY) || '')
  const [input, setInput] = useState('')
  const [rangeDays, setRangeDays] = useState<(typeof DAY_OPTIONS)[number]>(14)
  const [days, setDays] = useState<DayStats[] | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Respect the system theme here too — this route bypasses App.tsx's own
  // theme effect (which only runs once a name/onboarding flow is in play).
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => document.documentElement.classList.toggle('dark', media.matches)
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [])

  async function load(s: string, rangeOverride?: number) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/analytics/stats?days=${(rangeOverride ?? rangeDays) * 2}`, {
        headers: { Authorization: `Bearer ${s}` },
      })
      if (res.status === 403) {
        setError('Clave incorrecta.')
        sessionStorage.removeItem(SECRET_KEY)
        setSecret('')
        setDays(null)
        return
      }
      if (!res.ok) throw new Error(String(res.status))
      setDays(await res.json())
      sessionStorage.setItem(SECRET_KEY, s)
      setSecret(s)
    } catch {
      setError('No se pudo cargar. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (secret) load(secret)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stats = useMemo(() => {
    if (!days) return null
    // days[0] is today; we fetch 2x the visible range so the "older half"
    // has a real comparison period, then slice back down to what's shown.
    const visible = days.slice(0, rangeDays)
    const previous = days.slice(rangeDays, rangeDays * 2)

    const sum = (arr: DayStats[]) => arr.reduce((s, d) => s + d.visits, 0)
    const visitsNow = sum(visible)
    const visitsPrev = sum(previous)
    const delta = visitsPrev > 0 ? Math.round(((visitsNow - visitsPrev) / visitsPrev) * 100) : undefined

    const totalNew = visible.reduce((s, d) => s + d.newVisitors, 0)
    const totalReturning = visible.reduce((s, d) => s + d.returningVisitors, 0)
    const weightedSession = visible.reduce((s, d) => s + d.avgSessionSeconds * d.visits, 0)
    const avgSession = visitsNow ? Math.round(weightedSession / visitsNow) : 0

    const featureTotals: Record<string, number> = {}
    visible.forEach((d) => {
      for (const [k, v] of Object.entries(d.features)) featureTotals[k] = (featureTotals[k] || 0) + v
    })
    const topFeature = Object.entries(featureTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

    const trend = [...visible].reverse().map((d) => d.visits) // oldest → newest, left to right
    const hourly = sumHourly(visible)

    return {
      visible,
      visitsNow,
      delta,
      totalNew,
      totalReturning,
      avgSession,
      featureTotals,
      topFeature,
      trend,
      hourly,
      countries: sumBuckets(visible, 'countries'),
      devices: sumBuckets(visible, 'devices'),
      browsers: sumBuckets(visible, 'browsers'),
    }
  }, [days, rangeDays])

  if (!secret) {
    return (
      <div className="grid min-h-screen place-items-center bg-cream p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (input.trim()) load(input.trim())
          }}
          className="card w-full max-w-sm p-6"
        >
          <p className="mb-3 font-display text-xl text-ink">Aura — Admin</p>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Clave de administrador"
            autoFocus
            className="w-full rounded-2xl border border-ink/10 bg-white/60 px-4 py-3 text-sm text-ink outline-none focus:border-sage/50"
          />
          {error && <p className="mt-2 text-xs text-clay">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-3 w-full rounded-full bg-clay py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
          >
            {loading ? 'Cargando…' : 'Entrar'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-ink">Aura — Admin</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-ink/10 bg-white/50 p-0.5">
            {DAY_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => {
                  setRangeDays(n)
                  load(secret, n)
                }}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  rangeDays === n ? 'bg-sage text-white' : 'text-muted hover:text-ink'
                }`}
              >
                {n}d
              </button>
            ))}
          </div>
          <button
            onClick={() => load(secret)}
            disabled={loading}
            className="rounded-full border border-ink/10 px-3 py-1.5 text-xs text-muted transition hover:border-sage/40 disabled:opacity-40"
          >
            {loading ? 'Cargando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-clay">{error}</p>}

      {!stats ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="card h-24 animate-pulse p-4" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile
              label="Visitas"
              value={String(stats.visitsNow)}
              delta={stats.delta}
              icon={<TrendingUp size={13} />}
              trend={stats.trend}
            />
            <Tile
              label="Nuevos / recurrentes"
              value={`${stats.totalNew} / ${stats.totalReturning}`}
              icon={<Users size={13} />}
            />
            <Tile label="Sesión media" value={formatDuration(stats.avgSession)} icon={<Clock size={13} />} />
            <Tile label="Función top" value={stats.topFeature} icon={<Sparkles size={13} />} />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="card p-4">
              <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-ink">
                <Globe size={15} className="text-sagedeep" /> País
              </p>
              <BarList data={stats.countries} />
            </div>
            <div className="card p-4">
              <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-ink">
                <Smartphone size={15} className="text-sagedeep" /> Dispositivo
              </p>
              <BarList data={stats.devices} />
            </div>
            <div className="card p-4">
              <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-ink">
                <MonitorSmartphone size={15} className="text-sagedeep" /> Navegador
              </p>
              <BarList data={stats.browsers} />
            </div>
            <div className="card p-4">
              <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-ink">
                <Sparkles size={15} className="text-sagedeep" /> Funciones más usadas
              </p>
              <BarList data={stats.featureTotals} />
            </div>
          </div>

          <div className="card mt-4 p-4">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-ink">
              <Clock size={15} className="text-sagedeep" /> Actividad por hora (UTC)
            </p>
            {/* Plot row (fixed height that already budgets for the peak label) and the
                hour-tick row are kept separate so neither ever clips the other. */}
            <div className="flex items-end gap-1" style={{ height: 70 }}>
              {stats.hourly.map((v, h) => {
                const max = Math.max(1, ...stats.hourly)
                const isPeak = v === max && v > 0
                return (
                  <div key={h} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                    {isPeak && <span className="text-[9px] leading-none text-sagedeep">{v}</span>}
                    <div
                      className={`w-full rounded-t ${isPeak ? 'bg-sagedeep' : 'bg-sage'}`}
                      style={{ height: Math.max(2, (v / max) * 48) }}
                      title={`${h}:00 UTC — ${v} visitas`}
                    />
                  </div>
                )
              })}
            </div>
            <div className="mt-1 flex gap-1">
              {stats.hourly.map((_, h) => (
                <div key={h} className="flex-1 text-center text-[9px] text-muted">
                  {h % 4 === 0 ? h : ''}
                </div>
              ))}
            </div>
          </div>

          <div className="card mt-4 max-h-80 overflow-y-auto overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-[var(--card-bg)] backdrop-blur">
                <tr className="border-b border-ink/8 text-xs uppercase tracking-wide text-muted">
                  <th className="whitespace-nowrap px-4 py-3">Fecha</th>
                  <th className="whitespace-nowrap px-4 py-3">Visitas</th>
                  <th className="whitespace-nowrap px-4 py-3">Nuevos/Recurrentes</th>
                  <th className="whitespace-nowrap px-4 py-3">Sesión media</th>
                  <th className="px-4 py-3">Top país · dispositivo</th>
                </tr>
              </thead>
              <tbody>
                {stats.visible.map((d) => {
                  const topCountry = Object.entries(d.countries).sort((a, b) => b[1] - a[1])[0]?.[0]
                  const topDevice = Object.entries(d.devices).sort((a, b) => b[1] - a[1])[0]?.[0]
                  return (
                    <tr key={d.date} className="border-b border-ink/5 last:border-0 hover:bg-white/40">
                      <td className="whitespace-nowrap px-4 py-2.5 text-ink">{shortDate(d.date)}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-ink">{d.visits}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-muted">
                        {d.newVisitors} / {d.returningVisitors}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-ink">
                        {formatDuration(d.avgSessionSeconds)}
                      </td>
                      <td className="px-4 py-2.5 text-muted">
                        {[topCountry, topDevice].filter(Boolean).join(' · ') || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
