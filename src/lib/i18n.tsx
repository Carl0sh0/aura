// =====================================================================
// Aura — language system. Spanish is the base/default language. On first
// visit, Aura checks the browser's locale (which follows the visitor's
// OS/region settings) and switches to a matching supported language
// automatically; if there's no match, it falls back to Spanish. Users can
// always override the choice manually in Settings — that choice is what
// persists from then on.
// =====================================================================
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { usePersistentState } from './store'
import { DEFAULT_LANG, LANG_NAMES, SUPPORTED_LANGS, isSupportedLang, type Lang } from './prompts'

export type { Lang }
export { DEFAULT_LANG, LANG_NAMES, SUPPORTED_LANGS }

// Full BCP-47 tags, used for speech recognition, speech synthesis, and
// Date/Intl formatting — this is the "region" half of the feature.
const LOCALE_TAGS: Record<Lang, string> = {
  es: 'es-ES',
  en: 'en-US',
  fr: 'fr-FR',
  pt: 'pt-PT',
  de: 'de-DE',
}

export function localeTagFor(lang: Lang) {
  return LOCALE_TAGS[lang]
}

function detectLang(): Lang {
  if (typeof navigator === 'undefined') return DEFAULT_LANG
  const candidates = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const c of candidates) {
    const base = c?.slice(0, 2).toLowerCase()
    if (isSupportedLang(base)) return base
  }
  return DEFAULT_LANG
}

// ---- Dictionary -----------------------------------------------------------
type Dict = Record<string, string>

const es: Dict = {
  'nav.today': 'Hoy',
  'nav.talk': 'Hablar',
  'nav.journal': 'Diario',
  'nav.plan': 'Plan',
  'nav.settings': 'Ajustes',

  'welcome.title': 'Bienvenido a Aura',
  'welcome.desc':
    'Un compañero tranquilo y privado para tu mente. Todo lo que escribas se queda en tu dispositivo. ¿Cómo quieres que te llame Aura?',
  'welcome.namePlaceholder': 'Tu nombre (o un apodo)',
  'welcome.begin': 'Comenzar',
  'welcome.skip': 'Omitir por ahora',
  'welcome.companion.title': 'Elige tu compañera',
  'welcome.companion.desc':
    'Aura funciona por completo en tu dispositivo. Antes de nada, elige quién te va a acompañar — puedes cambiarla luego cuando quieras.',
  'welcome.companion.continue': 'Continuar',
  'welcome.companion.hint': 'La descarga puede seguir en segundo plano mientras configuras lo demás.',
  'sidebar.disclaimer': 'Aura apoya tu bienestar, pero no sustituye la atención profesional.',

  'today.greeting.morning': 'Buenos días',
  'today.greeting.afternoon': 'Buenas tardes',
  'today.greeting.evening': 'Buenas noches',
  'today.subtitle': '¿Cómo llegas hoy?',
  'today.checkinAgain': '¿Quieres registrarte de nuevo?',
  'today.checkinFirst': 'Respira. ¿Cómo te sientes?',
  'today.face.veryLow': 'Muy mal',
  'today.face.low': 'Mal',
  'today.face.okay': 'Regular',
  'today.face.good': 'Bien',
  'today.face.great': 'Genial',
  'today.notePlaceholder': '¿Algo detrás de ese sentimiento? (opcional)',
  'today.log': 'Registrar cómo me siento',
  'today.thanks': 'Gracias por registrarte.',
  'today.thanksSub': 'Notar cómo te sientes ya es un acto de cuidado.',
  'today.trend': 'Tus últimas dos semanas',
  'today.quick.talk.title': 'Hablar',
  'today.quick.talk.desc': 'Cuenta lo que tienes en mente',
  'today.quick.journal.title': 'Diario',
  'today.quick.journal.desc': 'Escribe y reflexiona',
  'today.quick.plan.title': 'Plan diario',
  'today.quick.plan.desc': 'Unos pasos amables',

  'chat.title': 'Hablemos',
  'chat.subtitle': 'Un espacio privado para pensar en voz alta. Aura escucha, no juzga.',
  'chat.empty.title': '¿Cómo estás, de verdad?',
  'chat.empty.sub': 'Di lo que sea. No hay una forma equivocada de empezar.',
  'chat.starter.1': 'Me he sentido abrumado/a últimamente',
  'chat.starter.2': 'No logro apagar mi mente por la noche',
  'chat.starter.3': 'Ayúdame a entender lo que siento',
  'chat.starter.4': 'Quiero sentirme un poco más en calma',
  'chat.placeholder': 'Escribe lo que tienes en mente…',
  'chat.disclaimer':
    'Aura ofrece apoyo, no atención médica ni de crisis. En una emergencia, llama a tu número de emergencias local.',
  'chat.error': 'Estoy teniendo problemas para responder ahora mismo. Inténtalo de nuevo en un momento.',
  'chat.stop': 'Detener',
  'chat.downloadingModel': 'Descargando {{pack}}…',
  'chat.regenerate': 'Generar de nuevo',

  'journal.title': 'Diario',
  'journal.subtitle':
    'Privado por diseño: tus entradas se quedan en tu dispositivo. Aura ofrece una reflexión suave sobre lo que escribes.',
  'journal.prompt.1': '¿Qué ha pesado hoy sobre ti?',
  'journal.prompt.2': 'Nombra algo, por pequeño que sea, que se sintió bien.',
  'journal.prompt.3': '¿Qué le dirías a un amigo que se sintiera como tú?',
  'journal.prompt.4': '¿Qué necesita ahora la parte de ti que está cansada?',
  'journal.placeholder': 'Déjalo salir…',
  'journal.save': 'Guardar y reflexionar',
  'journal.reflecting': 'Aura está reflexionando…',
  'journal.reflects': 'Aura reflexiona',
  'journal.empty': 'Tus entradas aparecerán aquí, las más recientes primero.',

  'routines.title': 'El plan amable de hoy',
  'routines.subtitle':
    'Unas pequeñas acciones amables, según cómo te sientes. Sin presión, solo pasos.',
  'routines.build.title': 'Construyamos hoy juntos',
  'routines.build.sub':
    'Según tu último registro ({{mood}}), Aura sugerirá una rutina suave. ¿Hay algo en lo que te gustaría enfocarte?',
  'routines.focusPlaceholder': 'p. ej. dormir mejor, sentir menos ansiedad…',
  'routines.create': 'Crear mi rutina',
  'routines.progress': '{{done}} de {{total}} hechas — cada una cuenta.',
  'routines.regenerate': 'Regenerar',

  'settings.title': 'Ajustes',
  'settings.subtitle': 'Haz que Aura se sienta tuya. Todo se queda en tu dispositivo.',
  'settings.name.label': '¿Cómo quieres que te llame Aura?',
  'settings.name.placeholder': 'Tu nombre o apodo',
  'settings.language.title': 'Idioma',
  'settings.language.desc':
    'Aura detecta el idioma de tu región automáticamente. Puedes cambiarlo aquí en cualquier momento.',
  'settings.engine.loadingDefault': 'Descargando modelo…',
  'settings.engine.ready': '✓ Listo — Aura funcionará por completo en este dispositivo.',
  'settings.engine.errorPrefix': 'No se pudo cargar el modelo local: ',
  'settings.engine.download': 'Descargar modelo para empezar',
  'settings.packs.gpuRequired':
    'Este navegador no soporta WebGPU, así que Aura no puede generar respuestas de IA aquí — todo funciona en el dispositivo, sin nube. Prueba un Chrome o Edge reciente.',
  'settings.packs.title': 'Elige tu compañera',
  'settings.packs.desc':
    'El tono de Aura cambia según la compañera que elijas — la seguridad y los límites nunca cambian.',
  'settings.packs.calm.name': 'Aura Calma',
  'settings.packs.calm.tagline': 'Tu amiga de siempre: cálida, paciente, sin prisa.',
  'settings.packs.grounded.name': 'Aura Firme',
  'settings.packs.grounded.tagline': 'Directa al grano: un paso concreto, ahora mismo.',
  'settings.packs.reflective.name': 'Aura Reflexiva',
  'settings.packs.reflective.tagline': 'Ritmo lento, preguntas que abren puertas.',
  'settings.packs.download': 'Sin descargar',
  'settings.packs.downloaded': 'Descargado',
  'settings.packs.removeDownload': 'Eliminar descarga',
  'settings.packs.hardwareWarning':
    'Tu dispositivo podría tener poca memoria para la IA local — el modo nube suele ir más fluido.',
  'settings.account.title': 'Cuenta (opcional)',
  'settings.account.desc':
    'Aura funciona igual sin cuenta. Iniciar sesión solo guarda tu nombre y correo en este dispositivo.',
  'settings.account.signOut': 'Cerrar sesión',
  'settings.account.updates': '¿Quieres enterarte de las novedades de Aura de vez en cuando?',
  'settings.account.emailPlaceholder': 'tu@correo.com',
  'settings.account.subscribe': 'Avisarme',
  'settings.account.subscribed': 'Listo — te avisaremos de las novedades.',
  'settings.account.subscribeError': 'No se pudo guardar tu correo. Inténtalo de nuevo.',
  'settings.account.privacyNote':
    'Solo usaremos tu correo para novedades de Aura. Tus conversaciones y tu diario nunca salen de tu dispositivo.',
  'settings.toggle.voice.title': 'Entrada por voz',
  'settings.toggle.voice.desc.ok': 'Muestra un micrófono para hablar en lugar de escribir.',
  'settings.toggle.voice.desc.unsupported': 'No compatible con este navegador (prueba Chrome o Edge).',
  'settings.toggle.tts.title': 'Leer en voz alta',
  'settings.toggle.tts.desc.ok': 'Muestra un botón para que Aura te lea sus respuestas.',
  'settings.toggle.tts.desc.unsupported': 'No compatible con este navegador.',
  'settings.toggle.autoRead.title': 'Leer respuestas automáticamente',
  'settings.toggle.autoRead.desc': 'Haz que Aura lea en voz alta cada respuesta al llegar.',
  'settings.toggle.reduceMotion.title': 'Reducir movimiento',
  'settings.toggle.reduceMotion.desc': 'Calma las animaciones suaves de la app.',
  'settings.privacy':
    'Tus estados de ánimo, diario y rutinas se guardan solo en este navegador; nunca salen de tu dispositivo. Solo el texto que envías activamente a la IA se comparte para generar una respuesta.',
  'settings.danger.title': 'Borrar todos mis datos',
  'settings.danger.desc': 'Elimina todo en este dispositivo. No se puede deshacer.',
  'settings.danger.confirm': '¿Borrar todos tus datos de Aura en este dispositivo? Esto no se puede deshacer.',
  'settings.danger.erase': 'Borrar',

  'crisis.title': 'Mereces apoyo ahora mismo.',
  'crisis.body':
    'Aura es un compañero, no un servicio de crisis. Si podrías estar en peligro o pensando en hacerte daño, por favor contacta a alguien que pueda ayudarte de inmediato: no tienes que llevar esto solo/a.',
  'crisis.call988': 'Llama o escribe al 988 (EE. UU.)',
  'crisis.emergency': 'Emergencias: 911 / 112',
  'crisis.findLine': 'Encuentra una línea cerca de ti',

  'diary.title': 'Diario del día',
  'diary.prompt.1': 'Cuenta un poco cómo fue tu día.',
  'diary.prompt.2': 'Una frase: ¿cómo fue tu día?',
  'diary.prompt.3': '¿Qué es algo de hoy que vale la pena recordar?',
  'diary.prompt.4': '¿Cómo te sientes al terminar el día?',
  'diary.placeholder': 'Solo una línea o dos…',
  'diary.cancel': 'Cancelar',
  'diary.save': 'Guardar hoy',
  'diary.keepStreak': 'Sigue tu racha ({{n}} 🔥)',

  'mic.speak': 'Habla en lugar de escribir',
  'mic.stop': 'Dejar de escuchar',
  'speak.read': 'Leer en voz alta',
  'speak.stop': 'Dejar de leer',
}

