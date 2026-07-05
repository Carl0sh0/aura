// User-controllable feature switches, persisted locally. Read across the app so
// people can turn things on/off from the Settings tab.
import { useCallback } from 'react'
import { usePersistentState } from './store'
import { CHARACTER_PACKS, DEFAULT_PACK_ID, type PackId, type VoiceHint } from './characterPacks'

export type Settings = {
  voiceInput: boolean // show the microphone (speech-to-text)
  readAloud: boolean // show "read aloud" buttons (text-to-speech)
  autoRead: boolean // automatically speak Aura's chat replies
  reduceMotion: boolean // calm the animations
  activePackId: PackId // which on-device companion persona/pack is active
  hasChosenCompanion: boolean // whether the user has been through the companion picker
  modelOverrides: Record<PackId, string> // override models for packs
  theme: 'light' | 'dark' | 'system' // theme selection
  soundEffects: boolean // play satisfying meditative chimes
}

export const DEFAULT_SETTINGS: Settings = {
  voiceInput: true,
  readAloud: true,
  autoRead: false,
  reduceMotion: false,
  activePackId: DEFAULT_PACK_ID,
  hasChosenCompanion: false,
  modelOverrides: {
    calm: 'Qwen3.5-2B-q4f16_1-MLC',
    grounded: 'Qwen3.5-4B-q4f16_1-MLC',
    reflective: 'Ministral-3-3B-Instruct-2512-BF16-q4f16_1-MLC',
  },
  theme: 'system',
  soundEffects: true,
}

// Merges with defaults so a settings object saved before a new field existed
// (e.g. an earlier version of the app) still comes back fully populated.
export function useSettings() {
  const [raw, setRaw] = usePersistentState<Partial<Settings>>('aura.settings', DEFAULT_SETTINGS)
  const settings: Settings = { ...DEFAULT_SETTINGS, ...raw }
  const setSettings = useCallback(
    (update: Settings | ((prev: Settings) => Settings)) => {
      setRaw((prev) => {
        const merged = { ...DEFAULT_SETTINGS, ...prev }
        return typeof update === 'function' ? update(merged) : update
      })
    },
    [setRaw],
  )
  return [settings, setSettings] as const
}

/** Resolves the currently active companion pack, falling back to the default if unset/unknown. */
export function useActivePack() {
  const [settings] = useSettings()
  return CHARACTER_PACKS[settings.activePackId] ?? CHARACTER_PACKS[DEFAULT_PACK_ID]
}

/** Resolves the model ID for a given pack, including user overrides. Suitable for non-hook environments. */
export function getModelIdForPack(packId: PackId): string {
  try {
    const raw = localStorage.getItem('aura.settings')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.modelOverrides?.[packId]) {
        return parsed.modelOverrides[packId]
      }
    }
  } catch {
    // fallback
  }
  return CHARACTER_PACKS[packId]?.localModelId ?? CHARACTER_PACKS[DEFAULT_PACK_ID].localModelId
}

/** React hook: resolves the model ID for a given pack, including user overrides. */
export function useModelIdForPack(packId: PackId): string {
  const [settings] = useSettings()
  return settings.modelOverrides?.[packId] || CHARACTER_PACKS[packId]?.localModelId || CHARACTER_PACKS[DEFAULT_PACK_ID].localModelId
}

/** The active pack's text-to-speech voice hint (pitch/rate/preferred voice names). */
export function useActiveVoiceHint(): VoiceHint {
  return useActivePack().ttsVoiceHint
}

// Everything Aura stores, as one portable JSON download. The complement of the
// privacy promise: the data never leaves the device — but it's also always yours
// to take with you.
export function exportAllData() {
  const keys = [
    'aura.moods',
    'aura.journal',
    'aura.routine',
    'aura.chat',
    'aura.name',
    'aura.diary',
    'aura.settings',
    'aura.lang',
  ]
  const data: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    app: 'Aura',
  }
  for (const k of keys) {
    try {
      const raw = localStorage.getItem(k)
      if (raw != null) data[k.replace('aura.', '')] = JSON.parse(raw)
    } catch {
      // skip unparseable entries rather than failing the whole export
    }
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `aura-data-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// Wipe every trace of the user's data from this device.
export function clearAllData() {
  ;[
    'aura.moods',
    'aura.journal',
    'aura.routine',
    'aura.chat',
    'aura.name',
    'aura.diary',
    'aura.settings',
    'aura.lang',
    'aura.profile',
  ].forEach((k) => localStorage.removeItem(k))
  location.reload()
}
