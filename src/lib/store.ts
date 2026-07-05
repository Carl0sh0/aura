// =====================================================================
// Local, private data store. Everything here lives in the browser's
// localStorage — moods, journal entries, and routines never leave the
// device. This is the app's privacy backbone.
// Because it's plain modules + a hook, the same logic can be reused by a
// future React Native / mobile app with a different storage adapter.
// =====================================================================
import { useCallback, useEffect, useState } from 'react'

export type Mood = {
  id: string
  date: string // ISO
  score: number // 1..5
  note?: string
}

export type JournalEntry = {
  id: string
  date: string
  text: string
  mood?: number
  reflection?: string
}

export type Habit = {
  title: string
  why: string
  minutes: number
  icon: string
}

export type Routine = {
  date: string // yyyy-mm-dd
  intro: string
  habits: Habit[]
  done: Record<number, boolean>
}

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

// One short "how was my day" note per calendar day — the diary streak.
export type DiaryEntry = { date: string; text: string } // date = yyyy-mm-dd

const KEYS = {
  moods: 'aura.moods',
  journal: 'aura.journal',
  routine: 'aura.routine',
  chat: 'aura.chat',
  name: 'aura.name',
  diary: 'aura.diary',
} as const

export function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10)
}

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// A tiny persistent-state hook.
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* storage full or blocked — non-fatal */
    }
  }, [key, value])
  return [value, setValue] as const
}

export function useMoods() {
  const [moods, setMoods] = usePersistentState<Mood[]>(KEYS.moods, [])
  const add = useCallback(
    (score: number, note?: string) => {
      setMoods((prev) => [
        { id: uid(), date: new Date().toISOString(), score, note },
        ...prev,
      ].slice(0, 400))
    },
    [setMoods],
  )
  return { moods, add }
}

export function useJournal() {
  const [entries, setEntries] = usePersistentState<JournalEntry[]>(KEYS.journal, [])
  const add = useCallback(
    (e: Omit<JournalEntry, 'id' | 'date'>) => {
      const entry: JournalEntry = { id: uid(), date: new Date().toISOString(), ...e }
      setEntries((prev) => [entry, ...prev])
      return entry
    },
    [setEntries],
  )
  const update = useCallback(
    (id: string, patch: Partial<JournalEntry>) =>
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e))),
    [setEntries],
  )
  const remove = useCallback(
    (id: string) => setEntries((prev) => prev.filter((e) => e.id !== id)),
    [setEntries],
  )
  return { entries, add, update, remove }
}

export function useRoutine() {
  return usePersistentState<Routine | null>(KEYS.routine, null)
}

export function useChat() {
  return usePersistentState<ChatMessage[]>(KEYS.chat, [])
}

export function useName() {
  return usePersistentState<string>(KEYS.name, '')
}

// ---- Daily diary + streak ------------------------------------------------
function isoDay(d: Date) {
  return d.toISOString().slice(0, 10)
}

// Consecutive days ending today (with a one-day grace: today not-yet-written
// doesn't break yesterday's streak). Standard habit-tracker behavior.
export function computeStreak(entries: DiaryEntry[]) {
  const days = new Set(entries.map((e) => e.date))
  const cursor = new Date()
  if (!days.has(isoDay(cursor))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (days.has(isoDay(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function useDiary() {
  const [entries, setEntries] = usePersistentState<DiaryEntry[]>(KEYS.diary, [])
  const today = todayKey()
  const todayEntry = entries.find((e) => e.date === today)
  const saveToday = useCallback(
    (text: string) => {
      setEntries((prev) => {
        const rest = prev.filter((e) => e.date !== today)
        return [{ date: today, text }, ...rest].sort((a, b) => (a.date < b.date ? 1 : -1))
      })
    },
    [setEntries, today],
  )
  return { entries, todayEntry, saveToday, streak: computeStreak(entries) }
}

// Build a small, privacy-respecting context string to give the AI a sense of
// recent state. The user opts into this simply by using the app; it only ever
// includes brief, recent signals — never the full history.
export function buildContext(moods: Mood[], journal: JournalEntry[], name: string) {
  const parts: string[] = []
  if (name) parts.push(`Their name is ${name}.`)
  if (moods[0]) {
    const labels = ['', 'very low', 'low', 'okay', 'good', 'great']
    parts.push(`Most recent mood check-in: ${labels[moods[0].score] || moods[0].score}/5.`)
  }
  const recent = journal[0]
  if (recent) {
    parts.push(`Their latest journal note (excerpt): "${recent.text.slice(0, 240)}".`)
  }
  return parts.join(' ')
}
