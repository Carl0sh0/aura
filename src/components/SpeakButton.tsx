import { Volume2, Square } from 'lucide-react'
import { useSpeaker } from '../lib/tts'
import { useSettings, useActiveVoiceHint } from '../lib/settings'
import { useLang } from '../lib/i18n'

// A "read aloud" toggle for a chunk of text. Hidden if TTS is unsupported or
// switched off in Settings. Shows a stop icon while it's the one speaking.
// Speech language follows the app's selected language unless overridden.
export default function SpeakButton({
  id,
  text,
  lang,
  className = '',
}: {
  id: string
  text: string
  lang?: string
  className?: string
}) {
  const { supported, activeId, speak, stop } = useSpeaker()
  const [settings] = useSettings()
  const voiceHint = useActiveVoiceHint()
  const { t, localeTag } = useLang()
  if (!supported || !settings.readAloud || !text.trim()) return null

  const active = activeId === id
  const label = active ? t('speak.stop') : t('speak.read')
  return (
    <button
      type="button"
      onClick={() => (active ? stop() : speak(id, text, lang || localeTag, voiceHint))}
      aria-label={label}
      title={label}
      className={`inline-grid place-items-center rounded-full transition ${
        active ? 'text-clay' : 'text-muted hover:text-sagedeep'
      } ${className}`}
    >
      {active ? <Square size={13} fill="currentColor" /> : <Volume2 size={15} />}
    </button>
  )
}
