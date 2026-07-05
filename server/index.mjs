// =====================================================================
// Aura backend — a thin, safety-first proxy to the Claude API.
// The API key lives here, never in the browser. Journal/mood data is
// NOT stored here; only the text the user actively sends is forwarded.
//
// This is the local-dev runtime (Express). The same request logic is
// mirrored for production in /api/*.mjs (Vercel serverless functions) —
// both import their prompts and demo content from src/lib/.
// =====================================================================
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'
import {
  CRISIS_GUIDANCE,
  DEFAULT_LANG,
  REFLECT_SYSTEM,
  ROUTINE_SYSTEM,
  buildSystem,
  detectCrisis,
  isSupportedLang,
  languageDirective,
} from '../src/lib/prompts.ts'
import { mockRoutine, mockReflection, mockStream, safeParseRoutine } from '../src/lib/demoContent.ts'
import { CHARACTER_PACKS, DEFAULT_PACK_ID } from '../src/lib/characterPacks.ts'

const PORT = process.env.PORT || 8787
const MODEL = 'claude-opus-4-8'
const hasKey = !!process.env.ANTHROPIC_API_KEY
const client = hasKey ? new Anthropic() : null

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

console.log(
  hasKey
    ? '\x1b[32m✓ Claude API key found — Aura is using real Claude (%s).\x1b[0m'
    : '\x1b[33m! No ANTHROPIC_API_KEY — Aura is running in DEMO mode (mock replies). Add a key to .env to go live.\x1b[0m',
  hasKey ? MODEL : '',
)

function resolveLang(body) {
  return isSupportedLang(body?.lang) ? body.lang : DEFAULT_LANG
}

// Never trust free-text system-prompt content from the client — only a known packId,
// looked up against our own catalog. Unknown/missing ids fall back to the default pack.
function resolvePack(body) {
  return CHARACTER_PACKS[body?.packId] ?? CHARACTER_PACKS[DEFAULT_PACK_ID]
}

// ---- /api/chat : streaming conversation ----------------------------------
app.post('/api/chat', async (req, res) => {
  const { messages = [], context = '' } = req.body || {}
  const lang = resolveLang(req.body)
  const pack = resolvePack(req.body)
  const last = [...messages].reverse().find((m) => m.role === 'user')
  const crisis = detectCrisis(last?.content || '')

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('X-Aura-Crisis', crisis ? '1' : '0')
  res.setHeader('Cache-Control', 'no-cache')

  const system = buildSystem(context, crisis, pack.personaVoice) + languageDirective(lang)
  const clean = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: String(m.content || '') }))

  try {
    if (!client) {
      await mockStream(res, crisis, lang)
      return
    }
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 1024,
      thinking: { type: 'adaptive' },
      system,
      messages: clean,
    })
    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        res.write(event.delta.text)
      }
    }
    res.end()
  } catch (err) {
    console.error('chat error:', err?.message || err)
    if (!res.headersSent) res.status(200)
    await mockStream(res, crisis, lang)
  }
})

// ---- /api/reflect : short reflection on a journal entry ------------------
app.post('/api/reflect', async (req, res) => {
  const { entry = '', mood = '' } = req.body || {}
  const lang = resolveLang(req.body)
  const crisis = detectCrisis(entry)
  try {
    if (!client) {
      return res.json({ reflection: mockReflection(crisis, lang), crisis })
    }
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      thinking: { type: 'adaptive' },
      system: REFLECT_SYSTEM + languageDirective(lang) + (crisis ? CRISIS_GUIDANCE : ''),
      messages: [
        {
          role: 'user',
          content: `Mood: ${mood || 'unspecified'}\n\nJournal entry:\n${entry}`,
        },
      ],
    })
    const reflection = msg.content.find((b) => b.type === 'text')?.text || ''
    res.json({ reflection, crisis })
  } catch (err) {
    console.error('reflect error:', err?.message || err)
    res.json({ reflection: mockReflection(crisis, lang), crisis })
  }
})

// ---- /api/routine : generate a gentle daily routine (JSON) ---------------
app.post('/api/routine', async (req, res) => {
  const { mood = '', focus = '' } = req.body || {}
  const lang = resolveLang(req.body)
  try {
    if (!client) return res.json(mockRoutine(lang))
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
})

app.get('/api/health', (_req, res) =>
  res.json({ ok: true, mode: hasKey ? 'live' : 'demo', model: MODEL }),
)

app.listen(PORT, () =>
  console.log(`\x1b[36mAura API listening on http://localhost:${PORT}\x1b[0m`),
)