const en: Dict = {
  'nav.today': 'Today',
  'nav.talk': 'Talk',
  'nav.journal': 'Journal',
  'nav.plan': 'Plan',
  'nav.settings': 'Settings',

  'welcome.title': 'Welcome to Aura',
  'welcome.desc':
    'A calm, private companion for your mind. Everything you write stays on your device. What should Aura call you?',
  'welcome.namePlaceholder': 'Your name (or a nickname)',
  'welcome.begin': 'Begin',
  'welcome.skip': 'Skip for now',
  'welcome.companion.title': 'Choose your companion',
  'welcome.companion.desc':
    "Aura runs entirely on your device. Before anything else, pick who'll be with you — you can change it later any time.",
  'welcome.companion.continue': 'Continue',
  'welcome.companion.hint': 'The download can keep going in the background while you set up the rest.',
  'sidebar.disclaimer': "Aura supports wellbeing but isn't a substitute for professional care.",

  'today.greeting.morning': 'Good morning',
  'today.greeting.afternoon': 'Good afternoon',
  'today.greeting.evening': 'Good evening',
  'today.subtitle': 'How are you arriving today?',
  'today.checkinAgain': 'Want to check in again?',
  'today.checkinFirst': 'Take a breath. How do you feel?',
  'today.face.veryLow': 'Very low',
  'today.face.low': 'Low',
  'today.face.okay': 'Okay',
  'today.face.good': 'Good',
  'today.face.great': 'Great',
  'today.notePlaceholder': 'Anything behind that feeling? (optional)',
  'today.log': 'Log how I feel',
  'today.thanks': 'Thank you for checking in.',
  'today.thanksSub': 'Noticing how you feel is a real act of care.',
  'today.trend': 'Your last two weeks',
  'today.quick.talk.title': 'Talk it through',
  'today.quick.talk.desc': "Say what's on your mind",
  'today.quick.journal.title': 'Journal',
  'today.quick.journal.desc': 'Write & reflect',
  'today.quick.plan.title': 'Daily plan',
  'today.quick.plan.desc': 'A few kind steps',

  'chat.title': 'Talk it through',
  'chat.subtitle': "A private space to think out loud. Aura listens — it doesn't judge.",
  'chat.empty.title': 'How are you, really?',
  'chat.empty.sub': "Say anything. There's no wrong way to begin.",
  'chat.starter.1': "I've been feeling overwhelmed lately",
  'chat.starter.2': "I can't switch my mind off at night",
  'chat.starter.3': "Help me untangle what I'm feeling",
  'chat.starter.4': 'I want to feel a bit calmer',
  'chat.placeholder': "Write what's on your mind…",
  'chat.disclaimer':
    'Aura offers support, not medical or crisis care. In an emergency, call your local emergency number.',
  'chat.error': "I'm having trouble responding just now. Please try again in a moment.",
  'chat.stop': 'Stop',
  'chat.downloadingModel': 'Downloading {{pack}}…',
  'chat.regenerate': 'Regenerate',

  'journal.title': 'Journal',
  'journal.subtitle':
    'Private by design — entries stay on your device. Aura offers a gentle reflection on what you write.',
  'journal.prompt.1': 'What has been sitting heavily on you today?',
  'journal.prompt.2': 'Name one thing, however small, that felt okay.',
  'journal.prompt.3': 'What would you tell a friend who felt like you do?',
  'journal.prompt.4': 'What does the tired part of you need right now?',
  'journal.placeholder': 'Let it out…',
  'journal.save': 'Save & reflect',
  'journal.reflecting': 'Aura is reflecting…',
  'journal.reflects': 'Aura reflects',
  'journal.empty': 'Your entries will appear here, newest first.',

  'routines.title': "Today's gentle plan",
  'routines.subtitle':
    'A few small, kind actions — shaped around how you feel. No pressure, just steps.',
  'routines.build.title': "Let's build today together",
  'routines.build.sub':
    "Based on your latest check-in ({{mood}}), Aura will suggest a soft routine. Anything you'd like to focus on?",
  'routines.focusPlaceholder': 'e.g. sleeping better, feeling less anxious…',
  'routines.create': 'Create my routine',
  'routines.progress': '{{done}} of {{total}} done — every bit counts.',
  'routines.regenerate': 'Regenerate',

  'settings.title': 'Settings',
  'settings.subtitle': 'Make Aura feel like yours. Everything stays on your device.',
  'settings.name.label': 'What should Aura call you?',
  'settings.name.placeholder': 'Your name or nickname',
  'settings.language.title': 'Language',
  'settings.language.desc':
    "Aura detects your region's language automatically. You can change it here any time.",
  'settings.engine.loadingDefault': 'Downloading model…',
  'settings.engine.ready': '✓ Ready — Aura will run fully on this device.',
  'settings.engine.errorPrefix': "Couldn't load the local model: ",
  'settings.engine.download': 'Download model to get started',
  'settings.packs.gpuRequired':
    "This browser doesn't support WebGPU, so Aura can't generate AI replies here — everything runs on-device, no cloud. Try a recent Chrome or Edge.",
  'settings.packs.title': 'Choose your companion',
  'settings.packs.desc':
    "Aura's tone changes with the companion you pick — safety and boundaries never do.",
  'settings.packs.calm.name': 'Aura Calm',
  'settings.packs.calm.tagline': 'Your steady friend: warm, patient, unhurried.',
  'settings.packs.grounded.name': 'Aura Grounded',
  'settings.packs.grounded.tagline': 'Straight to the point: one concrete step, right now.',
  'settings.packs.reflective.name': 'Aura Reflective',
  'settings.packs.reflective.tagline': 'Slow pace, questions that open doors.',
  'settings.packs.download': 'Not downloaded',
  'settings.packs.downloaded': 'Downloaded',
  'settings.packs.removeDownload': 'Remove download',
  'settings.packs.hardwareWarning':
    'Your device may be low on memory for on-device AI — cloud mode usually runs smoother.',
  'settings.account.title': 'Account (optional)',
  'settings.account.desc':
    'Aura works the same without an account. Signing in only stores your name and email on this device.',
  'settings.account.signOut': 'Sign out',
  'settings.account.updates': 'Want to hear about Aura updates once in a while?',
  'settings.account.emailPlaceholder': 'you@email.com',
  'settings.account.subscribe': 'Keep me posted',
  'settings.account.subscribed': "Done — we'll let you know what's new.",
  'settings.account.subscribeError': "Couldn't save your email. Please try again.",
  'settings.account.privacyNote':
    'We only use your email for Aura updates. Your conversations and journal never leave your device.',
  'settings.toggle.voice.title': 'Voice input',
  'settings.toggle.voice.desc.ok': 'Show a microphone to speak instead of typing.',
  'settings.toggle.voice.desc.unsupported': 'Not supported in this browser (try Chrome or Edge).',
  'settings.toggle.tts.title': 'Read aloud',
  'settings.toggle.tts.desc.ok': 'Show a button to have Aura read its replies to you.',
  'settings.toggle.tts.desc.unsupported': 'Not supported in this browser.',
  'settings.toggle.autoRead.title': 'Speak replies automatically',
  'settings.toggle.autoRead.desc': 'Have Aura read each chat reply out loud as it arrives.',
  'settings.toggle.reduceMotion.title': 'Reduce motion',
  'settings.toggle.reduceMotion.desc': 'Calm the gentle animations across the app.',
  'settings.privacy':
    'Your moods, journal, and routines are stored only in this browser — they never leave your device. Only the text you actively send to the AI is shared to generate a reply.',
  'settings.danger.title': 'Clear all my data',
  'settings.danger.desc': "Erase everything on this device. Can't be undone.",
  'settings.danger.confirm': 'Erase all your Aura data on this device? This cannot be undone.',
  'settings.danger.erase': 'Erase',

  'crisis.title': 'You deserve support right now.',
  'crisis.body':
    "Aura is a companion, not a crisis service. If you might be in danger or thinking of harming yourself, please reach out to people who can help immediately — you don't have to carry this alone.",
  'crisis.call988': 'Call or text 988 (US)',
  'crisis.emergency': 'Emergency: 911 / 112',
  'crisis.findLine': 'Find a line near you',

  'diary.title': 'Daily diary',
  'diary.prompt.1': 'Say a little about how today went.',
  'diary.prompt.2': 'One sentence: how was your day?',
  'diary.prompt.3': "What's one thing from today worth remembering?",
  'diary.prompt.4': 'How are you feeling as the day winds down?',
  'diary.placeholder': 'Just a line or two…',
  'diary.cancel': 'Cancel',
  'diary.save': 'Save today',
  'diary.keepStreak': 'Keep the streak going ({{n}} 🔥)',

  'mic.speak': 'Speak instead of typing',
  'mic.stop': 'Stop listening',
  'speak.read': 'Read aloud',
  'speak.stop': 'Stop reading',
}

