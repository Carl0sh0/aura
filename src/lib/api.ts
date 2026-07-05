// Client-side API helpers. Aura is local-only: every call runs through the
// on-device WebLLM engine (src/lib/localEngine.ts) — nothing leaves the device.
import type { ChatMessage, Habit } from './store'
import type { Lang } from './prompts'
import { localChatStream, localReflect, localRoutine } from './localEngine'
import { CHARACTER_PACKS, DEFAULT_PACK_ID, type CharacterPack } from './characterPacks'

export type ChatResult = { crisis: boolean }

type StreamChatOptions = {
  lang?: Lang
  pack?: CharacterPack
}

/** Streams the assistant reply token-by-token via onToken; resolves when done. */
export async function streamChat(
  messages: ChatMessage[],
  context: string,
  onToken: (t: string) => void,
  { lang, pack = CHARACTER_PACKS[DEFAULT_PACK_ID] }: StreamChatOptions = {},
): Promise<ChatResult> {
  return localChatStream(messages, context, onToken, lang, pack.localModelId, pack.personaVoice)
}

export async function reflect(
  entry: string,
  mood?: number,
  lang?: Lang,
  pack: CharacterPack = CHARACTER_PACKS[DEFAULT_PACK_ID],
): Promise<{ reflection: string; crisis: boolean }> {
  return localReflect(entry, mood, lang, pack.localModelId)
}

export async function generateRoutine(
  mood: string,
  focus: string,
  lang?: Lang,
  pack: CharacterPack = CHARACTER_PACKS[DEFAULT_PACK_ID],
): Promise<{ intro: string; habits: Habit[] }> {
  return localRoutine(mood, focus, lang, pack.localModelId)
}
