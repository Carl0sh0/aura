// =====================================================================
// Aura — demo-mode content, shared by every backend runtime (the local
// Express dev server in server/index.mjs, and the Vercel serverless
// functions in /api). Shown only when there's no ANTHROPIC_API_KEY.
// Several variants per language (chosen at random) so testing the app
// doesn't feel like the same canned line every time — real Claude replies
// are, of course, fully dynamic.
// =====================================================================
import type { Lang } from './prompts'

// Minimal Node-response shape both Express and Vercel functions satisfy.
type WritableRes = { write: (chunk: string) => void; end: () => void }

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

const MOCK_CHAT: Partial<Record<Lang, string[]>> = {
  es: [
    "Eso suena como mucho para llevar. Gracias por ponerlo en palabras — eso ya es algo.\n\n¿Puedes contarme un poco más sobre cómo se ha sentido hoy? No voy a ninguna parte.\n\n(Modo demo: añade tu ANTHROPIC_API_KEY en .env para hablar con el Claude real.)",
    "Te escucho. A veces solo decir las cosas en voz alta ya alivia un poco el peso que llevas encima.\n\n¿Qué es lo que más pesa ahora mismo?\n\n(Modo demo — las respuestas reales serán mucho más variadas y específicas.)",
    "Gracias por compartir esto conmigo. Mereces espacio para sentir lo que sientes, sin prisa por arreglarlo.\n\n¿Hay algo en concreto que te gustaría explorar juntos?\n\n(Modo demo: conecta tu clave de Claude para respuestas completas y variadas.)",
  ],
  en: [
    "That sounds like a lot to be holding. Thank you for putting it into words — that takes something.\n\nCan you tell me a little more about what today has felt like? I'm not going anywhere.\n\n(Demo mode: add an ANTHROPIC_API_KEY in .env to talk with the real Claude.)",
    "I hear you. Sometimes just saying it out loud takes a little weight off.\n\nWhat feels heaviest right now?\n\n(Demo mode — real replies will be far more varied and specific to what you share.)",
    "Thank you for trusting me with this. You deserve space to feel it, without rushing to fix it.\n\nIs there something specific you'd like to sit with together?\n\n(Demo mode: connect a Claude key for full, dynamic replies.)",
  ],
  fr: [
    "Cela semble beaucoup à porter. Merci de l'avoir mis en mots — ce n'est pas rien.\n\nPouvez-vous m'en dire un peu plus sur ce que vous avez ressenti aujourd'hui ?\n\n(Mode démo : ajoutez une ANTHROPIC_API_KEY dans .env pour parler au vrai Claude.)",
  ],
  pt: [
    "Isso parece muito para carregar. Obrigado por colocares isso em palavras — já é algo.\n\nPodes contar-me um pouco mais sobre como te tens sentido hoje?\n\n(Modo demo: adiciona uma ANTHROPIC_API_KEY no .env para falares com o Claude real.)",
  ],
  de: [
    "Das klingt nach einer schweren Last. Danke, dass du es in Worte gefasst hast — das ist schon etwas.\n\nKannst du mir etwas mehr darüber erzählen, wie sich der heutige Tag angefühlt hat?\n\n(Demo-Modus: Füge einen ANTHROPIC_API_KEY in .env hinzu, um mit dem echten Claude zu sprechen.)",
  ],
}

