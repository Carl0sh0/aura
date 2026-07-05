import { Mic, Square } from 'lucide-react'
import { useDictation } from '../lib/speech'
import { useSettings } from '../lib/settings'
import { useLang } from '../lib/i18n'

// A self-contained voice-input button. Renders nothing if the browser can't
// do speech recognition, so it degrades gracefully. Shows a live transcript
// bubble and a soft pulse while listening. Recognition language follows the
// app's selected language (region-aware) unless a specific `lang` is passed.
export default function MicButton({
  onFinal,
  lang,
  className = '',
}: {
  onFinal: (text: string) => void
  lang?: string
  className?: string
}) {
  const [settings] = useSettings()
  const { t, localeTag } = useLang()
  const { supported, listening, interim, toggle } = useDictation(onFinal, lang || localeTag)
  if (!supported || !settings.voiceInput) return null

  const label = listening ? t('mic.stop') : t('mic.speak')
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        title={label}
        className={`grid place-items-center rounded-2xl border transition ${
          listening
            ? 'border-clay/40 bg-clay/10 text-clay'
            : 'border-ink/10 bg-white/70 text-muted hover:text-ink'
        } ${className}`}
      >
        {listening ? <Square size={17} fill="currentColor" /> : <Mic size={18} />}
      </button>
      {listening && (
        <span className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-clay/25 animate-ping" />
      )}
      {listening && interim && (
        <span className="pointer-events-none absolute bottom-full right-0 mb-2 max-w-[240px] truncate rounded-full bg-ink/85 px-3 py-1.5 text-xs text-white shadow-lg">
          {interim}
        </span>
      )}
    </span>
  )
}