const fr: Dict = {
  'nav.today': "Aujourd'hui",
  'nav.talk': 'Parler',
  'nav.journal': 'Journal',
  'nav.plan': 'Plan',
  'nav.settings': 'Réglages',

  'welcome.title': 'Bienvenue sur Aura',
  'welcome.desc':
    "Un compagnon calme et privé pour votre esprit. Tout ce que vous écrivez reste sur votre appareil. Comment Aura doit-elle vous appeler ?",
  'welcome.namePlaceholder': 'Votre prénom (ou un surnom)',
  'welcome.begin': 'Commencer',
  'welcome.skip': 'Passer pour l’instant',
  'welcome.companion.title': 'Choisissez votre compagne',
  'welcome.companion.desc':
    "Aura fonctionne entièrement sur votre appareil. Avant tout, choisissez qui vous accompagnera — vous pourrez en changer plus tard.",
  'welcome.companion.continue': 'Continuer',
  'welcome.companion.hint': 'Le téléchargement peut continuer en arrière-plan pendant que vous configurez le reste.',
  'sidebar.disclaimer': "Aura soutient le bien-être, mais ne remplace pas un accompagnement professionnel.",

  'today.greeting.morning': 'Bonjour',
  'today.greeting.afternoon': 'Bon après-midi',
  'today.greeting.evening': 'Bonsoir',
  'today.subtitle': "Comment arrivez-vous aujourd'hui ?",
  'today.checkinAgain': 'Vous voulez faire un nouveau point ?',
  'today.checkinFirst': 'Respirez. Comment vous sentez-vous ?',
  'today.face.veryLow': 'Très mal',
  'today.face.low': 'Mal',
  'today.face.okay': 'Ça va',
  'today.face.good': 'Bien',
  'today.face.great': 'Très bien',
  'today.notePlaceholder': "Y a-t-il quelque chose derrière ce ressenti ? (facultatif)",
  'today.log': 'Enregistrer mon état',
  'today.thanks': "Merci d'avoir fait le point.",
  'today.thanksSub': "Remarquer ce que vous ressentez est déjà un acte de soin.",
  'today.trend': 'Vos deux dernières semaines',
  'today.quick.talk.title': 'En parler',
  'today.quick.talk.desc': 'Dites ce qui vous préoccupe',
  'today.quick.journal.title': 'Journal',
  'today.quick.journal.desc': 'Écrire et réfléchir',
  'today.quick.plan.title': 'Plan du jour',
  'today.quick.plan.desc': 'Quelques gestes doux',

  'chat.title': "Parlons-en",
  'chat.subtitle': "Un espace privé pour réfléchir à voix haute. Aura écoute, sans juger.",
  'chat.empty.title': 'Comment allez-vous, vraiment ?',
  'chat.empty.sub': "Dites ce que vous voulez. Il n'y a pas de mauvaise façon de commencer.",
  'chat.starter.1': 'Je me sens dépassé(e) ces derniers temps',
  'chat.starter.2': "Je n'arrive pas à arrêter de penser la nuit",
  'chat.starter.3': 'Aidez-moi à démêler ce que je ressens',
  'chat.starter.4': 'Je veux me sentir un peu plus calme',
  'chat.placeholder': 'Écrivez ce que vous avez en tête…',
  'chat.disclaimer':
    "Aura offre un soutien, pas une prise en charge médicale ou de crise. En cas d'urgence, appelez votre numéro d'urgence local.",
  'chat.error': "J'ai du mal à répondre pour le moment. Réessayez dans un instant.",
  'chat.stop': 'Arrêter',
  'chat.downloadingModel': 'Téléchargement de {{pack}}…',
  'chat.regenerate': 'Régénérer',

  'journal.title': 'Journal',
  'journal.subtitle':
    'Privé par conception — vos entrées restent sur votre appareil. Aura propose une réflexion douce sur ce que vous écrivez.',
  'journal.prompt.1': "Qu'est-ce qui vous a pesé aujourd'hui ?",
  'journal.prompt.2': 'Nommez une chose, même petite, qui vous a fait du bien.',
  'journal.prompt.3': 'Que diriez-vous à un ami qui ressentait la même chose que vous ?',
  'journal.prompt.4': "De quoi la partie fatiguée de vous a-t-elle besoin maintenant ?",
  'journal.placeholder': 'Laissez sortir ce que vous ressentez…',
  'journal.save': 'Enregistrer et réfléchir',
  'journal.reflecting': 'Aura réfléchit…',
  'journal.reflects': 'Aura réfléchit',
  'journal.empty': "Vos entrées apparaîtront ici, les plus récentes en premier.",

  'routines.title': 'Le plan doux du jour',
  'routines.subtitle':
    "Quelques petites actions bienveillantes, selon ce que vous ressentez. Pas de pression, juste des étapes.",
  'routines.build.title': "Construisons la journée ensemble",
  'routines.build.sub':
    "D'après votre dernier point ({{mood}}), Aura va proposer une routine douce. Sur quoi aimeriez-vous vous concentrer ?",
  'routines.focusPlaceholder': 'ex. mieux dormir, moins d’anxiété…',
  'routines.create': 'Créer ma routine',
  'routines.progress': '{{done}} sur {{total}} faites — chaque geste compte.',
  'routines.regenerate': 'Régénérer',

  'settings.title': 'Réglages',
  'settings.subtitle': 'Faites d’Aura votre compagnon. Tout reste sur votre appareil.',
  'settings.name.label': 'Comment Aura doit-elle vous appeler ?',
  'settings.name.placeholder': 'Votre prénom ou surnom',
  'settings.language.title': 'Langue',
  'settings.language.desc':
    "Aura détecte automatiquement la langue de votre région. Vous pouvez la changer ici à tout moment.",
  'settings.engine.loadingDefault': 'Téléchargement du modèle…',
  'settings.engine.ready': '✓ Prêt — Aura fonctionnera entièrement sur cet appareil.',
  'settings.engine.errorPrefix': "Impossible de charger le modèle local : ",
  'settings.engine.download': 'Télécharger le modèle pour commencer',
  'settings.packs.gpuRequired':
    "Ce navigateur ne prend pas en charge WebGPU, donc Aura ne peut pas générer de réponses ici — tout tourne sur l'appareil, sans cloud. Essayez un Chrome ou Edge récent.",
  'settings.packs.title': 'Choisissez votre compagne',
  'settings.packs.desc':
    "Le ton d'Aura change selon la compagne choisie — la sécurité et les limites, elles, ne changent jamais.",
  'settings.packs.calm.name': 'Aura Calme',
  'settings.packs.calm.tagline': 'Votre amie de toujours : chaleureuse, patiente, sans hâte.',
  'settings.packs.grounded.name': 'Aura Ancrée',
  'settings.packs.grounded.tagline': 'Droit au but : un pas concret, tout de suite.',
  'settings.packs.reflective.name': 'Aura Réflexive',
  'settings.packs.reflective.tagline': 'Rythme lent, des questions qui ouvrent des portes.',
  'settings.packs.download': 'Non téléchargé',
  'settings.packs.downloaded': 'Téléchargé',
  'settings.packs.removeDownload': 'Supprimer le téléchargement',
  'settings.packs.hardwareWarning':
    "Votre appareil pourrait manquer de mémoire pour l'IA locale — le mode cloud est souvent plus fluide.",
  'settings.account.title': 'Compte (facultatif)',
  'settings.account.desc':
    "Aura fonctionne pareil sans compte. La connexion n'enregistre que votre nom et votre e-mail sur cet appareil.",
  'settings.account.signOut': 'Se déconnecter',
  'settings.account.updates': "Envie de recevoir des nouvelles d'Aura de temps en temps ?",
  'settings.account.emailPlaceholder': 'vous@email.com',
  'settings.account.subscribe': 'Me prévenir',
  'settings.account.subscribed': 'C’est noté — nous vous tiendrons au courant.',
  'settings.account.subscribeError': "Impossible d'enregistrer votre e-mail. Réessayez.",
  'settings.account.privacyNote':
    "Votre e-mail ne sert qu'aux nouvelles d'Aura. Vos conversations et votre journal ne quittent jamais votre appareil.",
  'settings.toggle.voice.title': 'Saisie vocale',
  'settings.toggle.voice.desc.ok': "Afficher un micro pour parler au lieu d'écrire.",
  'settings.toggle.voice.desc.unsupported': 'Non pris en charge sur ce navigateur (essayez Chrome ou Edge).',
  'settings.toggle.tts.title': 'Lecture à voix haute',
  'settings.toggle.tts.desc.ok': "Afficher un bouton pour qu'Aura lise ses réponses.",
  'settings.toggle.tts.desc.unsupported': 'Non pris en charge sur ce navigateur.',
  'settings.toggle.autoRead.title': 'Lire les réponses automatiquement',
  'settings.toggle.autoRead.desc': "Faire lire à voix haute chaque réponse d'Aura à son arrivée.",
  'settings.toggle.reduceMotion.title': 'Réduire les animations',
  'settings.toggle.reduceMotion.desc': "Atténuer les animations douces de l'application.",
  'settings.privacy':
    "Vos humeurs, votre journal et vos routines ne sont stockés que dans ce navigateur — ils ne quittent jamais votre appareil. Seul le texte que vous envoyez activement à l'IA est partagé pour générer une réponse.",
  'settings.danger.title': 'Effacer toutes mes données',
  'settings.danger.desc': "Efface tout sur cet appareil. Action irréversible.",
  'settings.danger.confirm': "Effacer toutes vos données Aura sur cet appareil ? Cette action est irréversible.",
  'settings.danger.erase': 'Effacer',

  'crisis.title': 'Vous méritez du soutien, dès maintenant.',
  'crisis.body':
    "Aura est un compagnon, pas un service de crise. Si vous pourriez être en danger ou penser à vous faire du mal, contactez immédiatement quelqu'un qui peut vous aider — vous n'avez pas à porter cela seul(e).",
  'crisis.call988': 'Appelez ou écrivez au 988 (États-Unis)',
  'crisis.emergency': 'Urgences : 15 / 112',
  'crisis.findLine': "Trouver une ligne près de chez vous",

  'diary.title': 'Journal du jour',
  'diary.prompt.1': "Dites un peu comment s'est passée votre journée.",
  'diary.prompt.2': 'Une phrase : comment était votre journée ?',
  'diary.prompt.3': "Quelle est une chose d'aujourd'hui à retenir ?",
  'diary.prompt.4': 'Comment vous sentez-vous en fin de journée ?',
  'diary.placeholder': 'Juste une ligne ou deux…',
  'diary.cancel': 'Annuler',
  'diary.save': "Enregistrer aujourd'hui",
  'diary.keepStreak': 'Continuez votre série ({{n}} 🔥)',

  'mic.speak': "Parler au lieu d'écrire",
  'mic.stop': "Arrêter d'écouter",
  'speak.read': 'Lire à voix haute',
  'speak.stop': 'Arrêter la lecture',
}