const MOCK_CRISIS_CHAT: Partial<Record<Lang, string>> = {
  es: "Me alegra muchísimo que me lo hayas contado — gracias por confiar en mí. Lo que sientes suena increíblemente pesado, y mereces apoyo real ahora mismo, no llevarlo solo/a.\n\nPor favor contacta a alguien que pueda estar contigo en este momento: si estás en EE. UU. puedes llamar o escribir al 988, o llamar a tu número de emergencias local. Si hay alguien cerca en quien confíes, está bien decirle que lo estás pasando mal.\n\nEstoy aquí contigo. ¿Estás a salvo ahora mismo?",
  en: "I'm really glad you told me this — thank you for trusting me with it. What you're feeling sounds incredibly heavy, and you deserve real support right now, not to carry this alone.\n\nPlease reach out to someone who can be with you in this moment: if you're in the US you can call or text 988, or call your local emergency number. If there's someone nearby you trust, it's okay to tell them you're struggling.\n\nI'm here with you. Are you safe right now?",
  fr: "Je suis vraiment content(e) que vous me le disiez — merci de me faire confiance. Ce que vous ressentez semble incroyablement lourd, et vous méritez un vrai soutien maintenant, pas de porter cela seul(e).\n\nContactez quelqu'un qui peut être avec vous en ce moment : appelez votre numéro d'urgence local. Si une personne de confiance est proche, il est normal de lui dire que vous allez mal.\n\nJe suis là avec vous. Êtes-vous en sécurité en ce moment ?",
  pt: "Fico muito contente que me tenhas contado isto — obrigado por confiares em mim. O que sentes parece incrivelmente pesado, e mereces apoio real agora, não carregar isto sozinho/a.\n\nPor favor contacta alguém que possa estar contigo neste momento, ou liga para o teu número de emergência local. Se houver alguém de confiança por perto, está tudo bem em dizer que estás a passar por um momento difícil.\n\nEstou aqui contigo. Estás em segurança agora?",
  de: "Ich bin wirklich froh, dass du mir das erzählt hast — danke für dein Vertrauen. Was du fühlst, klingt unglaublich schwer, und du verdienst jetzt echte Unterstützung, nicht damit allein zu sein.\n\nBitte wende dich an jemanden, der jetzt bei dir sein kann, oder ruf deine lokale Notrufnummer an. Wenn jemand in deiner Nähe ist, dem du vertraust, ist es in Ordnung, ihm zu sagen, dass es dir schlecht geht.\n\nIch bin hier bei dir. Bist du gerade in Sicherheit?",
}

export async function mockStream(res: WritableRes, crisis: boolean, lang: Lang): Promise<void> {
  const text = crisis
    ? MOCK_CRISIS_CHAT[lang] || MOCK_CRISIS_CHAT.en!
    : pick(MOCK_CHAT[lang] || MOCK_CHAT.en!)
  for (const word of text.split(/(\s+)/)) {
    res.write(word)
    await new Promise((r) => setTimeout(r, 18))
  }
  res.end()
}

const MOCK_REFLECT: Partial<Record<Lang, string[]>> = {
  es: [
    'Hay una ternura real en lo que escribiste. Parece que una parte de ti está cansada y otra sigue intentándolo — ambas cosas pueden ser ciertas. ¿Qué sería la más pequeña amabilidad que podrías ofrecerte hoy? (Modo demo.)',
    'Gracias por confiar esto al papel. Se nota que has estado cargando con algo importante. ¿Qué necesitarías escuchar ahora mismo? (Modo demo.)',
  ],
  en: [
    "There's a real tenderness in what you wrote. It sounds like part of you is tired and part of you is still trying — both can be true. What would feel like the smallest kindness you could offer yourself today? (Demo mode.)",
    "Thank you for trusting this to the page. It sounds like you've been carrying something real. What would you need to hear right now? (Demo mode.)",
  ],
  fr: [
    "Il y a une vraie tendresse dans ce que vous avez écrit. Quelle serait la plus petite bienveillance que vous pourriez vous offrir aujourd'hui ? (Mode démo.)",
  ],
  pt: [
    'Há uma ternura real no que escreveste. Qual seria a mais pequena gentileza que poderias oferecer a ti mesmo/a hoje? (Modo demo.)',
  ],
  de: [
    'In dem, was du geschrieben hast, steckt echte Zärtlichkeit. Was wäre die kleinste Freundlichkeit, die du dir heute schenken könntest? (Demo-Modus.)',
  ],
}

