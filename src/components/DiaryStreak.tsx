import { useState } from 'react'
import { Flame, Pencil, Sparkles } from 'lucide-react'
import { useDiary } from '../lib/store'
import { appendSpeech } from '../lib/speech'
import { useLang } from '../lib/i18n'
import MicButton from './MicButton'
import SpeakButton from './SpeakButton'

// A one-line "how was your day" prompt that builds a streak the longer you
// keep it up — the small, satisfying habit loop that ties the whole app
// together day to day.
function last7(entries: { date: string }[], localeTag: string) {
  const days = new Set(entries.map((e) => e.date))
  const out: { day: string; has: boolean; isToday: boolean }[] = []
  const cursor = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(cursor)
    d.setDate(cursor.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    out.push({
      day: d.toLocaleDateString(localeTag, { weekday: 'narrow' }),
      has: days.has(iso),
      isToday: i === 0,
    })
  }
  return out
}

export default function DiaryStreak() {
  const { entries, todayEntry, saveToday, streak } = useDiary()
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(false)
  const { t, localeTag } = useLang()

  const PROMPTS = [
    t('diary.prompt.1'),
    t('diary.prompt.2'),
    t('diary.prompt.3'),
    t('diary.prompt.4'),
  ]
  const [prompt] = useState(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)])

  const showForm = !todayEntry || editing

  function save() {
    if (!draft.trim()) return
    saveToday(draft.trim())
    setDraft('')
    setEditing(false)
  }

  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="flex items-center gap-2 font-display text-xl text-sagedeep">
          <Sparkles size={18} /> {t('diary.title')}
        </p>
        <div
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${
            streak > 0 ? 'bg-clay/15 text-clay' : 'bg-ink/5 text-muted'
          }`}
        >
          <Flame size={15} fill={streak > 0 ? 'currentColor' : 'none'} />
          {streak}
        </div>
      </div>

      {showForm ? (
        <>
          <p className="mb-2 text-sm text-ink/80">{prompt}</p>
          <div className="relative">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              placeholder={t('diary.placeholder')}
              className="w-full rounded-2xl border border-ink/10 bg-white/60 px-4 py-3 pr-14 text-sm text-ink outline-none transition focus:border-sage/50"
            />
            <MicButton
              onFinal={(txt) => setDraft((p) => appendSpeech(p, txt))}
              className="absolute right-2 top-1/2 h-9 w-9 -translate-y-1/2"
            />
          </div>
          <div className="mt-3 flex gap-2">
            {editing && (
              <button
                onClick={() => {
                  setEditing(false)
                  setDraft('')
                }}
                className="rounded-full border border-ink/10 px-4 py-2 text-sm text-muted transition hover:bg-white/60"
              >
                {t('diary.cancel')}
              </button>
            )}
            <button
              onClick={save}
              disabled={!draft.trim()}
              className="flex-1 rounded-full bg-clay py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
            >
              {streak > 0 && !todayEntry ? t('diary.keepStreak', { n: streak }) : t('diary.save')}
            </button>
          </div>
        </>
      ) : (
        <div className="animate-rise rounded-2xl border border-sage/20 bg-sage/10 p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="flex-1 text-[15px] leading-relaxed text-ink/85">
              {todayEntry!.text}
            </p>
            <div className="flex shrink-0 items-center gap-1">
              <SpeakButton id="diary-today" text={todayEntry!.text} className="h-7 w-7" />
              <button
                onClick={() => {
                  setDraft(todayEntry!.text)
                  setEditing(true)
                }}
                className="grid h-7 w-7 place-items-center rounded-full text-muted transition hover:text-sagedeep"
                aria-label="Edit today's entry"
              >
                <Pencil size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {entries.length > 0 && (
        <div className="mt-5 flex items-center justify-between border-t border-ink/8 pt-4">
          {last7(entries, localeTag).map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div
                className={`h-6 w-6 rounded-full border transition ${
                  d.has
                    ? 'border-clay bg-clay'
                    : d.isToday
                      ? 'border-dashed border-clay/50'
                      : 'border-ink/10'
                }`}
              />
              <span className="text-[10px] text-muted">{d.day}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