const pt: Dict = {
  'nav.today': 'Hoje',
  'nav.talk': 'Conversar',
  'nav.journal': 'Diário',
  'nav.plan': 'Plano',
  'nav.settings': 'Definições',

  'welcome.title': 'Bem-vindo ao Aura',
  'welcome.desc':
    'Um companheiro calmo e privado para a tua mente. Tudo o que escreveres fica no teu dispositivo. Como devo chamar-te?',
  'welcome.namePlaceholder': 'O teu nome (ou uma alcunha)',
  'welcome.begin': 'Começar',
  'welcome.skip': 'Saltar por agora',
  'welcome.companion.title': 'Escolhe a tua companheira',
  'welcome.companion.desc':
    'O Aura funciona inteiramente no teu dispositivo. Antes de mais nada, escolhe quem te vai acompanhar — podes mudar mais tarde.',
  'welcome.companion.continue': 'Continuar',
  'welcome.companion.hint': 'A transferência pode continuar em segundo plano enquanto configuras o resto.',
  'sidebar.disclaimer': 'O Aura apoia o teu bem-estar, mas não substitui o acompanhamento profissional.',

  'today.greeting.morning': 'Bom dia',
  'today.greeting.afternoon': 'Boa tarde',
  'today.greeting.evening': 'Boa noite',
  'today.subtitle': 'Como chegas hoje?',
  'today.checkinAgain': 'Queres registar de novo?',
  'today.checkinFirst': 'Respira. Como te sentes?',
  'today.face.veryLow': 'Muito mal',
  'today.face.low': 'Mal',
  'today.face.okay': 'Mais ou menos',
  'today.face.good': 'Bem',
  'today.face.great': 'Ótimo',
  'today.notePlaceholder': 'Algo por trás desse sentimento? (opcional)',
  'today.log': 'Registar como me sinto',
  'today.thanks': 'Obrigado por te registares.',
  'today.thanksSub': 'Reparar em como te sentes já é um ato de cuidado.',
  'today.trend': 'As tuas últimas duas semanas',
  'today.quick.talk.title': 'Conversar',
  'today.quick.talk.desc': 'Diz o que tens em mente',
  'today.quick.journal.title': 'Diário',
  'today.quick.journal.desc': 'Escreve e reflete',
  'today.quick.plan.title': 'Plano diário',
  'today.quick.plan.desc': 'Alguns passos gentis',

  'chat.title': 'Vamos conversar',
  'chat.subtitle': 'Um espaço privado para pensar em voz alta. O Aura escuta — não julga.',
  'chat.empty.title': 'Como estás, realmente?',
  'chat.empty.sub': 'Diz o que quiseres. Não há uma forma errada de começar.',
  'chat.starter.1': 'Tenho-me sentido sobrecarregado/a ultimamente',
  'chat.starter.2': 'Não consigo desligar a mente à noite',
  'chat.starter.3': 'Ajuda-me a perceber o que sinto',
  'chat.starter.4': 'Quero sentir-me um pouco mais calmo/a',
  'chat.placeholder': 'Escreve o que tens em mente…',
  'chat.disclaimer':
    'O Aura oferece apoio, não cuidados médicos ou de crise. Em caso de emergência, liga para o teu número de emergência local.',
  'chat.error': 'Estou com dificuldade em responder agora. Tenta novamente daqui a pouco.',
  'chat.stop': 'Parar',
  'chat.downloadingModel': 'A transferir {{pack}}…',
  'chat.regenerate': 'Gerar de novo',

  'journal.title': 'Diário',
  'journal.subtitle':
    'Privado por natureza — as entradas ficam no teu dispositivo. O Aura oferece uma reflexão suave sobre o que escreves.',
  'journal.prompt.1': 'O que pesou sobre ti hoje?',
  'journal.prompt.2': 'Nomeia uma coisa, por pequena que seja, que correu bem.',
  'journal.prompt.3': 'O que dirias a um amigo que se sentisse como tu?',
  'journal.prompt.4': 'Do que a parte cansada de ti precisa agora?',
  'journal.placeholder': 'Deixa sair…',
  'journal.save': 'Guardar e refletir',
  'journal.reflecting': 'O Aura está a refletir…',
  'journal.reflects': 'O Aura reflete',
  'journal.empty': 'As tuas entradas vão aparecer aqui, as mais recentes primeiro.',

  'routines.title': 'O plano gentil de hoje',
  'routines.subtitle': 'Algumas pequenas ações gentis, moldadas ao que sentes. Sem pressão, só passos.',
  'routines.build.title': 'Vamos construir o dia juntos',
  'routines.build.sub':
    'Com base no teu último registo ({{mood}}), o Aura vai sugerir uma rotina suave. Há algo em que gostarias de te focar?',
  'routines.focusPlaceholder': 'ex. dormir melhor, sentir menos ansiedade…',
  'routines.create': 'Criar a minha rotina',
  'routines.progress': '{{done}} de {{total}} feitas — cada uma conta.',
  'routines.regenerate': 'Regenerar',

  'settings.title': 'Definições',
  'settings.subtitle': 'Faz do Aura algo teu. Tudo fica no teu dispositivo.',
  'settings.name.label': 'Como deve o Aura chamar-te?',
  'settings.name.placeholder': 'O teu nome ou alcunha',
  'settings.language.title': 'Idioma',
  'settings.language.desc':
    'O Aura deteta automaticamente o idioma da tua região. Podes alterá-lo aqui a qualquer momento.',
  'settings.engine.loadingDefault': 'A transferir o modelo…',
  'settings.engine.ready': '✓ Pronto — o Aura vai correr inteiramente neste dispositivo.',
  'settings.engine.errorPrefix': 'Não foi possível carregar o modelo local: ',
  'settings.engine.download': 'Transferir modelo para começar',
  'settings.packs.gpuRequired':
    'Este navegador não suporta WebGPU, por isso o Aura não consegue gerar respostas aqui — tudo corre no dispositivo, sem nuvem. Experimenta um Chrome ou Edge recente.',
  'settings.packs.title': 'Escolhe a tua companheira',
  'settings.packs.desc':
    'O tom da Aura muda consoante a companheira escolhida — a segurança e os limites nunca mudam.',
  'settings.packs.calm.name': 'Aura Calma',
  'settings.packs.calm.tagline': 'A tua amiga de sempre: calorosa, paciente, sem pressa.',
  'settings.packs.grounded.name': 'Aura Firme',
  'settings.packs.grounded.tagline': 'Direto ao ponto: um passo concreto, agora mesmo.',
  'settings.packs.reflective.name': 'Aura Reflexiva',
  'settings.packs.reflective.tagline': 'Ritmo lento, perguntas que abrem portas.',
  'settings.packs.download': 'Não transferido',
  'settings.packs.downloaded': 'Transferido',
  'settings.packs.removeDownload': 'Remover transferência',
  'settings.packs.hardwareWarning':
    'O teu dispositivo pode ter pouca memória para IA local — o modo nuvem costuma ser mais fluido.',
  'settings.account.title': 'Conta (opcional)',
  'settings.account.desc':
    'O Aura funciona igual sem conta. Iniciar sessão só guarda o teu nome e e-mail neste dispositivo.',
  'settings.account.signOut': 'Terminar sessão',
  'settings.account.updates': 'Queres saber das novidades do Aura de vez em quando?',
  'settings.account.emailPlaceholder': 'tu@email.com',
  'settings.account.subscribe': 'Avisar-me',
  'settings.account.subscribed': 'Feito — vamos avisar-te das novidades.',
  'settings.account.subscribeError': 'Não foi possível guardar o teu e-mail. Tenta novamente.',
  'settings.account.privacyNote':
    'Só usamos o teu e-mail para novidades do Aura. As tuas conversas e o teu diário nunca saem do teu dispositivo.',
  'settings.toggle.voice.title': 'Entrada por voz',
  'settings.toggle.voice.desc.ok': 'Mostra um microfone para falares em vez de escreveres.',
  'settings.toggle.voice.desc.unsupported': 'Não suportado neste navegador (experimenta Chrome ou Edge).',
  'settings.toggle.tts.title': 'Ler em voz alta',
  'settings.toggle.tts.desc.ok': 'Mostra um botão para o Aura ler as respostas.',
  'settings.toggle.tts.desc.unsupported': 'Não suportado neste navegador.',
  'settings.toggle.autoRead.title': 'Ler respostas automaticamente',
  'settings.toggle.autoRead.desc': 'Faz o Aura ler em voz alta cada resposta assim que chega.',
  'settings.toggle.reduceMotion.title': 'Reduzir movimento',
  'settings.toggle.reduceMotion.desc': 'Acalma as animações suaves da app.',
  'settings.privacy':
    'Os teus estados de espírito, diário e rotinas ficam guardados apenas neste navegador — nunca saem do teu dispositivo. Só o texto que envias ativamente à IA é partilhado para gerar uma resposta.',
  'settings.danger.title': 'Apagar todos os meus dados',
  'settings.danger.desc': 'Apaga tudo neste dispositivo. Não pode ser desfeito.',
  'settings.danger.confirm': 'Apagar todos os teus dados do Aura neste dispositivo? Isto não pode ser desfeito.',
  'settings.danger.erase': 'Apagar',

  'crisis.title': 'Mereces apoio agora mesmo.',
  'crisis.body':
    'O Aura é um companheiro, não um serviço de crise. Se puderes estar em perigo ou a pensar em magoar-te, por favor contacta alguém que te possa ajudar imediatamente — não precisas de carregar isto sozinho/a.',
  'crisis.call988': 'Liga ou envia mensagem para o 988 (EUA)',
  'crisis.emergency': 'Emergência: 112',
  'crisis.findLine': 'Encontra uma linha perto de ti',

  'diary.title': 'Diário do dia',
  'diary.prompt.1': 'Diz um pouco como foi o teu dia.',
  'diary.prompt.2': 'Uma frase: como foi o teu dia?',
  'diary.prompt.3': 'Qual é uma coisa de hoje que vale a pena lembrar?',
  'diary.prompt.4': 'Como te sentes ao terminar o dia?',
  'diary.placeholder': 'Só uma linha ou duas…',
  'diary.cancel': 'Cancelar',
  'diary.save': 'Guardar hoje',
  'diary.keepStreak': 'Continua a tua sequência ({{n}} 🔥)',

  'mic.speak': 'Fala em vez de escrever',
  'mic.stop': 'Parar de ouvir',
  'speak.read': 'Ler em voz alta',
  'speak.stop': 'Parar de ler',
}

