import { useEffect, useRef, useState } from 'react'
import { Send, Loader2, Square } from 'lucide-react'
import { streamChat, stopGenerating } from '../lib/api'
import { appendSpeech } from '../lib/speech'
import { useSpeaker } from '../lib/tts'
import { useSettings, useActivePack, useActiveVoiceHint } from '../lib/settings'
import { useLang } from '../lib/i18n'
import MicButton from './MicButton'
import SpeakButton from './SpeakButton'
import {
  buildContext,
  useChat,
  useJournal,
  useMoods,
  useName,
  type ChatMessage,
} from '../lib/store'
import CrisisBanner from './CrisisBanner'

export default function Chat() {
  const [messages, setMessages] = useChat()
  const { moods } = useMoods()
  const { entries } = useJournal()
  const [name] = useName()
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [crisis, setCrisis] = useState(false)
  const [settings] = useSettings()
  const pack = useActivePack()
  const voiceHint = useActiveVoiceHint()
  const speaker = useSpeaker()
  const { t, lang } = useLang()
  const scrollRef = useRef<HTMLDivElement>(null)
  const stoppedRef = useRef(false)

  const STARTERS = [
    t('chat.starter.1'),
    t('chat.starter.2'),
    t('chat.starter.3'),
    t('chat.starter.4'),
  ]

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  async function send(text: string) {
    const content = text.trim()
    if (!content || busy) return
    setInput('')
    const next: ChatMessage[] = [...messages, { role: 'user', content }]
    setMessages([...next, { role: 'assistant', content: '' }])
    setBusy(true)
    stoppedRef.current = false
    let full = ''
    try {
      const context = buildContext(moods, entries, name)
      const { crisis: c } = await streamChat(
        next,
        context,
        (tok) => {
          full += tok
          setMessages((prev) => {
            const copy = [...prev]
            copy[copy.length - 1] = {
              role: 'assistant',
              content: copy[copy.length - 1].content + tok,
            }
            return copy
          })
        },
        { lang, pack },
      )
      if (c) setCrisis(true)
      // Optionally read the reply aloud as soon as it lands.
      if (settings.readAloud && settings.autoRead && full.trim()) {
        speaker.speak('chat-latest', full, undefined, voiceHint)
      }
    } catch {
      // A deliberate stop keeps whatever partial reply already streamed in rather
      // than overwriting it with an error message.
      if (!stoppedRef.current) {
        setMessages((prev) => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: 'assistant', content: t('chat.error') }
          return copy
        })
      }
    } finally {
      setBusy(false)
    }
  }

  function stop() {
    stoppedRef.current = true
    stopGenerating(pack).catch(() => {})
  }

  return (
    <div className="flex h-full flex-col">
      <header className="mb-4">
        <h1 className="font-display text-3xl text-ink">{t('chat.title')}</h1>
        <p className="text-sm text-muted">{t('chat.subtitle')}</p>
      </header>

      {crisis && (
        <div className="mb-4">
          <CrisisBanner onClose={() => setCrisis(false)} />
        </div>
      )}

      <div ref={scrollRef} className="card flex-1 overflow-y-auto p-4 sm:p-6">
        {messages.length === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <div className="max-w-sm">
              <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-sage/25 text-3xl animate-breathe">
                {pack.glyph}
              </div>
              <p className="font-display text-xl text-ink">{t('chat.empty.title')}</p>
              <p className="mt-1 text-sm text-muted">{t('chat.empty.sub')}</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-ink/10 bg-white/60 px-3 py-1.5 text-sm text-ink/70 transition hover:border-sage/40 hover:text-ink"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-3xl px-4 py-3 text-[15px] leading-relaxed ${
                    m.role === 'user'
                      ? 'rounded-br-lg bg-sage text-white'
                      : 'rounded-bl-lg bg-white/80 text-ink border border-ink/5'
                  }`}
                >
                  {m.content || (busy && i === messages.length - 1 ? (
                    <Loader2 className="animate-spin text-sage" size={18} />
                  ) : '')}
                </div>
                {m.role === 'assistant' && m.content && (
                  <SpeakButton
                    id={`chat-${i}`}
                    text={m.content}
                    className="mt-1 h-7 w-7"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
        className="mt-4 flex items-end gap-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send(input)
            }
          }}
          rows={1}
          placeholder={t('chat.placeholder')}
          className="max-h-40 min-h-[52px] flex-1 resize-none rounded-2xl border border-ink/10 bg-white/70 px-4 py-3.5 text-[15px] text-ink outline-none transition focus:border-sage/50"
        />
        <MicButton
          onFinal={(t) => setInput((p) => appendSpeech(p, t))}
          className="h-[52px] w-[52px]"
        />
        <button
          type={busy ? 'button' : 'submit'}
          onClick={busy ? stop : undefined}
          disabled={!busy && !input.trim()}
          className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-2xl bg-clay text-white transition hover:opacity-90 disabled:opacity-40"
          aria-label={busy ? t('chat.stop') : 'Send'}
        >
          {busy ? <Square size={16} fill="currentColor" /> : <Send size={20} />}
        </button>
      </form>
      <p className="mt-2 text-center text-xs text-muted">{t('chat.disclaimer')}</p>
    </div>
  )
}
