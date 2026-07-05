import { useState } from 'react'
import { ArrowRight, MessageCircleHeart, NotebookPen, Sparkles } from 'lucide-react'
import { useMoods, useName, type Mood } from '../lib/store'
import { appendSpeech } from '../lib/speech'
import { useLang } from '../lib/i18n'
import MicButton from './MicButton'
import DiaryStreak from './DiaryStreak'

function greetingKey() {
  const h = new Date().getHours()
  if (h < 12) return 'today.greeting.morning'
  if (h < 18) return 'today.greeting.afternoon'
  return 'today.greeting.evening'
}

function Sparkline({ moods }: { moods: Mood[] }) {
  const recent = [...moods].slice(0, 14).reverse()
  if (recent.length < 2) return null
  const w = 260
  const h = 48
  const pts = recent.map((m, i) => {
    const x = (i / (recent.length - 1)) * w
    const y = h - ((m.score - 1) / 4) * h
    return `${x},${y}`
  })
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 h-12 w-full">
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke="#6f8574"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function Today({ go }: { go: (v: string) => void }) {
  const { moods, add } = useMoods()
  const [name] = useName()
  const [note, setNote] = useState('')
  const [picked, setPicked] = useState<number | null>(null)
  const [saved, setSaved] = useState(false)
  const { t, localeTag } = useLang()

  const FACES = ['😔', '😕', '😐', '🙂', '😊']
  const LABELS = [
    t('today.face.veryLow'),
    t('today.face.low'),
    t('today.face.okay'),
    t('today.face.good'),
    t('today.face.great'),
  ]

  const todayLogged =
    moods[0] && new Date(moods[0].date).toDateString() === new Date().toDateString()

  function save() {
    if (picked == null) return
    add(picked, note.trim() || undefined)
    setSaved(true)
    setNote('')
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-6">
        <p className="text-sm text-muted">
          {new Date().toLocaleDateString(localeTag, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </p>
        <h1 className="font-display text-4xl leading-tight text-ink">
          {t(greetingKey())}
          {name ? `, ${name}` : ''}.
        </h1>
        <p className="mt-1 text-muted">{t('today.subtitle')}</p>
      </header>

      {/* Mood check-in */}
      <div className="card p-6">
        {saved ? (
          <div className="py-6 text-center animate-rise">
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-sage/25 animate-breathe" />
            <p className="font-display text-xl text-ink">{t('today.thanks')}</p>
            <p className="text-sm text-muted">{t('today.thanksSub')}</p>
          </div>
        ) : (
          <>
            <p className="mb-4 font-display text-xl text-sagedeep">
              {todayLogged ? t('today.checkinAgain') : t('today.checkinFirst')}
            </p>
            <div className="flex justify-between gap-2">
              {FACES.map((f, i) => (
                <button
                  key={i}
                  onClick={() => setPicked(i + 1)}
                  className={`flex flex-1 flex-col items-center gap-1.5 rounded-2xl py-3 transition ${
                    picked === i + 1
                      ? 'bg-sage/20 ring-1 ring-sage/40'
                      : 'hover:bg-white/70'
                  }`}
                >
                  <span className="text-2xl sm:text-3xl">{f}</span>
                  <span className="text-[11px] text-muted">{LABELS[i]}</span>
                </button>
              ))}
            </div>
            {picked != null && (
              <div className="mt-4 animate-rise">
                <div className="relative">
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t('today.notePlaceholder')}
                    className="w-full rounded-2xl border border-ink/10 bg-white/60 px-4 py-3 pr-14 text-sm text-ink outline-none transition focus:border-sage/50"
                  />
                  <MicButton
                    onFinal={(txt) => setNote((p) => appendSpeech(p, txt))}
                    className="absolute right-2 top-1/2 h-9 w-9 -translate-y-1/2"
                  />
                </div>
                <button
                  onClick={save}
                  className="mt-3 w-full rounded-full bg-clay py-3 text-sm font-medium text-white transition hover:opacity-90"
                >
                  {t('today.log')}
                </button>
              </div>
            )}
          </>
        )}
        {moods.length >= 2 && (
          <div className="mt-5 border-t border-ink/8 pt-4">
            <p className="text-xs text-muted">{t('today.trend')}</p>
            <Sparkline moods={moods} />
          </div>
        )}
      </div>

      <div className="mt-5">
        <DiaryStreak />
      </div>

      {/* Quick actions */}
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <QuickCard
          icon={<MessageCircleHeart size={20} />}
          title={t('today.quick.talk.title')}
          desc={t('today.quick.talk.desc')}
          onClick={() => go('chat')}
        />
        <QuickCard
          icon={<NotebookPen size={20} />}
          title={t('today.quick.journal.title')}
          desc={t('today.quick.journal.desc')}
          onClick={() => go('journal')}
        />
        <QuickCard
          icon={<Sparkles size={20} />}
          title={t('today.quick.plan.title')}
          desc={t('today.quick.plan.desc')}
          onClick={() => go('routines')}
        />
      </div>
    </div>
  )
}

function QuickCard({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="card group flex flex-col items-start p-5 text-left transition hover:border-sage/40"
    >
      <div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-sage/15 text-sagedeep">
        {icon}
      </div>
      <p className="font-display text-lg text-ink">{title}</p>
      <p className="text-sm text-muted">{desc}</p>
      <ArrowRight
        size={16}
        className="mt-2 text-clay opacity-0 transition group-hover:opacity-100"
      />
    </button>
  )
}
