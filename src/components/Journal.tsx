import { useState } from 'react'
import { Feather, Loader2, Sparkles, Trash2 } from 'lucide-react'
import { reflect } from '../lib/api'
import { appendSpeech } from '../lib/speech'
import { useJournal } from '../lib/store'
import { useLang } from '../lib/i18n'
import { useActivePack } from '../lib/settings'
import CrisisBanner from './CrisisBanner'
import MicButton from './MicButton'
import SpeakButton from './SpeakButton'

const MOODS = ['😔', '😕', '😐', '🙂', '😊']

export default function Journal() {
  const { entries, add, update, remove } = useJournal()
  const [text, setText] = useState('')
  const [mood, setMood] = useState(3)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [crisis, setCrisis] = useState(false)
  const { t, lang, localeTag } = useLang()
  const pack = useActivePack()

  const PROMPTS = [
    t('journal.prompt.1'),
    t('journal.prompt.2'),
    t('journal.prompt.3'),
    t('journal.prompt.4'),
  ]
  const [prompt] = useState(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)])

  async function save() {
    if (!text.trim()) return
    const entry = add({ text: text.trim(), mood })
    setText('')
    setBusyId(entry.id)
    try {
      const { reflection, crisis: c } = await reflect(entry.text, entry.mood, lang, pack)
      update(entry.id, { reflection })
      if (c) setCrisis(true)
    } catch {
      /* leave without a reflection */
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-4">
        <h1 className="font-display text-3xl text-ink">{t('journal.title')}</h1>
        <p className="text-sm text-muted">{t('journal.subtitle')}</p>
      </header>

      {crisis && (
        <div className="mb-4">
          <CrisisBanner onClose={() => setCrisis(false)} />
        </div>
      )}

      <div className="card p-5 sm:p-6">
        <p className="mb-3 flex items-center gap-2 font-display text-lg text-sagedeep">
          <Feather size={18} /> {prompt}
        </p>
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder={t('journal.placeholder')}
            className="w-full resize-none rounded-2xl border border-ink/10 bg-white/60 p-4 pr-16 text-[15px] leading-relaxed text-ink outline-none transition focus:border-sage/50"
          />
          <MicButton
            onFinal={(txt) => setText((p) => appendSpeech(p, txt))}
            className="absolute bottom-3 right-3 h-10 w-10"
          />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {MOODS.map((m, i) => (
              <button
                key={i}
                onClick={() => setMood(i + 1)}
                className={`grid h-9 w-9 place-items-center rounded-full text-lg transition ${
                  mood === i + 1 ? 'bg-sage/25 scale-110' : 'hover:bg-white/70'
                }`}
                aria-label={`Mood ${i + 1}`}
              >
                {m}
              </button>
            ))}
          </div>
          <button
            onClick={save}
            disabled={!text.trim()}
            className="rounded-full bg-clay px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
          >
            {t('journal.save')}
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {entries.map((e) => (
          <div key={e.id} className="card animate-rise p-5">
            <div className="mb-2 flex items-center justify-between text-xs text-muted">
              <span>
                {MOODS[(e.mood || 3) - 1]}{' '}
                {new Date(e.date).toLocaleDateString(localeTag, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <button
                onClick={() => remove(e.id)}
                className="text-ink/25 transition hover:text-clay"
                aria-label="Delete entry"
              >
                <Trash2 size={15} />
              </button>
            </div>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
              {e.text}
            </p>
            {busyId === e.id ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-sage">
                <Loader2 className="animate-spin" size={15} /> {t('journal.reflecting')}
              </p>
            ) : (
              e.reflection && (
                <div className="mt-3 rounded-2xl border border-sage/20 bg-sage/10 p-3.5">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-sagedeep">
                      <Sparkles size={13} /> {t('journal.reflects')}
                    </span>
                    <SpeakButton id={`journal-${e.id}`} text={e.reflection} className="h-6 w-6" />
                  </div>
                  <p className="text-sm leading-relaxed text-ink/85">{e.reflection}</p>
                </div>
              )
            )}
          </div>
        ))}
        {entries.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">{t('journal.empty')}</p>
        )}
      </div>
    </div>
  )
}
