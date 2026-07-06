import { useMemo, useState } from 'react'
import { BookOpen, ChevronLeft, ChevronRight, NotebookPen, Sparkles } from 'lucide-react'
import { useDiary, useJournal, useMoods } from '../lib/store'
import { useLang } from '../lib/i18n'
import SpeakButton from './SpeakButton'

const FACES = ['😔', '😕', '😐', '🙂', '😊']

// Every date key in the app (moods, journal, diary) is bucketed by
// `.toISOString().slice(0, 10)` — a UTC calendar day, not the visitor's local
// one (see store.ts). The grid below is built the same way so a day cell
// always matches the same bucket the rest of the app already writes to;
// mixing local-time grid days with UTC-bucketed data would silently misalign
// entries for anyone outside UTC.
function utcDayKey(y: number, m: number, d: number): string {
  return new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10)
}

export default function Insights() {
  const { moods } = useMoods()
  const { entries: journalEntries } = useJournal()
  const { entries: diaryEntries } = useDiary()
  const { t, localeTag } = useLang()

  const now = new Date()
  const todayKey = now.toISOString().slice(0, 10)
  const [viewYear, setViewYear] = useState(now.getUTCFullYear())
  const [viewMonth, setViewMonth] = useState(now.getUTCMonth()) // 0-11
  const [selectedDay, setSelectedDay] = useState(todayKey)

  const LABELS = [
    t('today.face.veryLow'),
    t('today.face.low'),
    t('today.face.okay'),
    t('today.face.good'),
    t('today.face.great'),
  ]

  const dayData = useMemo(() => {
    const map = new Map<string, { mood?: number; hasJournal: boolean; hasDiary: boolean }>()
    // moods is newest-first, so the first hit per key is that day's latest check-in.
    for (const m of moods) {
      const key = m.date.slice(0, 10)
      if (!map.has(key)) map.set(key, { mood: m.score, hasJournal: false, hasDiary: false })
    }
    for (const e of journalEntries) {
      const key = e.date.slice(0, 10)
      const existing = map.get(key) || { hasJournal: false, hasDiary: false }
      existing.hasJournal = true
      map.set(key, existing)
    }
    for (const d of diaryEntries) {
      const existing = map.get(d.date) || { hasJournal: false, hasDiary: false }
      existing.hasDiary = true
      map.set(d.date, existing)
    }
    return map
  }, [moods, journalEntries, diaryEntries])

  const atCurrentMonth = viewYear === now.getUTCFullYear() && viewMonth === now.getUTCMonth()

  function changeMonth(delta: number) {
    let y = viewYear
    let m = viewMonth + delta
    if (m < 0) {
      m = 11
      y -= 1
    } else if (m > 11) {
      m = 0
      y += 1
    }
    if (y > now.getUTCFullYear() || (y === now.getUTCFullYear() && m > now.getUTCMonth())) return
    setViewYear(y)
    setViewMonth(m)
  }

  const firstOfMonth = new Date(Date.UTC(viewYear, viewMonth, 1))
  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate()
  const leadingBlanks = (firstOfMonth.getUTCDay() + 6) % 7 // Monday-first grid

  const cells: (string | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => utcDayKey(viewYear, viewMonth, i + 1)),
  ]

  const weekdayLabels = Array.from({ length: 7 }, (_, i) =>
    // 2024-01-01 was a Monday — an arbitrary but stable Monday to read weekday names off.
    new Date(Date.UTC(2024, 0, 1 + i)).toLocaleDateString(localeTag, { weekday: 'narrow', timeZone: 'UTC' }),
  )

  const monthLabel = firstOfMonth.toLocaleDateString(localeTag, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

  const selected = dayData.get(selectedDay)
  const selectedJournal = journalEntries.filter((e) => e.date.slice(0, 10) === selectedDay)
  const selectedDiary = diaryEntries.find((d) => d.date === selectedDay)
  const selectedDateLabel = new Date(`${selectedDay}T00:00:00Z`).toLocaleDateString(localeTag, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
  const hasNothing = !selected?.mood && !selectedDiary && selectedJournal.length === 0

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-4">
        <h1 className="font-display text-3xl text-ink">{t('insights.title')}</h1>
        <p className="text-sm text-muted">{t('insights.subtitle')}</p>
      </header>

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => changeMonth(-1)}
            className="grid h-8 w-8 place-items-center rounded-full text-muted transition hover:bg-white/60 hover:text-ink"
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <p className="font-display text-lg capitalize text-ink">{monthLabel}</p>
          <button
            onClick={() => changeMonth(1)}
            disabled={atCurrentMonth}
            className="grid h-8 w-8 place-items-center rounded-full text-muted transition hover:bg-white/60 hover:text-ink disabled:opacity-30"
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase text-muted">
          {weekdayLabels.map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((key, i) => {
            if (!key) return <div key={`blank-${i}`} />
            const data = dayData.get(key)
            const dayNum = Number(key.slice(-2))
            const isSelected = key === selectedDay
            const isToday = key === todayKey
            return (
              <button
                key={key}
                onClick={() => setSelectedDay(key)}
                className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl text-xs transition ${
                  isSelected ? 'bg-sage/25 ring-1 ring-sage' : 'hover:bg-white/50'
                }`}
              >
                <span className={isToday ? 'font-semibold text-clay' : 'text-ink/70'}>{dayNum}</span>
                <span className="text-sm leading-none">{data?.mood ? FACES[data.mood - 1] : ' '}</span>
                <span
                  className={`h-1 w-1 rounded-full ${data?.hasJournal || data?.hasDiary ? 'bg-sagedeep' : 'bg-transparent'}`}
                />
              </button>
            )
          })}
        </div>
      </div>

      <div className="card mt-4 p-5">
        <p className="mb-3 font-display text-lg capitalize text-ink">{selectedDateLabel}</p>

        {hasNothing ? (
          <p className="py-6 text-center text-sm text-muted">{t('insights.noRecords')}</p>
        ) : (
          <div className="space-y-4">
            {selected?.mood && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">{t('insights.mood')}</p>
                <p className="flex items-center gap-2 text-ink">
                  <span className="text-xl">{FACES[selected.mood - 1]}</span> {LABELS[selected.mood - 1]}
                </p>
              </div>
            )}

            {selectedDiary && (
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                    <BookOpen size={13} /> {t('insights.diary')}
                  </p>
                  <SpeakButton id={`insights-diary-${selectedDay}`} text={selectedDiary.text} className="h-6 w-6" />
                </div>
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{selectedDiary.text}</p>
              </div>
            )}

            {selectedJournal.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                  <NotebookPen size={13} /> {t('insights.journal')}
                </p>
                <div className="space-y-3">
                  {selectedJournal.map((e) => (
                    <div key={e.id} className="rounded-2xl border border-ink/8 bg-white/40 p-3.5">
                      <div className="mb-1 flex items-center justify-between text-xs text-muted">
                        <span>
                          {e.mood ? FACES[e.mood - 1] : ''}{' '}
                          {new Date(e.date).toLocaleTimeString(localeTag, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <SpeakButton id={`insights-journal-${e.id}`} text={e.text} className="h-6 w-6" />
                      </div>
                      <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{e.text}</p>
                      {e.reflection && (
                        <div className="mt-2 rounded-xl border border-sage/20 bg-sage/10 p-3">
                          <div className="mb-1 flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-xs font-medium text-sagedeep">
                              <Sparkles size={12} /> {t('journal.reflects')}
                            </span>
                            <SpeakButton id={`insights-reflection-${e.id}`} text={e.reflection} className="h-6 w-6" />
                          </div>
                          <p className="text-sm leading-relaxed text-ink/85">{e.reflection}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
