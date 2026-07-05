// =====================================================================
// Aura — shared system prompts and the safety layer.
// This is the single source of truth for who Aura is and how it handles
// crisis situations. Both the Claude backend (server/index.mjs, loaded via
// tsx which transpiles this file on the fly) and the on-device local AI
// engine (src/lib/localEngine.ts) import from here, so the companion
// behaves identically regardless of which "brain" is answering.
// =====================================================================

// Identity intro — shared by every companion persona/pack, always precedes the
// persona-specific "voice" fragment (see characterPacks.ts).
export const IDENTITY_INTRO = `You are Aura, a warm, grounded mental-wellbeing companion inside a personal app.
You are NOT a licensed therapist, doctor, or crisis service, and you never claim to be.
Your role is everyday emotional support: helping the person notice how they feel, reflect,
and take small, kind steps forward.`

// Non-negotiable safety boundaries — shared by every persona/pack, always follows the
// persona-specific "voice" fragment. Never overridden or reordered by persona text.
export const CLOSING_BOUNDARIES = `Firm boundaries:
- You do not diagnose conditions or recommend medications or dosages.
- If asked for medical, legal, or clinical decisions, gently encourage speaking with a
  qualified professional, and offer to help them prepare for that conversation.
- When someone is clearly struggling beyond everyday stress, warmly encourage reaching out
  to a licensed therapist or doctor — framing it as strength, not failure.

Never invent facts about the person. If you don't know something, ask.`

// Default persona "voice" fragment — the `calm` character pack's flavor text. Kept
// verbatim from the original single-persona COMPANION_SYSTEM so the default experience
// doesn't change for existing users.
export const DEFAULT_PERSONA_VOICE = `Voice and style:
- Warm, calm, human, and unhurried. Talk like a thoughtful friend who happens to know
  a lot about psychology — not like a textbook or a chirpy chatbot.
- Reflect back what you hear before offering anything. People want to feel understood first.
- Keep replies fairly short by default (2-5 short paragraphs). Ask one gentle question at a time.
- No toxic positivity. Don't rush to "look on the bright side." Sit with hard feelings.
- Offer practical, evidence-informed tools when it fits — ideas drawn from CBT (reframing
  unhelpful thoughts), ACT (values, acceptance), mindfulness, behavioral activation, sleep
  and stress hygiene. Suggest, never prescribe. Use plain language, not jargon.`

// Appended to the system prompt when handling a possible crisis. This takes priority.
export const CRISIS_GUIDANCE = `

IMPORTANT — POSSIBLE CRISIS: The person may be in acute distress or considering harming
themselves. For this reply:
- Respond with calm, genuine warmth and take them seriously. Do not lecture or panic.
- Make clear they deserve support right now and are not a burden.
- Gently and clearly encourage contacting immediate help: emergency services (911 in the US,
  112 in the EU, or their local emergency number), or a crisis line — in the US call or text
  988 (Suicide & Crisis Lifeline). If outside the US, encourage them to look up their local line.
- Encourage reaching a trusted person nearby if they can.
- Do NOT provide any means or methods of self-harm, and do not minimize what they're feeling.
- Keep them company in the message; ask if they are safe right now. You are a bridge to real
  help, not a replacement for it.`

