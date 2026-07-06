// =====================================================================
// Character Packs — selectable companion personas. Each pack only varies
// the "voice and style" fragment of the system prompt (see prompts.ts,
// buildSystem) plus, for local/on-device mode, which WebLLM model backs it
// and a text-to-speech voice hint. Identity, firm boundaries, and crisis
// handling are shared and never vary by pack — see prompts.ts.
//
// Plain data only, no logic, so this file can be compiled into
// api/_shared/ (see scripts/build-api-shared.mjs) and safely imported by
// the server: the server looks up a client-supplied packId against this
// catalog and never accepts free-text system-prompt content from the client.
// =====================================================================

export type PackId = 'calm' | 'grounded' | 'reflective'

export type VoiceHint = {
  /** Substrings matched (case-insensitively) against SpeechSynthesisVoice.name, best-effort. */
  preferNames: string[]
  pitch: number
  rate: number
}

export type CharacterPack = {
  id: PackId
  glyph: string
  nameKey: string
  taglineKey: string
  /** English system-prompt "voice and style" fragment — instructs the model, independent of reply language. */
  personaVoice: string
  localModelId: string
  localModelLabel: string
  vramHintGB: number
  lowResourceRequired: boolean
  ttsVoiceHint: VoiceHint
}

export type ModelOption = {
  id: string
  label: string
  vramGB: number
  lowResource: boolean
  description: string
}

export const SUPPORTED_MODELS: ModelOption[] = [
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    label: 'Llama 3.2 (1B)',
    vramGB: 1.1,
    lowResource: true,
    description: 'Ultra-fast, lowest memory footprint. Perfect for older phones or laptops.'
  },
  {
    id: 'gemma3-1b-it-q4f16_1-MLC',
    label: 'Gemma 3 (1B)',
    vramGB: 1.2,
    lowResource: true,
    description: 'Google’s newest lightweight model. Great speed and solid alignment.'
  },
  {
    id: 'Qwen3.5-2B-q4f16_1-MLC',
    label: 'Qwen 3.5 (2B)',
    vramGB: 2.2,
    lowResource: false,
    description: 'Alibaba’s state-of-the-art 2B model. Highly balanced intelligence and speed.'
  },
  {
    id: 'gemma-2-2b-it-q4f16_1-MLC',
    label: 'Gemma 2 (2B)',
    vramGB: 2.4,
    lowResource: false,
    description: 'Highly capable 2.6B parameter model from Google.'
  },
  {
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    label: 'Llama 3.2 (3B)',
    vramGB: 2.8,
    lowResource: false,
    description: 'Meta’s highly aligned 3B model. Empathic and clear conversation.'
  },
  {
    id: 'Ministral-3-3B-Instruct-2512-BF16-q4f16_1-MLC',
    label: 'Ministral 3 (3B)',
    vramGB: 2.9,
    lowResource: false,
    description: 'Mistral’s premium on-device model, tailored for reasoning and depth.'
  },
  {
    id: 'Phi-4-mini-instruct-q4f16_1-MLC',
    label: 'Phi-4 Mini (3.8B)',
    vramGB: 3.8,
    lowResource: false,
    description: 'Microsoft’s latest mini model. Incredible logic and problem-solving.'
  },
  {
    id: 'Qwen3.5-4B-q4f16_1-MLC',
    label: 'Qwen 3.5 (4B)',
    vramGB: 3.9,
    lowResource: false,
    description: 'State-of-the-art 4B model. Extremely rich vocabulary and reasoning.'
  }
]

export const DEFAULT_PACK_ID: PackId = 'calm'

export const CHARACTER_PACKS: Record<PackId, CharacterPack> = {
  calm: {
    id: 'calm',
    glyph: '🌿',
    nameKey: 'settings.packs.calm.name',
    taglineKey: 'settings.packs.calm.tagline',
    personaVoice: `Voice and style:
- Warm, calm, human, and unhurried. Talk like a thoughtful friend who happens to know
  a lot about psychology — not like a textbook or a chirpy chatbot.
- Reflect back what you hear before offering anything. People want to feel understood first.
- Keep replies fairly short by default (2-5 short paragraphs). Ask one gentle question at a time.
- No toxic positivity. Don't rush to "look on the bright side." Sit with hard feelings.
- Offer practical, evidence-informed tools when it fits — ideas drawn from CBT (reframing
  unhelpful thoughts), ACT (values, acceptance), mindfulness, behavioral activation, sleep
  and stress hygiene. Suggest, never prescribe. Use plain language, not jargon.`,
    // Smallest catalog model — this is the pack every brand-new visitor starts on
    // (no onboarding gate, see App.tsx), so it's optimized for "downloads fast and
    // definitely runs," not peak quality. Settings lets anyone switch to a bigger
    // model per pack once they're already invested.
    localModelId: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    localModelLabel: 'Llama 3.2 (1B, on-device)',
    vramHintGB: 1.1,
    lowResourceRequired: true,
    ttsVoiceHint: { preferNames: ['female', 'sonia', 'libby', 'serena', 'samantha'], pitch: 1, rate: 0.98 },
  },
  grounded: {
    id: 'grounded',
    glyph: '🧭',
    nameKey: 'settings.packs.grounded.name',
    taglineKey: 'settings.packs.grounded.tagline',
    personaVoice: `Voice and style:
- Practical, steady, and direct — like a calm coach, not a cheerleader. Get to something
  useful quickly, without being cold.
- Favor short, concrete sentences over long reflection. Name the feeling briefly, then move
  toward one specific, doable next step.
- Ask focused questions ("what's one thing you could try in the next hour?") rather than
  open-ended ones.
- Lean on structured tools — CBT reframes, small behavioral experiments, checklists,
  if-then plans — over open exploration. Suggest, never prescribe. Plain language, no jargon.
- Still warm underneath the brevity: this is directness with care, not bluntness.`,
    localModelId: 'Qwen3.5-4B-q4f16_1-MLC',
    localModelLabel: 'Qwen 3.5 (4B, on-device)',
    vramHintGB: 3.9,
    lowResourceRequired: false,
    ttsVoiceHint: { preferNames: ['male', 'ryan', 'oliver', 'daniel', 'george'], pitch: 0.95, rate: 1.05 },
  },
  reflective: {
    id: 'reflective',
    glyph: '🌙',
    nameKey: 'settings.packs.reflective.name',
    taglineKey: 'settings.packs.reflective.tagline',
    personaVoice: `Voice and style:
- Slow-paced and contemplative — like a quiet, unhurried journaling companion. There is
  no rush to fix anything.
- Favor Socratic, open-ended questions over advice. Help the person notice patterns and
  arrive at their own insight rather than handing them a conclusion.
- Use longer pauses and gentler pacing than a typical reply — it's fine to sit with a
  feeling across a few sentences before asking anything.
- Draw more on mindfulness, self-compassion, and ACT-style values work than on structured
  behavioral tools. Suggest, never prescribe. Plain language, no jargon.
- Comfortable with ambiguity and silence; doesn't need every message to resolve neatly.`,
    localModelId: 'Ministral-3-3B-Instruct-2512-BF16-q4f16_1-MLC',
    localModelLabel: 'Ministral 3 (3B, on-device)',
    vramHintGB: 2.9,
    lowResourceRequired: true,
    ttsVoiceHint: { preferNames: ['female', 'libby', 'siri', 'serena', 'moira'], pitch: 1.05, rate: 0.92 },
  },
}
