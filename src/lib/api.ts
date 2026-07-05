// Client-side API helpers. Cloud calls hit our own Express backend, which
// holds the Claude key and the safety layer. Reusable from any future client.
import type { ChatMessage, Habit } from './store'
import type { Lang } from './prompts'
import { isLocalEngineReady, localChatStream } from './localEngine'
import type { AiEngine } from './settings'
import { CHARACTER_PACKS, DEFAULT_PACK_ID, type CharacterPack } from './characterPacks'

export type ChatResult = { crisis: boolean }

type StreamChatOptions = {
  signal?: AbortSignal
  engine?: AiEngine
  lang?: Lang
  pack?: CharacterPack
}

/**
 * Streams the assistant reply token-by-token via onToken; resolves when done.
 * Routes to the on-device model when the user has chosen it, or automatically
 * when the browser is offline and a local model is already downloaded.
 */
export async function streamChat(
  messages: ChatMessage[],
  context: string,
  onToken: (t: string) => void,
  { signal, engine = 'cloud', lang, pack = CHARACTER_PACKS[DEFAULT_PACK_ID] }: StreamChatOptions = {},
): Promise<ChatResult> {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false

  if (engine === 'local' || (offline && isLocalEngineReady(pack.localModelId))) {
    return localChatStream(messages, context, onToken, lang, pack.localModelId, pack.personaVoice)
  }

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, context, lang, packId: pack.id }),
    signal,
  })
  if (!res.body) throw new Error('No response stream')
  const crisis = res.headers.get('X-Aura-Crisis') === '1'
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    onToken(decoder.decode(value, { stream: true }))
  }
  return { crisis }
}

export async function reflect(
  entry: string,
  mood?: number,
  lang?: Lang,
): Promise<{ reflection: string; crisis: boolean }> {
  const res = await fetch('/api/reflect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entry, mood, lang }),
  })
  return res.json()
}

export async function generateRoutine(
  mood: string,
  focus: string,
  lang?: Lang,
): Promise<{ intro: string; habits: Habit[] }> {
  const res = await fetch('/api/routine', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mood, focus, lang }),
  })
  return res.json()
}