const de: Dict = {
  'nav.today': 'Heute',
  'nav.talk': 'Reden',
  'nav.journal': 'Tagebuch',
  'nav.plan': 'Plan',
  'nav.settings': 'Einstellungen',

  'welcome.title': 'Willkommen bei Aura',
  'welcome.desc':
    'Ein ruhiger, privater Begleiter für deinen Geist. Alles, was du schreibst, bleibt auf deinem Gerät. Wie soll Aura dich nennen?',
  'welcome.namePlaceholder': 'Dein Name (oder ein Spitzname)',
  'welcome.begin': 'Loslegen',
  'welcome.skip': 'Vorerst überspringen',
  'welcome.companion.title': 'Wähle deine Begleiterin',
  'welcome.companion.desc':
    'Aura läuft vollständig auf deinem Gerät. Wähle zuerst, wer dich begleiten soll — du kannst das später jederzeit ändern.',
  'welcome.companion.continue': 'Weiter',
  'welcome.companion.hint': 'Der Download kann im Hintergrund weiterlaufen, während du den Rest einrichtest.',
  'sidebar.disclaimer': 'Aura unterstützt dein Wohlbefinden, ersetzt aber keine professionelle Betreuung.',

  'today.greeting.morning': 'Guten Morgen',
  'today.greeting.afternoon': 'Guten Tag',
  'today.greeting.evening': 'Guten Abend',
  'today.subtitle': 'Wie kommst du heute an?',
  'today.checkinAgain': 'Möchtest du dich erneut eintragen?',
  'today.checkinFirst': 'Atme durch. Wie fühlst du dich?',
  'today.face.veryLow': 'Sehr schlecht',
  'today.face.low': 'Schlecht',
  'today.face.okay': 'Geht so',
  'today.face.good': 'Gut',
  'today.face.great': 'Sehr gut',
  'today.notePlaceholder': 'Steckt etwas hinter diesem Gefühl? (optional)',
  'today.log': 'Gefühl eintragen',
  'today.thanks': 'Danke, dass du dich eingetragen hast.',
  'today.thanksSub': 'Zu bemerken, wie du dich fühlst, ist schon ein echter Akt der Fürsorge.',
  'today.trend': 'Deine letzten zwei Wochen',
  'today.quick.talk.title': 'Darüber reden',
  'today.quick.talk.desc': 'Sag, was dich beschäftigt',
  'today.quick.journal.title': 'Tagebuch',
  'today.quick.journal.desc': 'Schreiben & reflektieren',
  'today.quick.plan.title': 'Tagesplan',
  'today.quick.plan.desc': 'Ein paar sanfte Schritte',

  'chat.title': 'Lass uns reden',
  'chat.subtitle': 'Ein privater Ort, um laut zu denken. Aura hört zu — ohne zu urteilen.',
  'chat.empty.title': 'Wie geht es dir wirklich?',
  'chat.empty.sub': 'Sag einfach, was du willst. Es gibt keinen falschen Anfang.',
  'chat.starter.1': 'Ich fühle mich in letzter Zeit überfordert',
  'chat.starter.2': 'Ich kann meinen Kopf nachts nicht abschalten',
  'chat.starter.3': 'Hilf mir, meine Gefühle zu entwirren',
  'chat.starter.4': 'Ich möchte mich etwas ruhiger fühlen',
  'chat.placeholder': 'Schreib, was dich beschäftigt…',
  'chat.disclaimer':
    'Aura bietet Unterstützung, keine medizinische oder Krisenversorgung. Wähle im Notfall deine lokale Notrufnummer.',
  'chat.error': 'Ich habe gerade Schwierigkeiten zu antworten. Bitte versuch es gleich noch einmal.',
  'chat.stop': 'Stopp',
  'chat.downloadingModel': '{{pack}} wird heruntergeladen…',
  'chat.regenerate': 'Neu generieren',

  'journal.title': 'Tagebuch',
  'journal.subtitle':
    'Von Natur aus privat — Einträge bleiben auf deinem Gerät. Aura bietet eine sanfte Reflexion zu dem, was du schreibst.',
  'journal.prompt.1': 'Was hat heute schwer auf dir gelastet?',
  'journal.prompt.2': 'Nenne eine Sache, so klein sie auch war, die sich gut angefühlt hat.',
  'journal.prompt.3': 'Was würdest du einer Freundin sagen, die sich so fühlt wie du?',
  'journal.prompt.4': 'Was braucht der müde Teil von dir gerade jetzt?',
  'journal.placeholder': 'Lass es raus…',
  'journal.save': 'Speichern & reflektieren',
  'journal.reflecting': 'Aura reflektiert gerade…',
  'journal.reflects': 'Aura reflektiert',
  'journal.empty': 'Deine Einträge erscheinen hier, neueste zuerst.',

  'routines.title': 'Der sanfte Plan für heute',
  'routines.subtitle': 'Ein paar kleine, freundliche Handlungen — passend zu deinem Gefühl. Kein Druck, nur Schritte.',
  'routines.build.title': 'Lass uns den Tag gemeinsam gestalten',
  'routines.build.sub':
    'Basierend auf deinem letzten Eintrag ({{mood}}) schlägt Aura eine sanfte Routine vor. Worauf möchtest du dich konzentrieren?',
  'routines.focusPlaceholder': 'z. B. besser schlafen, weniger Angst…',
  'routines.create': 'Meine Routine erstellen',
  'routines.progress': '{{done}} von {{total}} erledigt — jeder Schritt zählt.',
  'routines.regenerate': 'Neu generieren',

  'settings.title': 'Einstellungen',
  'settings.subtitle': 'Mach Aura zu deinem eigenen. Alles bleibt auf deinem Gerät.',
  'settings.name.label': 'Wie soll Aura dich nennen?',
  'settings.name.placeholder': 'Dein Name oder Spitzname',
  'settings.language.title': 'Sprache',
  'settings.language.desc':
    'Aura erkennt die Sprache deiner Region automatisch. Du kannst sie hier jederzeit ändern.',
  'settings.engine.loadingDefault': 'Modell wird heruntergeladen…',
  'settings.engine.ready': '✓ Bereit — Aura läuft vollständig auf diesem Gerät.',
  'settings.engine.errorPrefix': 'Lokales Modell konnte nicht geladen werden: ',
  'settings.engine.download': 'Modell herunterladen, um zu starten',
  'settings.packs.gpuRequired':
    'Dieser Browser unterstützt kein WebGPU, daher kann Aura hier keine KI-Antworten erzeugen — alles läuft auf dem Gerät, ohne Cloud. Probiere einen aktuellen Chrome oder Edge.',
  'settings.packs.title': 'Wähle deine Begleiterin',
  'settings.packs.desc':
    'Auras Ton ändert sich je nach gewählter Begleiterin — Sicherheit und Grenzen bleiben immer gleich.',
  'settings.packs.calm.name': 'Aura Ruhig',
  'settings.packs.calm.tagline': 'Deine verlässliche Freundin: warm, geduldig, ohne Eile.',
  'settings.packs.grounded.name': 'Aura Bodenständig',
  'settings.packs.grounded.tagline': 'Auf den Punkt: ein konkreter Schritt, genau jetzt.',
  'settings.packs.reflective.name': 'Aura Reflektierend',
  'settings.packs.reflective.tagline': 'Langsames Tempo, Fragen, die Türen öffnen.',
  'settings.packs.download': 'Nicht heruntergeladen',
  'settings.packs.downloaded': 'Heruntergeladen',
  'settings.packs.removeDownload': 'Download entfernen',
  'settings.packs.hardwareWarning':
    'Dein Gerät hat möglicherweise wenig Speicher für lokale KI — der Cloud-Modus läuft meist flüssiger.',
  'settings.account.title': 'Konto (optional)',
  'settings.account.desc':
    'Aura funktioniert ohne Konto genauso. Die Anmeldung speichert nur Namen und E-Mail auf diesem Gerät.',
  'settings.account.signOut': 'Abmelden',
  'settings.account.updates': 'Möchtest du ab und zu Neuigkeiten von Aura erfahren?',
  'settings.account.emailPlaceholder': 'du@email.com',
  'settings.account.subscribe': 'Benachrichtige mich',
  'settings.account.subscribed': 'Erledigt — wir melden uns bei Neuigkeiten.',
  'settings.account.subscribeError': 'E-Mail konnte nicht gespeichert werden. Bitte erneut versuchen.',
  'settings.account.privacyNote':
    'Deine E-Mail nutzen wir nur für Aura-Neuigkeiten. Deine Gespräche und dein Tagebuch verlassen nie dein Gerät.',
  'settings.toggle.voice.title': 'Spracheingabe',
  'settings.toggle.voice.desc.ok': 'Zeigt ein Mikrofon, um zu sprechen statt zu tippen.',
  'settings.toggle.voice.desc.unsupported': 'In diesem Browser nicht unterstützt (probiere Chrome oder Edge).',
  'settings.toggle.tts.title': 'Vorlesen',
  'settings.toggle.tts.desc.ok': 'Zeigt einen Button, damit Aura ihre Antworten vorliest.',
  'settings.toggle.tts.desc.unsupported': 'In diesem Browser nicht unterstützt.',
  'settings.toggle.autoRead.title': 'Antworten automatisch vorlesen',
  'settings.toggle.autoRead.desc': 'Lässt Aura jede Chat-Antwort sofort beim Eintreffen vorlesen.',
  'settings.toggle.reduceMotion.title': 'Bewegung reduzieren',
  'settings.toggle.reduceMotion.desc': 'Beruhigt die sanften Animationen der App.',
  'settings.privacy':
    'Deine Stimmungen, dein Tagebuch und deine Routinen werden nur in diesem Browser gespeichert — sie verlassen dein Gerät nie. Nur der Text, den du aktiv an die KI sendest, wird geteilt, um eine Antwort zu erzeugen.',
  'settings.danger.title': 'Alle meine Daten löschen',
  'settings.danger.desc': 'Löscht alles auf diesem Gerät. Kann nicht rückgängig gemacht werden.',
  'settings.danger.confirm': 'Alle deine Aura-Daten auf diesem Gerät löschen? Das kann nicht rückgängig gemacht werden.',
  'settings.danger.erase': 'Löschen',

  'crisis.title': 'Du verdienst jetzt sofort Unterstützung.',
  'crisis.body':
    'Aura ist ein Begleiter, kein Krisendienst. Wenn du in Gefahr sein könntest oder daran denkst, dir selbst zu schaden, wende dich bitte sofort an jemanden, der dir helfen kann — du musst das nicht allein tragen.',
  'crisis.call988': 'Ruf 988 an oder schreib eine SMS (USA)',
  'crisis.emergency': 'Notruf: 112',
  'crisis.findLine': 'Finde eine Hotline in deiner Nähe',

  'diary.title': 'Tages-Tagebuch',
  'diary.prompt.1': 'Erzähl kurz, wie dein Tag war.',
  'diary.prompt.2': 'Ein Satz: Wie war dein Tag?',
  'diary.prompt.3': 'Was ist eine Sache von heute, die es wert ist, sich zu merken?',
  'diary.prompt.4': 'Wie fühlst du dich zum Ende des Tages?',
  'diary.placeholder': 'Nur eine Zeile oder zwei…',
  'diary.cancel': 'Abbrechen',
  'diary.save': 'Heute speichern',
  'diary.keepStreak': 'Bleib an deiner Serie dran ({{n}} 🔥)',

  'mic.speak': 'Sprechen statt tippen',
  'mic.stop': 'Zuhören beenden',
  'speak.read': 'Vorlesen',
  'speak.stop': 'Vorlesen stoppen',
}

const DICT: Record<Lang, Dict> = { es, en, fr, pt, de }

// ---- Context / hooks -------------------------------------------------------
type LangCtx = {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string, vars?: Record<string, string | number>) => string
  localeTag: string
}

const LangContext = createContext<LangCtx | null>(null)

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = usePersistentState<Lang>('aura.lang', detectLang())

  const value = useMemo<LangCtx>(() => {
    const t = (key: string, vars?: Record<string, string | number>) => {
      let str = DICT[lang]?.[key] ?? DICT[DEFAULT_LANG][key] ?? key
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.split(`{{${k}}}`).join(String(v))
        }
      }
      return str
    }
    return { lang, setLang, t, localeTag: localeTagFor(lang) }
  }, [lang, setLang])

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used within a LangProvider')
  return ctx
}

export const LANG_LABELS: Record<Lang, string> = {
  es: 'Español',
  en: 'English',
  fr: 'Français',
  pt: 'Português',
  de: 'Deutsch',
}
