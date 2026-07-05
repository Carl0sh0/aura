// Client-side API helpers. Aura is local-only: every call runs through the
// on-device WebLLM engine (src/lib/localEngine.ts) — nothing leaves the device.
import type { ChatMessage, Habit } from './store'
import type { Lang } from './prompts'
import { interruptLocalGeneration, localChatStream, localReflect, localRoutine } from './localEngine'
import { CHARACTER_PACKS, DEFAULT_PACK_ID, type CharacterPack } from './characterPacks'
import { getModelIdForPack } from './settings'

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
  const modelId = getModelIdForPack(pack.id)
  return localChatStream(messages, context, onToken, lang, modelId, pack.personaVoice)
}

/** Stops an in-flight chat generation for the given pack's model (a "stop generating" action). */
export function stopGenerating(pack: CharacterPack = CHARACTER_PACKS[DEFAULT_PACK_ID]): Promise<void> {
  const modelId = getModelIdForPack(pack.id)
  return interruptLocalGeneration(modelId)
}

export async function reflect(
  entry: string,
  mood?: number,
  lang?: Lang,
  pack: CharacterPack = CHARACTER_PACKS[DEFAULT_PACK_ID],
): Promise<{ reflection: string; crisis: boolean }> {
  const modelId = getModelIdForPack(pack.id)
  return localReflect(entry, mood, lang, modelId)
}

export async function generateRoutine(
  mood: string,
  focus: string,
  lang?: Lang,
  pack: CharacterPack = CHARACTER_PACKS[DEFAULT_PACK_ID],
): Promise<{ intro: string; habits: Habit[] }> {
  const modelId = getModelIdForPack(pack.id)
  return localRoutine(mood, focus, lang, modelId)
}
