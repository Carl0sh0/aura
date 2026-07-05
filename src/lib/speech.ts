// =====================================================================
// Speech-to-text (voice input) via the browser's built-in Web Speech API.
// Runs entirely on-device — nothing is sent anywhere. Recognition language
// follows the user's locale by default, so it "just works" per country.
// Supported in Chrome, Edge, and most Chromium browsers.
// =====================================================================
import { useCallback, useEffect, useRef, useState } from 'react'

// Minimal typings — the Web Speech API isn't in the default DOM lib.
type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((e: any) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
}

export function speechSupported() {
  return (
    typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  )
}

// Append a freshly transcribed chunk to existing text with tidy spacing.
export function appendSpeech(prev: string, chunk: string) {
  const base = prev.trimEnd()
  return (base ? base + ' ' : '') + chunk.trim() + ' '
}

/**
 * Voice dictation hook. Calls `onFinal` with each finalized phrase; exposes
 * live `interim` text and a `toggle` to start/stop listening.
 */
export function useDictation(onFinal: (text: string) => void, lang?: string) {
  const [supported] = useState(speechSupported)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const onFinalRef = useRef(onFinal)
  onFinalRef.current = onFinal

  useEffect(() => {
    if (!supported) return
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Ctor) return
    const rec = new Ctor()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = lang || navigator.language || 'en-US'
    rec.onresult = (e: any) => {
      let live = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i]
        if (result.isFinal) {
          const text = result[0].transcript.trim()
          if (text) onFinalRef.current(text)
        } else {
          live += result[0].transcript
        }
      }
      setInterim(live)
    }
    rec.onerror = () => {
      setListening(false)
      setInterim('')
    }
    rec.onend = () => {
      setListening(false)
      setInterim('')
    }
    recRef.current = rec
    return () => {
      try {
        rec.stop()
      } catch {
        /* already stopped */
      }
      recRef.current = null
    }
  }, [supported, lang])

  const start = useCallback(() => {
    if (!recRef.current || listening) return
    try {
      recRef.current.start()
      setListening(true)
    } catch {
      /* start() throws if already running — ignore */
    }
  }, [listening])

  const stop = useCallback(() => {
    try {
      recRef.current?.stop()
    } catch {
      /* ignore */
    }
    setListening(false)
    setInterim('')
  }, [])

  const toggle = useCallback(() => {
    if (listening) stop()
    else start()
  }, [listening, start, stop])

  return { supported, listening, interim, start, stop, toggle }
}
