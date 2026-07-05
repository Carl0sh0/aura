// Vercel serverless function — mirrors the /api/routine route in
// server/index.mjs (the local Express dev server).
import Anthropic from '@anthropic-ai/sdk'
import {
  DEFAULT_LANG,
  ROUTINE_SYSTEM,
  isSupportedLang,
  languageDirective,
} from './_shared/prompts.mjs'
import { mockRoutine, safeParseRoutine } from './_shared/demoContent.mjs'

const MODEL = 'claude-opus-4-8'

function resolveLang(body) {
  return isSupportedLang(body?.lang) ? body.lang : DEFAULT_LANG
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { mood = '', focus = '' } = req.body || {}
  const lang = resolveLang(req.body)

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      res.json(mockRoutine(lang))
      return
    }
    const client = new Anthropic()
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 700,
      thinking: { type: 'adaptive' },
      system: ROUTINE_SYSTEM + languageDirective(lang),
      messages: [
        {
          role: 'user',
          content: `Today I feel: ${mood || 'okay'}. I'd like to focus on: ${
            focus || 'feeling a bit steadier'
          }.`,
        },
      ],
    })
    const text = msg.content.find((b) => b.type === 'text')?.text || '{}'
    res.json(safeParseRoutine(text, lang))
  } catch (err) {
    console.error('routine error:', err?.message || err)
    res.json(mockRoutine(lang))
  }
}
