// =====================================================================
// Text-to-speech — Aura can read its replies and reflections aloud, using the
// browser's built-in SpeechSynthesis (on-device, free). A single shared
// speaker lives in context so only one thing speaks at a time and every
// button knows whether *it* is the one currently talking.
// =====================================================================
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { VoiceHint } from './characterPacks'

type SpeakerContextValue = {
  supported: boolean
  activeId: string | null
  speak: (id: string, text: string, lang?: string, hint?: VoiceHint) => void
  stop: () => void
}

const SpeakerContext = createContext<SpeakerContextValue>({
  supported: false,
  activeId: null,
  speak: () => {},
  stop: () => {},
})

export function SpeakerProvider({ children }: { children: ReactNode }) {
  const supported =
    typeof window !== 'undefined' && 'speechSynthesis' in window
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel()
    }
  }, [supported])

  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel()
    activeRef.current = null
    setActiveId(null)
  }, [supported])

  const speak = useCallback(
    (id: string, text: string, lang?: string, hint?: VoiceHint) => {
      if (!supported || !text.trim()) return
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = lang || navigator.language || 'en-US'
      u.rate = hint?.rate ?? 0.98
      u.pitch = hint?.pitch ?? 1
      // Prefer a voice that matches the language, if the browser has one loaded.
      // If the active companion pack has a name preference, try that first (best-effort —
      // not every OS/browser exposes named voices), then fall back to any language match.
      const voices = window.speechSynthesis.getVoices()
      const base = u.lang.slice(0, 2).toLowerCase()
      const byLang = voices.filter((v) => v.lang?.toLowerCase().startsWith(base))
      const match =
        (hint?.preferNames?.length &&
          byLang.find((v) => hint.preferNames.some((n) => v.name.toLowerCase().includes(n.toLowerCase())))) ||
        byLang[0]
      if (match) u.voice = match
      const done = () => {
        if (activeRef.current === id) {
          activeRef.current = null
          setActiveId(null)
        }
      }
      u.onend = done
      u.onerror = done
      activeRef.current = id
      setActiveId(id)
      window.speechSynthesis.speak(u)
    },
    [supported],
  )

  return (
    <SpeakerContext.Provider value={{ supported, activeId, speak, stop }}>
      {children}
    </SpeakerContext.Provider>
  )
}

export function useSpeaker() {
  return useContext(SpeakerContext)
}