const MOCK_REFLECT_CRISIS: Partial<Record<Lang, string>> = {
  es: 'Puedo sentir cuánto dolor hay en estas palabras, y no quiero que estés solo/a con esto. Por favor, considera buscar ayuda ahora mismo: tu línea de crisis local. Importas.',
  en: "I can feel how much pain is in these words, and I don't want you to be alone with it. Please consider reaching out right now — 988 in the US, or your local crisis line. You matter.",
  fr: 'Je ressens beaucoup de douleur dans ces mots, et je ne veux pas que vous soyez seul(e) avec cela. Contactez votre ligne de crise locale dès maintenant. Vous comptez.',
  pt: 'Sinto muita dor nestas palavras, e não quero que estejas sozinho/a com isto. Por favor contacta a tua linha de crise local agora. Tu importas.',
  de: 'Ich spüre, wie viel Schmerz in diesen Worten steckt, und ich möchte nicht, dass du damit allein bist. Bitte wende dich jetzt an deine lokale Krisenhotline. Du bist wichtig.',
}

export function mockReflection(crisis: boolean, lang: Lang): string {
  if (crisis) return MOCK_REFLECT_CRISIS[lang] || MOCK_REFLECT_CRISIS.en!
  return pick(MOCK_REFLECT[lang] || MOCK_REFLECT.en!)
}

type Habit = { title: string; why: string; minutes: number; icon: string }
type RoutinePayload = { intro: string; habits: Habit[] }

const MOCK_ROUTINE_ES: RoutinePayload = {
  intro: 'Unas pequeñas cosas amables para hoy — sin presión, solo pasos suaves.',
  habits: [
    { title: 'Sal afuera 5 minutos', why: 'La luz del día ayuda a estabilizar el ánimo.', minutes: 5, icon: 'sun' },
    { title: 'Tres respiraciones lentas', why: 'Un reinicio rápido para tu sistema nervioso.', minutes: 2, icon: 'wind' },
    { title: 'Escríbele a alguien que te agrade', why: 'Una pequeña conexión alegra el día.', minutes: 3, icon: 'heart' },
    { title: 'Escribe una línea en tu diario', why: 'Nombrar un sentimiento afloja su control.', minutes: 4, icon: 'book' },
    { title: 'Un paseo corto y sin prisa', why: 'El movimiento suave mueve la energía estancada.', minutes: 10, icon: 'walk' },
  ],
}

const MOCK_ROUTINE_EN: RoutinePayload = {
  intro: 'A few small, kind things for today — no pressure, just gentle steps.',
  habits: [
    { title: 'Step outside for 5 minutes', why: 'Daylight helps steady your mood.', minutes: 5, icon: 'sun' },
    { title: 'Three slow breaths', why: 'A quick reset for your nervous system.', minutes: 2, icon: 'wind' },
    { title: 'Text one person you like', why: 'Small connection lifts the day.', minutes: 3, icon: 'heart' },
    { title: 'Write one line in your journal', why: 'Naming a feeling loosens its grip.', minutes: 4, icon: 'book' },
    { title: 'A short, unhurried walk', why: 'Gentle movement shifts stuck energy.', minutes: 10, icon: 'walk' },
  ],
}

const MOCK_ROUTINE: Record<Lang, RoutinePayload> = {
  es: MOCK_ROUTINE_ES,
  en: MOCK_ROUTINE_EN,
  fr: MOCK_ROUTINE_EN,
  pt: MOCK_ROUTINE_EN,
  de: MOCK_ROUTINE_EN,
}

export function mockRoutine(lang: Lang): RoutinePayload {
  return MOCK_ROUTINE[lang] || MOCK_ROUTINE_EN
}

export function safeParseRoutine(text: string, lang: Lang): RoutinePayload {
  try {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    const json = JSON.parse(text.slice(start, end + 1))
    if (Array.isArray(json.habits) && json.habits.length) return json
  } catch {
    /* fall through */
  }
  return mockRoutine(lang)
}
