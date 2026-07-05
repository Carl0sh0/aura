import { useEffect, useRef, useState } from 'react'
import { Send, Loader2, Square, RefreshCw, Trash2, ArrowDown } from 'lucide-react'
import { streamChat, stopGenerating } from '../lib/api'
import { appendSpeech } from '../lib/speech'
import { useSpeaker } from '../lib/tts'
import { useSettings, useActivePack, useActiveVoiceHint, useModelIdForPack } from '../lib/settings'
import { useLocalEngineState } from '../lib/localEngine'
import { useLang } from '../lib/i18n'
import { playReplyChime } from '../lib/chime'
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

// Simple custom markdown renderer for bold text and list styling
function renderMarkdown(text: string) {
  if (!text) return ''
  const paras = text.split(/\n\n+/)
  return paras.map((para, pIdx) => {
    const trimmed = para.trim()
    if (!trimmed) return null

    // Bullet list
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const items = trimmed.split(/\n[-*]\s+/).map((item, itemIdx) => {
        const cleaned = itemIdx === 0 ? item.replace(/^[-*]\s+/, '') : item
        return (
          <li key={itemIdx} className="leading-relaxed">
            {parseInlineMarkdown(cleaned)}
          </li>
        )
      })
      return (
        <ul key={pIdx} className="list-disc pl-5 my-2 space-y-1 text-[15px]">
          {items}
        </ul>
      )
    }

    // Numbered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items = trimmed.split(/\n\d+\.\s+/).map((item, itemIdx) => {
        const cleaned = itemIdx === 0 ? item.replace(/^\d+\.\s+/, '') : item
        return (
          <li key={itemIdx} className="leading-relaxed">
            {parseInlineMarkdown(cleaned)}
          </li>
        )
      })
      return (
        <ol key={pIdx} className="list-decimal pl-5 my-2 space-y-1 text-[15px]">
          {items}
        </ol>
      )
    }

    // Normal paragraph
    return (
      <p key={pIdx} className="mb-2 last:mb-0">
        {parseInlineMarkdown(trimmed)}
      </p>
    )
  })
}

