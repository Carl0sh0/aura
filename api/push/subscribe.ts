// Stores/removes a daily-reminder push subscription. Deliberately anonymous:
// the client generates a random `pushId` locally (src/lib/push.ts) — there is
// no account, email, or name attached here, just "this browser wants a daily
// nudge at this local time." See api/push/send-reminders.ts for the sender.
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { redis } from '../_lib/redis.js'

const ALL_KEY = 'push:all'

type SubscribeBody = {
  pushId: string
  subscription: unknown
  hour: number
  minute: number
  tz: string
  lang: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    const body = req.body as Partial<SubscribeBody>
    if (
      !body?.pushId ||
      !body.subscription ||
      typeof body.hour !== 'number' ||
      typeof body.minute !== 'number' ||
      !body.tz
    ) {
      res.status(400).json({ error: 'invalid body' })
      return
    }
    const record = {
      subscription: body.subscription,
      hour: body.hour,
      minute: body.minute,
      tz: body.tz,
      lang: body.lang || 'es',
      lastSentDate: null as string | null,
    }
    await redis().set(`push:${body.pushId}`, JSON.stringify(record))
    await redis().sadd(ALL_KEY, body.pushId)
    res.status(200).json({ ok: true })
    return
  }

  if (req.method === 'DELETE') {
    const pushId = (req.body as { pushId?: string })?.pushId || (req.query.pushId as string)
    if (!pushId) {
      res.status(400).json({ error: 'missing pushId' })
      return
    }
    await redis().del(`push:${pushId}`)
    await redis().srem(ALL_KEY, pushId)
    res.status(200).json({ ok: true })
    return
  }

  res.status(405).json({ error: 'method not allowed' })
}
