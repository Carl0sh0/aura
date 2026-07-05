// Vercel serverless function — mirrors the /api/chat route in server/index.mjs
// (the local Express dev server). Same prompts, same safety layer, same demo
// fallback; this is just the production entry point Vercel actually calls.
import Anthropic from '@anthropic-ai/sdk'
import {
  DEFAULT_LANG,
  buildSystem,
  detectCrisis,
  isSupportedLang,
  languageDirective,
} from './_shared/prompts.mjs'
import { mockStream } from './_shared/demoContent.mjs'
import { CHARACTER_PACKS, DEFAULT_PACK_ID } from './_shared/characterPacks.mjs'

const MODEL = 'claude-opus-4-8'

function resolveLang(body) {
  return isSupportedLang(body?.lang) ? body.lang : DEFAULT_LANG
}

// Never trust free-text system-prompt content from the client — only a known packId,
// looked up against our own catalog. Unknown/missing ids fall back to the default pack.
function resolvePack(body) {
  return CHARACTER_PACKS[body?.packId] ?? CHARACTER_PACKS[DEFAULT_PACK_ID]
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { messages = [], context = '' } = req.body || {}
  const lang = resolveLang(req.body)
  const pack = resolvePack(req.body)
  const last = [...messages].reverse().find((m) => m.role === 'user')
  const crisis = detectCrisis(last?.content || '')

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('X-Aura-Crisis', crisis ? '1' : '0')
  res.setHeader('Cache-Control', 'no-cache')

  const hasKey = !!process.env.ANTHROPIC_API_KEY
  const system = buildSystem(context, crisis, pack.personaVoice) + languageDirective(lang)
  const clean = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: String(m.content || '') }))

  try {
    if (!hasKey) {
      await mockStream(res, crisis, lang)
      return
    }
    const client = new Anthropic()
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 1024,
      thinking: { type: 'adaptive' },
      system,
      messages: clean,
    })
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        res.write(event.delta.text)
      }
    }
    res.end()
  } catch (err) {
    console.error('chat error:', err?.message || err)
    if (!res.headersSent) res.status(200)
    await mockStream(res, crisis, lang)
  }
}