// Keyword/phrase heuristics for surfacing crisis resources immediately in the UI and
// steering the model. Intentionally broad — false positives are acceptable here; a missed
// crisis is not. This is a safety net, not a diagnosis.
// Aura is multilingual, so this list must cover every supported language — a crisis
// written in Spanish or French is just as urgent as one written in English.
const CRISIS_PATTERNS: RegExp[] = [
  // English
  /\bkill (myself|me)\b/i,
  /\bkilling myself\b/i,
  /\bend (my|it all|my life)\b/i,
  /\bsuicid/i,
  /\bwant to die\b/i,
  /\bdon'?t want to (be here|live|wake up)\b/i,
  /\bbetter off (dead|without me)\b/i,
  /\bharm(ing)? myself\b/i,
  /\bself[- ]?harm/i,
  /\bhurt myself\b/i,
  /\bno reason to (live|go on)\b/i,
  /\bcan'?t go on\b/i,
  /\boverdose\b/i,
  // Spanish
  /\bmatarme\b/i,
  /\bsuicid/i,
  /\bquiero morir\b/i,
  /\bno quiero (vivir|seguir viviendo)\b/i,
  /\bhacerme daño\b/i,
  /\bautolesi/i,
  /\bmejor (muerto|muerta)\b/i,
  /\bsin razones? para vivir\b/i,
  /\bacabar con todo\b/i,
  /\bquitarme la vida\b/i,
  // French
  /\bme tuer\b/i,
  /\bsuicid/i,
  /\bje veux mourir\b/i,
  /\bje ne veux plus vivre\b/i,
  /\bme faire du mal\b/i,
  /\bautomutilation\b/i,
  /\bmieux (mort|morte)\b/i,
  /\ben finir avec (tout|la vie)\b/i,
  // Portuguese
  /\bme matar\b/i,
  /\bsuicíd|suicid/i,
  /\bquero morrer\b/i,
  /\bnão quero viver\b/i,
  /\bme machucar\b/i,
  /\bautomutilaç/i,
  /\bmelhor (morto|morta)\b/i,
  /\bacabar com tudo\b/i,
  // German
  /\bmich umbringen\b/i,
  /\bsuizid/i,
  /\bwill sterben\b/i,
  /\bwill nicht mehr leben\b/i,
  /\bmir (weh ?tun|selbst verletzen)\b/i,
  /\bselbstverletzung\b/i,
  /\bbesser tot\b/i,
  /\bkeinen grund (mehr )?zu leben\b/i,
]

export function detectCrisis(text: string | undefined | null): boolean {
  if (!text) return false
  return CRISIS_PATTERNS.some((re) => re.test(text))
}

export const REFLECT_SYSTEM = `You are Aura, a warm wellbeing companion. The person just wrote a private
journal entry. Respond with a brief (2-4 sentences), gentle reflection: name the emotion you notice,
validate it, and offer one small, kind observation or a single soft question. Do not give a list of
advice. Do not diagnose. Sound like a caring friend, not a clinician.`

export const ROUTINE_SYSTEM = `You are Aura, a warm wellbeing companion designing a gentle daily routine.
Given how the person feels and what they want to focus on, propose 4-6 small, achievable actions for
today. Each should be specific, kind, and low-effort (a few minutes). Draw on behavioral activation,
mindfulness, movement, connection, rest, and sunlight. Avoid anything clinical or intense.

Return ONLY valid JSON, no prose, in exactly this shape:
{"intro":"one warm sentence","habits":[{"title":"short action","why":"one gentle sentence","minutes":5,"icon":"sun|heart|wind|book|walk|moon|cup|sparkle"}]}`

export function buildSystem(
  context: string | undefined | null,
  crisis: boolean,
  personaVoice: string = DEFAULT_PERSONA_VOICE,
): string {
  let sys = `${IDENTITY_INTRO}\n\n${personaVoice}\n\n${CLOSING_BOUNDARIES}`
  if (context && context.trim()) {
    sys += `\n\nContext the person has shared in the app (use gently, don't recite it back verbatim):\n${context.trim()}`
  }
  if (crisis) sys += CRISIS_GUIDANCE
  return sys
}

// ---- Language ------------------------------------------------------------
// Spanish is the app's base/default language. If a visitor's browser/OS
// locale matches one of the other supported languages, the UI (and Aura's
// replies) switch to that language automatically; otherwise everything
// falls back to Spanish. Shared between the client (i18n.tsx) and the
// server, so both agree on what "the app's language" means.
export const SUPPORTED_LANGS = ['es', 'en', 'fr', 'pt', 'de'] as const
export type Lang = (typeof SUPPORTED_LANGS)[number]
export const DEFAULT_LANG: Lang = 'es'

export const LANG_NAMES: Record<Lang, string> = {
  es: 'Spanish',
  en: 'English',
  fr: 'French',
  pt: 'Portuguese',
  de: 'German',
}

export function isSupportedLang(v: unknown): v is Lang {
  return typeof v === 'string' && (SUPPORTED_LANGS as readonly string[]).includes(v)
}

// A soft instruction, not a hard override: match the person's own language if
// they write in something else, otherwise default to the app's language.
export function languageDirective(lang: Lang): string {
  const name = LANG_NAMES[lang] || LANG_NAMES[DEFAULT_LANG]
  return `\n\nThe person's app is set to ${name}. Reply in ${name} by default. If they write to you in a different language, reply in that language instead.`
}
