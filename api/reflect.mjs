// Vercel serverless function — mirrors the /api/reflect route in
// server/index.mjs (the local Express dev server).
import Anthropic from '@anthropic-ai/sdk'
import {
  CRISIS_GUIDANCE,
  DEFAULT_LANG,
  REFLECT_SYSTEM,
  detectCrisis,
  isSupportedLang,
  languageDirective,
} from './_shared/prompts.mjs'
import { mockReflection } from './_shared/demoContent.mjs'

const MODEL = 'claude-opus-4-8'

function resolveLang(body) {
  return isSupportedLang(body?.lang) ? body.lang : DEFAULT_LANG
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { entry = '', mood = '' } = req.body || {}
  const lang = resolveLang(req.body)
  const crisis = detectCrisis(entry)

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      res.json({ reflection: mockReflection(crisis, lang), crisis })
      return
    }
    const client = new Anthropic()
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      thinking: { type: 'adaptive' },
      system: REFLECT_SYSTEM + languageDirective(lang) + (crisis ? CRISIS_GUIDANCE : ''),
      messages: [
        { role: 'user', content: `Mood: ${mood || 'unspecified'}\n\nJournal entry:\n${entry}` },
      ],
    })
    const reflection = msg.content.find((b) => b.type === 'text')?.text || ''
    res.json({ reflection, crisis })
  } catch (err) {
    console.error('reflect error:', err?.message || err)
    res.json({ reflection: mockReflection(crisis, lang), crisis })
  }
}
