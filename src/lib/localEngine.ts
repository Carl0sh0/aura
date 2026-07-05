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
import {
  CRISIS_GUIDANCE,
  DEFAULT_LANG,
  REFLECT_SYSTEM,
  ROUTINE_SYSTEM,
  buildSystem,
  detectCrisis,
  languageDirective,
  type Lang,
} from './prompts'
import type { ChatMessage, Habit } from './store'

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
      CreateMLCEngine(
        modelId,
        {
          initProgressCallback: (report) => {
            setEntry(modelId, { progress: report.progress ?? 0, text: report.text || '' })
          },
        },
        // Some models (e.g. gemma3-1b) ship a base config with a positive
        // sliding_window_size, which conflicts with the catalog's own
        // context_window_size override — WebLLM requires exactly one of the two to
        // be positive. Force sliding-window attention off so context_window_size is
        // always the sole limit, regardless of what a given model's base config sets.
        { sliding_window_size: -1 },
      ),
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

// Defensive net against reasoning-style models (e.g. Qwen3) that emit a hidden
// "<think>...</think>" block before the real reply — Aura's pack catalog avoids such
// models deliberately, but this keeps any stray reasoning output from ever reaching the
// user regardless of which model ends up backing a pack.
function stripThink(text: string): string {
  let out = text.replace(/<think>[\s\S]*?<\/think>/gi, '')
  const openIdx = out.search(/<think>/i)
  if (openIdx !== -1) out = out.slice(0, openIdx) // unterminated think block — drop the rest
  return out.trim()
}

/** Interrupts an in-flight generation for the given model, if one is running (a "stop" action). */
export async function interruptLocalGeneration(modelId: string): Promise<void> {
  const eng = engines.get(modelId)
  if (!eng) return
  try {
    await eng.interruptGenerate()
  } catch {
    // best-effort
  }
}

/**
 * Streams a chat reply from the local, on-device model. Mirrors the shape
 * of `streamChat` in `api.ts` so callers (Chat.tsx) barely have to branch.
 */
// How many recent messages to send the model each turn. Prefill (re-reading the prompt +
// history) dominates per-message latency on phone GPUs, and the full transcript grows
// without bound — so the model sees a sliding window, while the on-screen history and
// crisis detection are unaffected. 10 messages ≈ 5 exchanges of working memory.
const CHAT_HISTORY_WINDOW = 10

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
  const recent = messages.slice(-CHAT_HISTORY_WINDOW)

  const stream = await eng.chat.completions.create({
    stream: true,
    messages: [{ role: 'system', content: system }, ...recent],
    // Short replies are both the persona spec (2-5 short paragraphs) and much faster to
    // generate on a phone — a lower cap keeps the conversation feeling snappy.
    max_tokens: 400,
  })

  // Streaming version of stripThink() — buffers just enough to detect and swallow a
  // leading "<think>...</think>" block without ever forwarding it to onToken.
  const THINK_OPEN = '<think'
  const THINK_CLOSE = '</think>'
  let buffer = ''
  let mode: 'detecting' | 'thinking' | 'normal' = 'detecting'

  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content
    if (!delta) continue

    if (mode === 'normal') {
      onToken(delta)
      continue
    }

    buffer += delta

    if (mode === 'detecting') {
      const trimmed = buffer.trimStart()
      if (trimmed.length === 0) continue
      if (trimmed.length < THINK_OPEN.length) {
        if (THINK_OPEN.startsWith(trimmed)) continue // could still become "<think", keep waiting
        mode = 'normal'
        onToken(buffer)
        buffer = ''
        continue
      }
      if (trimmed.startsWith(THINK_OPEN)) {
        mode = 'thinking'
      } else {
        mode = 'normal'
        onToken(buffer)
        buffer = ''
        continue
      }
    }

    if (mode === 'thinking') {
      const closeIdx = buffer.indexOf(THINK_CLOSE)
      if (closeIdx === -1) continue
      const after = buffer.slice(closeIdx + THINK_CLOSE.length)
      mode = 'normal'
      buffer = ''
      if (after) onToken(after)
    }
  }
  return { crisis }
}

/** A brief, gentle reflection on a journal entry, generated by the local on-device model. */
export async function localReflect(
  entry: string,
  mood: number | string | undefined,
  lang: Lang = DEFAULT_LANG,
  modelId: string,
): Promise<{ reflection: string; crisis: boolean }> {
  const eng = await ensureLocalEngine(modelId)
  const crisis = detectCrisis(entry)
  const system = REFLECT_SYSTEM + languageDirective(lang) + (crisis ? CRISIS_GUIDANCE : '')

  const res = await eng.chat.completions.create({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `Mood: ${mood ?? 'unspecified'}\n\nJournal entry:\n${entry}` },
    ],
    max_tokens: 300,
  })
  const reflection = stripThink(res.choices?.[0]?.message?.content || '')
  return { reflection, crisis }
}

type RoutinePayload = { intro: string; habits: Habit[] }

// Small on-device models occasionally return malformed JSON where Claude reliably wouldn't —
// this is a genuine parse-failure safety net, not demo/mock content.
const FALLBACK_ROUTINE: Partial<Record<Lang, RoutinePayload>> = {
  es: {
    intro: 'Unas pequeñas cosas amables para hoy — sin presión, solo pasos suaves.',
    habits: [
      { title: 'Sal afuera 5 minutos', why: 'La luz del día ayuda a estabilizar el ánimo.', minutes: 5, icon: 'sun' },
      { title: 'Tres respiraciones lentas', why: 'Un reinicio rápido para tu sistema nervioso.', minutes: 2, icon: 'wind' },
      { title: 'Escribe una línea en tu diario', why: 'Nombrar un sentimiento afloja su control.', minutes: 4, icon: 'book' },
      { title: 'Un paseo corto y sin prisa', why: 'El movimiento suave mueve la energía estancada.', minutes: 10, icon: 'walk' },
    ],
  },
  en: {
    intro: 'A few small, kind things for today — no pressure, just gentle steps.',
    habits: [
      { title: 'Step outside for 5 minutes', why: 'Daylight helps steady your mood.', minutes: 5, icon: 'sun' },
      { title: 'Three slow breaths', why: 'A quick reset for your nervous system.', minutes: 2, icon: 'wind' },
      { title: 'Write one line in your journal', why: 'Naming a feeling loosens its grip.', minutes: 4, icon: 'book' },
      { title: 'A short, unhurried walk', why: 'Gentle movement shifts stuck energy.', minutes: 10, icon: 'walk' },
    ],
  },
}

function parseRoutineJson(text: string, lang: Lang): RoutinePayload {
  try {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    const json = JSON.parse(text.slice(start, end + 1))
    if (Array.isArray(json.habits) && json.habits.length) return json
  } catch {
    // fall through to the fallback below
  }
  return FALLBACK_ROUTINE[lang] || FALLBACK_ROUTINE.en!
}

/** Generates a gentle daily routine (JSON), via the local on-device model. */
export async function localRoutine(
  mood: string,
  focus: string,
  lang: Lang = DEFAULT_LANG,
  modelId: string,
): Promise<RoutinePayload> {
  const eng = await ensureLocalEngine(modelId)
  const system = ROUTINE_SYSTEM + languageDirective(lang)

  const res = await eng.chat.completions.create({
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: `Today I feel: ${mood || 'okay'}. I'd like to focus on: ${focus || 'feeling a bit steadier'}.`,
      },
    ],
    max_tokens: 600,
  })
  const text = stripThink(res.choices?.[0]?.message?.content || '{}')
  return parseRoutineJson(text, lang)
}
