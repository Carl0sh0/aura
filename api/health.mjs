const MODEL = 'claude-opus-4-8'

export default function handler(_req, res) {
  const hasKey = !!process.env.ANTHROPIC_API_KEY
  res.json({ ok: true, mode: hasKey ? 'live' : 'demo', model: MODEL })
}
