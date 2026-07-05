import { useState } from 'react'
import {
  BookOpen,
  Coffee,
  Footprints,
  Heart,
  Loader2,
  Moon,
  RefreshCw,
  Sparkles,
  Sun,
  Wind,
} from 'lucide-react'
import { generateRoutine } from '../lib/api'
import { todayKey, useMoods, useRoutine } from '../lib/store'
import { appendSpeech } from '../lib/speech'
import { useLang } from '../lib/i18n'
import MicButton from './MicButton'

const ICONS: Record<string, typeof Sun> = {
  sun: Sun,
  heart: Heart,
  wind: Wind,
  book: BookOpen,
  walk: Footprints,
  moon: Moon,
  cup: Coffee,
  sparkle: Sparkles,
}

export default function Routines() {
  const [routine, setRoutine] = useRoutine()
  const { moods } = useMoods()
  const [focus, setFocus] = useState('')
  const [busy, setBusy] = useState(false)
  const { t, lang } = useLang()

  const MOOD_LABELS = [
    t('today.face.veryLow'),
    t('today.face.low'),
    t('today.face.okay'),
    t('today.face.good'),
    t('today.face.great'),
  ]

  const fresh = routine && routine.date === todayKey()
  const moodWord = moods[0] ? MOOD_LABELS[moods[0].score - 1] : MOOD_LABELS[2]

  async function make() {
    setBusy(true)
    try {
      const r = await generateRoutine(moodWord, focus, lang)
      setRoutine({ date: todayKey(), intro: r.intro, habits: r.habits, done: {} })
    } finally {
      setBusy(false)
    }
  }

  function toggle(i: number) {
    if (!routine) return
    setRoutine({ ...routine, done: { ...routine.done, [i]: !routine.done[i] } })
  }

  const doneCount = routine ? Object.values(routine.done).filter(Boolean).length : 0

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-4">
        <h1 className="font-display text-3xl text-ink">{t('routines.title')}</h1>
        <p className="text-sm text-muted">{t('routines.subtitle')}</p>
      </header>

      {!fresh ? (
        <div className="card p-6 text-center">
          <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-clay/15 animate-breathe" />
          <p className="font-display text-xl text-ink">{t('routines.build.title')}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            {t('routines.build.sub', { mood: moodWord })}
          </p>
          <div className="relative mx-auto mt-4 w-full max-w-md">
            <input
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder={t('routines.focusPlaceholder')}
              className="w-full rounded-full border border-ink/10 bg-white/60 px-5 py-3 pr-14 text-sm text-ink outline-none transition focus:border-sage/50"
            />
            <MicButton
              onFinal={(txt) => setFocus((p) => appendSpeech(p, txt))}
              className="absolute right-1.5 top-1/2 h-9 w-9 -translate-y-1/2 !rounded-full"
            />
          </div>
          <button
            onClick={make}
            disabled={busy}
            className="mx-auto mt-4 flex items-center gap-2 rounded-full bg-clay px-6 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
            {t('routines.create')}
          </button>
        </div>
      ) : (
        <div>
          <div className="card mb-4 flex items-center justify-between p-5">
            <div>
              <p className="text-sm leading-relaxed text-ink/85">{routine!.intro}</p>
              <p className="mt-1 text-xs text-muted">
                {t('routines.progress', { done: doneCount, total: routine!.habits.length })}
              </p>
            </div>
            <button
              onClick={make}
              disabled={busy}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ink/10 text-ink/50 transition hover:text-clay"
              aria-label={t('routines.regenerate')}
            >
              {busy ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            </button>
          </div>

          <div className="space-y-3">
            {routine!.habits.map((h, i) => {
              const Icon = ICONS[h.icon] || Sparkles
              const done = !!routine!.done[i]
              return (
                <button
                  key={i}
                  onClick={() => toggle(i)}
                  className={`card flex w-full items-center gap-4 p-4 text-left transition animate-rise ${
                    done ? 'opacity-60' : 'hover:border-sage/40'
                  }`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-full transition ${
                      done ? 'bg-sage text-white' : 'bg-sage/15 text-sagedeep'
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="flex-1">
                    <p
                      className={`font-medium text-ink ${done ? 'line-through decoration-ink/30' : ''}`}
                    >
                      {h.title}
                    </p>
                    <p className="text-sm text-muted">{h.why}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/70 px-2.5 py-1 text-xs text-muted">
                    {h.minutes}m
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
