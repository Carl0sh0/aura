// Sends the daily reminder push to whoever's local time falls in the current
// run window. Triggered by a GitHub Actions cron every 15 minutes (see
// .github/workflows/push-reminders.yml) rather than Vercel's own Cron Jobs,
// which are capped at ~once/day on the Hobby plan — too coarse to respect an
// individually-chosen reminder time. Never touches app content: the
// notification text is generic and picked only by the subscriber's UI
// language, never their name or anything they've written in Aura.
import type { VercelRequest, VercelResponse } from '@vercel/node'
import webpush from 'web-push'
import { redis } from '../_lib/redis.js'

const ALL_KEY = 'push:all'

const REMINDER_TEXT: Record<string, { title: string; body: string }> = {
  es: { title: 'Aura', body: '¿Cómo te sientes hoy? Tu compañero te está esperando.' },
  en: { title: 'Aura', body: 'How are you feeling today? Your companion is here.' },
  fr: { title: 'Aura', body: "Comment te sens-tu aujourd'hui ? Ton compagnon t'attend." },
  pt: { title: 'Aura', body: 'Como te sentes hoje? O teu companheiro está à espera.' },
  de: { title: 'Aura', body: 'Wie fühlst du dich heute? Dein Begleiter wartet auf dich.' },
}

type PushRecord = {
  subscription: webpush.PushSubscription
  hour: number
  minute: number
  tz: string
  lang: string
  lastSentDate: string | null
}

function minutesSinceMidnight(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? '0') % 24
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')
  return h * 60 + m
}

function localDateKey(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

// Is the target minute-of-day within the last RUN_WINDOW_MIN minutes, ending now?
const RUN_WINDOW_MIN = 15
function isDue(nowMinutes: number, targetMinutes: number): boolean {
  const diff = (nowMinutes - targetMinutes + 1440) % 1440
  return diff < RUN_WINDOW_MIN
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' })
    return
  }
  const auth = req.headers.authorization
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(403).json({ error: 'forbidden' })
    return
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:hello@example.com',
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )

  const now = new Date()
  const ids = await redis().smembers(ALL_KEY)
  let sent = 0
  let pruned = 0

  for (const id of ids) {
    const raw = await redis().get<string | PushRecord>(`push:${id}`)
    if (!raw) {
      await redis().srem(ALL_KEY, id)
      continue
    }
    const record: PushRecord = typeof raw === 'string' ? JSON.parse(raw) : raw

    const nowMinutes = minutesSinceMidnight(now, record.tz)
    const today = localDateKey(now, record.tz)
    if (record.lastSentDate === today) continue
    if (!isDue(nowMinutes, record.hour * 60 + record.minute)) continue

    const text = REMINDER_TEXT[record.lang] || REMINDER_TEXT.es
    try {
      await webpush.sendNotification(record.subscription, JSON.stringify(text))
      sent++
      await redis().set(`push:${id}`, JSON.stringify({ ...record, lastSentDate: today }))
    } catch (err: any) {
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await redis().del(`push:${id}`)
        await redis().srem(ALL_KEY, id)
        pruned++
      }
    }
  }

  res.status(200).json({ checked: ids.length, sent, pruned })
}
