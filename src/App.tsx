import { useEffect, useState } from 'react'
import {
  Home,
  MessageCircleHeart,
  NotebookPen,
  Settings as SettingsIcon,
  Sparkles,
} from 'lucide-react'
import Today from './components/Today'
import Chat from './components/Chat'
import Journal from './components/Journal'
import Routines from './components/Routines'
import Settings from './components/Settings'
import { useName } from './lib/store'
import { useSettings } from './lib/settings'
import { useLang } from './lib/i18n'

type View = 'today' | 'chat' | 'journal' | 'routines' | 'settings'

const NAV: { id: View; labelKey: string; icon: typeof Home }[] = [
  { id: 'today', labelKey: 'nav.today', icon: Home },
  { id: 'chat', labelKey: 'nav.talk', icon: MessageCircleHeart },
  { id: 'journal', labelKey: 'nav.journal', icon: NotebookPen },
  { id: 'routines', labelKey: 'nav.plan', icon: Sparkles },
  { id: 'settings', labelKey: 'nav.settings', icon: SettingsIcon },
]

export default function App() {
  const [view, setView] = useState<View>('today')
  const [name, setName] = useName()
  const [asking, setAsking] = useState(!name)
  const [draft, setDraft] = useState('')
  const [settings] = useSettings()
  const { t } = useLang()

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', settings.reduceMotion)
  }, [settings.reduceMotion])

  if (asking) {
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <div className="card w-full max-w-md p-8 text-center animate-rise">
          <img src="/logo-mark.svg" alt="" className="mx-auto mb-5 h-16 w-16 animate-breathe" />
          <h1 className="font-display text-3xl text-ink">{t('welcome.title')}</h1>
          <p className="mt-2 text-sm text-muted">{t('welcome.desc')}</p>
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
            onClick={() => setView(id)}
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
          {view === 'settings' && <Settings />}
        </div>
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-ink/10 bg-cream/90 px-2 py-2 backdrop-blur md:hidden">
        {NAV.map(({ id, labelKey, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setView(id)}
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
