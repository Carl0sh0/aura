import { useEffect, useState, useRef } from 'react'
import {
  Activity,
  Home,
  MessageCircleHeart,
  NotebookPen,
  Settings as SettingsIcon,
  Sparkles,
  Wind,
} from 'lucide-react'
import AdminDashboard from './components/AdminDashboard'
import Today from './components/Today'
import Chat from './components/Chat'
import Journal from './components/Journal'
import Routines from './components/Routines'
import CalmSpace from './components/CalmSpace'
import Insights from './components/Insights'
import Settings from './components/Settings'
import GoogleSignInButton from './components/GoogleSignInButton'
import { googleSignInAvailable } from './lib/auth'
import { useName } from './lib/store'
import { useSettings, useActivePack, useModelIdForPack } from './lib/settings'
import { ensureLocalEngine, isModelDownloaded, webgpuSupported } from './lib/localEngine'
import { useLang } from './lib/i18n'
import { playIntroChime, playNavChime } from './lib/chime'
import { flushSessionDuration, resumeSessionTimer, trackFeature, trackPageview } from './lib/analytics'

type View = 'today' | 'chat' | 'journal' | 'routines' | 'calm' | 'insights' | 'settings'

const NAV: { id: View; labelKey: string; icon: typeof Home }[] = [
  { id: 'today', labelKey: 'nav.today', icon: Home },
  { id: 'chat', labelKey: 'nav.talk', icon: MessageCircleHeart },
  { id: 'journal', labelKey: 'nav.journal', icon: NotebookPen },
  { id: 'routines', labelKey: 'nav.plan', icon: Sparkles },
  { id: 'calm', labelKey: 'nav.calm', icon: Wind },
  { id: 'insights', labelKey: 'nav.insights', icon: Activity },
  { id: 'settings', labelKey: 'nav.settings', icon: SettingsIcon },
]

export default function App() {
  // Hidden operator-only route, not linked from anywhere in the app. Checked
  // before any other hook runs — safe because window.location.pathname is
  // fixed for the lifetime of this mount (no client-side router involved).
  if (typeof window !== 'undefined' && window.location.pathname === '/admin') {
    return <AdminDashboard />
  }

  const [view, setView] = useState<View>('today')
  const [name, setName] = useName()
  const [asking, setAsking] = useState(!name)
  const [draft, setDraft] = useState('')
  const [settings] = useSettings()
  const activePack = useActivePack()
  const { t } = useLang()

  const isFirstView = useRef(true)

  // Play intro chime on mount
  useEffect(() => {
    const stopChime = playIntroChime()
    return () => {
      if (typeof stopChime === 'function') stopChime()
    }
  }, [])

  // Aggregate, anonymous usage signal: one pageview beacon, and foreground-time
  // beacons flushed whenever the tab is hidden/closed (see src/lib/analytics.ts
  // for why this only ever sends totals, never per-visitor identifiers).
  useEffect(() => {
    trackPageview()
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushSessionDuration()
      else resumeSessionTimer()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flushSessionDuration)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flushSessionDuration)
    }
  }, [])

  // Play navigation chime when view changes
  useEffect(() => {
    if (isFirstView.current) {
      isFirstView.current = false
      return
    }
    playNavChime()
  }, [view])

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', settings.reduceMotion)
  }, [settings.reduceMotion])

  // Apply light/dark/system theme to HTML element
  useEffect(() => {
    const applyTheme = () => {
      const isDark =
        settings.theme === 'dark' ||
        (settings.theme === 'system' &&
          window.matchMedia('(prefers-color-scheme: dark)').matches)
      document.documentElement.classList.toggle('dark', isDark)
    }

    applyTheme()

    if (settings.theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)')
      const listener = () => applyTheme()
      media.addEventListener('change', listener)
      return () => media.removeEventListener('change', listener)
    }
  }, [settings.theme])

  // Prewarm: load the active companion's model into the GPU at app start if its weights
  // are already cached, so the first message doesn't pay several seconds of load time.
  // Never triggers a download — only loads what's already on-device.
  const activeModelId = useModelIdForPack(activePack.id)
  useEffect(() => {
    if (!webgpuSupported()) return
    let cancelled = false
    isModelDownloaded(activeModelId).then((downloaded) => {
      if (!cancelled && downloaded) ensureLocalEngine(activeModelId).catch(() => {})
    })
    return () => {
      cancelled = true
    }
  }, [activeModelId])

  if (asking && !name) {
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <div className="card w-full max-w-md p-8 text-center animate-rise">
          <img src="/logo-mark.svg" alt="" className="mx-auto mb-5 h-16 w-16 animate-breathe" />
          <h1 className="font-display text-3xl text-ink">{t('welcome.title')}</h1>
          <p className="mt-2 text-sm text-muted">{t('welcome.desc')}</p>

          {googleSignInAvailable() && (
            <div className="mt-5">
              <GoogleSignInButton
                onSignedIn={(p) => {
                  if (p.name) setName(p.name.split(' ')[0])
                  setAsking(false)
                }}
              />
              <div className="mt-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-ink/10" />
                <span className="text-xs text-muted">{t('welcome.or')}</span>
                <div className="h-px flex-1 bg-ink/10" />
              </div>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault()
              setName(draft.trim())
              setAsking(false)
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t('welcome.namePlaceholder')}
              className="mt-5 w-full rounded-full border border-ink/10 bg-white/60 px-5 py-3 text-center text-ink outline-none transition focus:border-sage/50"
            />
            <button
              type="submit"
              className="mt-4 w-full rounded-full bg-clay py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              {t('welcome.begin')}
            </button>
            <button
              type="button"
              onClick={() => setAsking(false)}
              className="mt-2 text-xs text-muted underline-offset-2 hover:underline"
            >
              {t('welcome.skip')}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col md:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-56 shrink-0 flex-col gap-1 px-4 py-8 md:flex">
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <img src="/logo-mark.svg" alt="" className="h-9 w-9" />
          <span className="font-display text-2xl text-ink">Aura</span>
        </div>
        {NAV.map(({ id, labelKey, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              setView(id)
              trackFeature(id)
            }}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition ${
              view === id
                ? 'bg-white/80 font-medium text-ink shadow-sm'
                : 'text-muted hover:bg-white/50 hover:text-ink'
            }`}
          >
            <Icon size={18} /> {t(labelKey)}
          </button>
        ))}
        <div className="mt-auto px-3 pt-6 text-xs leading-relaxed text-muted/80">
          {t('sidebar.disclaimer')}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 px-4 py-6 pb-24 sm:px-8 md:py-10 md:pb-10">
        <div className="h-full">
          {view === 'today' && <Today go={(v) => setView(v as View)} />}
          {view === 'chat' && <Chat />}
          {view === 'journal' && <Journal />}
          {view === 'routines' && <Routines />}
          {view === 'calm' && <CalmSpace />}
          {view === 'insights' && <Insights />}
          {view === 'settings' && <Settings />}
        </div>
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-ink/10 bg-cream/90 px-2 py-2 backdrop-blur md:hidden">
        {NAV.map(({ id, labelKey, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              setView(id)
              trackFeature(id)
            }}
            className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] transition ${
              view === id ? 'text-clay' : 'text-muted'
            }`}
          >
            <Icon size={20} /> {t(labelKey)}
          </button>
        ))}
      </nav>
    </div>
  )
}
