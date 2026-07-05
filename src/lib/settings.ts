// User-controllable feature switches, persisted locally. Read across the app so
// people can turn things on/off from the Settings tab.
import { useCallback } from 'react'
import { usePersistentState } from './store'
import { CHARACTER_PACKS, DEFAULT_PACK_ID, type PackId, type VoiceHint } from './characterPacks'

export type AiEngine = 'cloud' | 'local'

export type Settings = {
  voiceInput: boolean // show the microphone (speech-to-text)
  readAloud: boolean // show "read aloud" buttons (text-to-speech)
  autoRead: boolean // automatically speak Aura's chat replies
  reduceMotion: boolean // calm the animations
  aiEngine: AiEngine // 'cloud' = Claude (default), 'local' = on-device, private/offline
  activePackId: PackId // which companion persona/pack is active (applies to both cloud and local)
}

export const DEFAULT_SETTINGS: Settings = {
  voiceInput: true,
  readAloud: true,
  autoRead: false,
  reduceMotion: false,
  aiEngine: 'cloud',
  activePackId: DEFAULT_PACK_ID,
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

/** The active pack's text-to-speech voice hint (pitch/rate/preferred voice names). */
export function useActiveVoiceHint(): VoiceHint {
  return useActivePack().ttsVoiceHint
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
  ].forEach((k) => localStorage.removeItem(k))
  location.reload()
}
