// =====================================================================
// Local AI engine — runs a small language model entirely in the browser
// via WebGPU (WebLLM). Nothing leaves the device: no network request, no
// server, no API key. This is the private/offline fallback to Claude.
//
// Trade-off, honestly stated: a 2-4B-parameter on-device model is nowhere
// near Claude's quality or nuance. It exists for people who want to talk
// with zero data leaving their machine, or who are offline — not as a
// silent quality-equivalent swap.
//
// Multi-model: each Character Pack (see characterPacks.ts) can back itself
// with a different WebLLM model, so engine state is keyed by model id
// rather than a single global singleton. Only one model is expected to sit
// in GPU memory at a time in practice — see switchActiveLocalModel.
// =====================================================================
import { useSyncExternalStore } from 'react'
import type { MLCEngine } from '@mlc-ai/web-llm'
import { DEFAULT_LANG, buildSystem, detectCrisis, languageDirective, type Lang } from './prompts'
import type { ChatMessage } from './store'

export type EngineStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unsupported'

type EngineEntry = {
  status: EngineStatus
  progress: number // 0..1
  text: string
  error?: string
}

const IDLE_ENTRY: EngineEntry = { status: 'idle', progress: 0, text: '' }

const entries = new Map<string, EngineEntry>()
const engines = new Map<string, MLCEngine>()
const loadPromises = new Map<string, Promise<MLCEngine>>()
const listeners = new Set<() => void>()

function setEntry(modelId: string, patch: Partial<EngineEntry>) {
  entries.set(modelId, { ...(entries.get(modelId) ?? IDLE_ENTRY), ...patch })
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/** React hook: live status of a given model's local engine (idle/loading/ready/error/unsupported). */
export function useLocalEngineState(modelId: string) {
  return useSyncExternalStore(
    subscribe,
    () => entries.get(modelId) ?? IDLE_ENTRY,
    () => IDLE_ENTRY,
  )
}

export function webgpuSupported() {
  return typeof navigator !== 'undefined' && !!(navigator as any).gpu
}

/** Loads (or returns the already-loaded) local model for the given model id. Safe to call repeatedly. */
export function ensureLocalEngine(modelId: string): Promise<MLCEngine> {
  const existing = engines.get(modelId)
  if (existing && entries.get(modelId)?.status === 'ready') return Promise.resolve(existing)

  const inflight = loadPromises.get(modelId)
  if (inflight) return inflight

  if (!webgpuSupported()) {
    setEntry(modelId, { status: 'unsupported', text: 'This browser does not support WebGPU.' })
    return Promise.reject(new Error('WebGPU unsupported'))
  }

  setEntry(modelId, { status: 'loading', progress: 0, text: 'Starting…', error: undefined })
  const promise = import('@mlc-ai/web-llm')
    .then(({ CreateMLCEngine }) =>
      CreateMLCEngine(modelId, {
        initProgressCallback: (report) => {
          setEntry(modelId, { progress: report.progress ?? 0, text: report.text || '' })
        },
      }),
    )
    .then(async (eng) => {
      engines.set(modelId, eng)
      setEntry(modelId, { status: 'ready', progress: 1, text: 'Ready' })
      // Ask the browser not to silently evict the multi-GB model cache under storage pressure.
      try {
        await navigator.storage?.persist?.()
      } catch {
        // best-effort; not all browsers support this
      }
      return eng
    })
    .catch((err) => {
      loadPromises.delete(modelId)
      setEntry(modelId, { status: 'error', error: err?.message || String(err) })
      throw err
    })
  loadPromises.set(modelId, promise)
  return promise
}

/**
 * Switches the active local model: unloads the previous model (if different and loaded)
 * to free GPU memory, then loads the new one. Use this from the companion picker instead
 * of calling ensureLocalEngine directly when the user changes their selected pack.
 */
export async function switchActiveLocalModel(
  newModelId: string,
  previousModelId?: string,
): Promise<MLCEngine> {
  if (previousModelId && previousModelId !== newModelId) {
    const prevEngine = engines.get(previousModelId)
    if (prevEngine) {
      try {
        await prevEngine.unload()
      } catch {
        // best-effort
      }
      engines.delete(previousModelId)
      loadPromises.delete(previousModelId)
      setEntry(previousModelId, IDLE_ENTRY)
    }
  }
  return ensureLocalEngine(newModelId)
}

/** Whether a model's weights are already cached on-device (survives reloads), independent of in-memory state. */
export async function isModelDownloaded(modelId: string): Promise<boolean> {
  try {
    const { hasModelInCache } = await import('@mlc-ai/web-llm')
    return await hasModelInCache(modelId)
  } catch {
    return false
  }
}

/** Removes a model's cached weights from browser storage (e.g. a "remove download" action). */
export async function removeDownloadedModel(modelId: string): Promise<void> {
  const eng = engines.get(modelId)
  if (eng) {
    try {
      await eng.unload()
    } catch {
      // best-effort
    }
    engines.delete(modelId)
    loadPromises.delete(modelId)
  }
  setEntry(modelId, IDLE_ENTRY)
  const { deleteModelAllInfoInCache } = await import('@mlc-ai/web-llm')
  await deleteModelAllInfoInCache(modelId)
}

export function isLocalEngineReady(modelId: string) {
  return entries.get(modelId)?.status === 'ready'
}

/**
 * Streams a chat reply from the local, on-device model. Mirrors the shape
 * of `streamChat` in `api.ts` so callers (Chat.tsx) barely have to branch.
 */
export async function localChatStream(
  messages: ChatMessage[],
  context: string,
  onToken: (t: string) => void,
  lang: Lang = DEFAULT_LANG,
  modelId: string,
  personaVoice: string,
): Promise<{ crisis: boolean }> {
  const eng = await ensureLocalEngine(modelId)
  const last = [...messages].reverse().find((m) => m.role === 'user')
  const crisis = detectCrisis(last?.content)
  const system = buildSystem(context, crisis, personaVoice) + languageDirective(lang)

  const stream = await eng.chat.completions.create({
    stream: true,
    messages: [{ role: 'system', content: system }, ...messages],
  })

  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content
    if (delta) onToken(delta)
  }
  return { crisis }
}