function parseInlineMarkdown(text: string) {
  const tokens = text.split(/(\*\*.*?\*\*|\*.*?\*)/g)
  return tokens.map((tok, idx) => {
    if (tok.startsWith('**') && tok.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-ink dark:text-white">
          {tok.slice(2, -2)}
        </strong>
      )
    }
    if (tok.startsWith('*') && tok.endsWith('*')) {
      return (
        <em key={idx} className="italic text-ink/90 dark:text-white/90">
          {tok.slice(1, -1)}
        </em>
      )
    }
    return tok
  })
}

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
  const activeModelId = useModelIdForPack(pack.id)
  const engineState = useLocalEngineState(activeModelId)
  const voiceHint = useActiveVoiceHint()
  const speaker = useSpeaker()
  const { t, lang } = useLang()
  const scrollRef = useRef<HTMLDivElement>(null)
  const stoppedRef = useRef(false)

  // Auto-scroll states
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [hasNewTokens, setHasNewTokens] = useState(false)
  const isAtBottomRef = useRef(true)

  const STARTERS = [
    t('chat.starter.1'),
    t('chat.starter.2'),
    t('chat.starter.3'),
    t('chat.starter.4'),
  ]

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const threshold = 100
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold
    isAtBottomRef.current = atBottom
    
    if (atBottom) {
      setShowScrollBtn(false)
      setHasNewTokens(false)
    } else {
      setShowScrollBtn(true)
    }
  }

  const scrollToBottom = (smooth = false) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      })
    }
  }

  // Scroll to bottom when messages list updates (but only if user is at the bottom)
  useEffect(() => {
    if (isAtBottomRef.current) {
      scrollToBottom(false) // Instant scroll for snappier streaming flow
    } else if (busy) {
      setHasNewTokens(true) // User scrolled up during streaming: notify them of new tokens
    }
  }, [messages, busy])

  async function generate(next: ChatMessage[]) {
    setMessages([...next, { role: 'assistant', content: '' }])
    setBusy(true)
    stoppedRef.current = false
    isAtBottomRef.current = true // Force scroll to bottom when starting a reply
    scrollToBottom(true)
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
      playReplyChime()
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

  async function send(text: string) {
    const content = text.trim()
    if (!content || busy) return
    setInput('')
    await generate([...messages, { role: 'user', content }])
  }

  async function regenerate() {
    if (busy || messages.length === 0) return
    const last = messages[messages.length - 1]
    if (last.role !== 'assistant') return
    const withoutLastReply = messages.slice(0, -1)
    if (withoutLastReply.length === 0 || withoutLastReply[withoutLastReply.length - 1].role !== 'user') {
      return
    }
    await generate(withoutLastReply)
  }

  function stop() {
    stoppedRef.current = true
    stopGenerating(pack).catch(() => {})
  }

  function clearHistory() {
    if (confirm(t('chat.clear.confirm') || 'Are you sure you want to clear your conversation history? This cannot be undone.')) {
      setMessages([])
      setHasNewTokens(false)
      setShowScrollBtn(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-ink">{t('chat.title')}</h1>
          <p className="text-sm text-muted">{t('chat.subtitle')}</p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearHistory}
            className="flex items-center gap-1.5 rounded-full border border-ink/10 bg-white/50 dark:bg-sand/30 px-3.5 py-1.5 text-xs font-medium text-muted transition hover:border-clay/40 hover:text-clay dark:border-white/10 dark:hover:text-clay"
          >
            <Trash2 size={13} /> {t('chat.clear') || 'Clear Chat'}
          </button>
        )}
      </header>

      {crisis && (
        <div className="mb-4">
          <CrisisBanner onClose={() => setCrisis(false)} />
        </div>
      )}

      <div className="relative flex-1 min-h-0 flex flex-col">
        <div 
          ref={scrollRef} 
          onScroll={handleScroll}
          className="card flex-1 overflow-y-auto p-4 sm:p-6"
        >
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
                      className="rounded-full border border-ink/10 bg-white/60 dark:bg-sand/20 px-3 py-1.5 text-sm text-ink/70 transition hover:border-sage/40 hover:text-ink"
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
                    className={`max-w-[80%] rounded-3xl px-4 py-3 text-[15px] leading-relaxed ${
                      m.role === 'user'
                        ? 'rounded-br-lg bg-sage text-white shadow-sm shadow-sage/10'
                        : 'rounded-bl-lg bg-white/80 dark:bg-sand/40 text-ink border border-ink/5 dark:border-white/10 shadow-sm'
                    }`}
                  >
                    {m.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    ) : (
                      m.content ? (
                        <div className="space-y-2">{renderMarkdown(m.content)}</div>
                      ) : (
                        busy && i === messages.length - 1 ? (
                          engineState.status === 'loading' ? (
                            <div className="w-40">
                              <div className="mb-1.5 flex items-center gap-2 text-xs text-ink/70">
                                <Loader2 className="animate-spin text-sage" size={14} />
                                {t('chat.downloadingModel', { pack: t(pack.nameKey) })}
                              </div>
                              <div className="h-1.5 overflow-hidden rounded-full bg-ink/10">
                                <div
                                  className="h-full rounded-full bg-sage transition-all"
                                  style={{ width: `${Math.round(engineState.progress * 100)}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <Loader2 className="animate-spin text-sage" size={18} />
                          )
                        ) : (
                          ''
                        )
                      )
                    )}
                  </div>
                  {m.role === 'assistant' && m.content && (
                    <div className="mt-1 flex items-center gap-1 animate-rise">
                      <SpeakButton id={`chat-${i}`} text={m.content} className="h-7 w-7" />
                      {!busy && i === messages.length - 1 && (
                        <button
                          type="button"
                          onClick={regenerate}
                          aria-label={t('chat.regenerate')}
                          title={t('chat.regenerate')}
                          className="inline-grid h-7 w-7 place-items-center rounded-full text-muted transition hover:text-sagedeep"
                        >
                          <RefreshCw size={13} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Floating scroll to bottom button */}
        {showScrollBtn && (
          <button
            type="button"
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-4 right-6 flex h-10 items-center gap-1.5 rounded-full bg-clay px-4 text-xs font-semibold text-white shadow-lg shadow-clay/20 transition hover:scale-105 active:scale-95 animate-rise z-10"
            aria-label="Scroll to bottom"
          >
            <ArrowDown size={14} />
            {t('chat.scrollBottom') || 'Scroll down'}
            {hasNewTokens && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
            )}
          </button>
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
          className="max-h-40 min-h-[52px] flex-1 resize-none rounded-2xl border border-ink/10 bg-white/70 dark:bg-sand/30 px-4 py-3.5 text-[15px] text-ink outline-none transition focus:border-sage/50"
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
