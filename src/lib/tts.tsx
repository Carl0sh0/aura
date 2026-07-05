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

      // If the target language is English ('en'), we prioritize British ('en-gb') voices
      // to give that calm, therapeutic British accent the user requested.
      const isEnglish = base === 'en'
      let byLang = voices.filter((v) => {
        const vl = v.lang.toLowerCase()
        return isEnglish ? vl.startsWith('en-gb') : vl.startsWith(base)
      })

      // Fall back to general English ('en') if no en-GB voice is available
      if (isEnglish && byLang.length === 0) {
        byLang = voices.filter((v) => v.lang.toLowerCase().startsWith('en'))
      }

      // If no language-matched voice at all, default to any available voice
      if (byLang.length === 0) {
        byLang = voices
      }

      // Score and rank voices to pick the absolute highest quality one
      let bestVoice = byLang[0]
      let maxScore = -9999

      for (const v of byLang) {
        let score = 0
        const nameLower = v.name.toLowerCase()

        // 1. High-Quality/Neural voice boost
        if (
          nameLower.includes('natural') ||
          nameLower.includes('neural') ||
          nameLower.includes('online') ||
          nameLower.includes('google') ||
          nameLower.includes('enhanced') ||
          nameLower.includes('siri') ||
          nameLower.includes('premium')
        ) {
          score += 100
        }

        // 2. Legacy robotic voice penalty
        if (
          nameLower.includes('zira') ||
          nameLower.includes('david') ||
          nameLower.includes('desktop') ||
          nameLower.includes('karen') ||
          nameLower.includes('hazel') ||
          nameLower.includes('harrier') ||
          nameLower.includes('heera')
        ) {
          score -= 50
        }

        // 3. Companion hint preference match (specific names / gender hints)
        if (hint?.preferNames?.length) {
          const matchCount = hint.preferNames.filter((n) =>
            nameLower.includes(n.toLowerCase())
          ).length
          score += matchCount * 20
        }

        if (score > maxScore) {
          maxScore = score
          bestVoice = v
        }
      }

      if (bestVoice) u.voice = bestVoice
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
