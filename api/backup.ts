// Encrypted backup storage, one slot per Google account. The payload is
// already AES-GCM encrypted client-side (src/lib/backup.ts) before it ever
// reaches this function — this endpoint only ever sees `{ salt, iv,
// ciphertext }`, never a passphrase or plaintext journal/chat content.
//
// Every request must carry a Google ID token, verified server-side (see
// api/_lib/verifyGoogleToken.ts) so the storage key is the *verified* `sub`,
// not anything the client claims — otherwise a forged token could read or
// overwrite someone else's backup.
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { redis } from './_lib/redis.js'
import { verifyGoogleToken } from './_lib/verifyGoogleToken.js'

type BackupRecord = {
  salt: string
  iv: string
  ciphertext: string
  updatedAt: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization || ''
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const user = await verifyGoogleToken(idToken)
  if (!user) {
    res.status(403).json({ error: 'invalid or missing Google ID token' })
    return
  }
  const key = `backup:${user.sub}`

  if (req.method === 'GET') {
    const record = await redis().get<BackupRecord>(key)
    if (!record) {
      res.status(404).json({ error: 'no backup found' })
      return
    }
    res.status(200).json(record)
    return
  }

  if (req.method === 'POST') {
    const body = req.body as Partial<BackupRecord>
    if (!body?.salt || !body.iv || !body.ciphertext) {
      res.status(400).json({ error: 'invalid body' })
      return
    }
    const record: BackupRecord = {
      salt: body.salt,
      iv: body.iv,
      ciphertext: body.ciphertext,
      updatedAt: new Date().toISOString(),
    }
    await redis().set(key, JSON.stringify(record))
    res.status(200).json({ ok: true, updatedAt: record.updatedAt })
    return
  }

  if (req.method === 'DELETE') {
    await redis().del(key)
    res.status(200).json({ ok: true })
    return
  }

  res.status(405).json({ error: 'method not allowed' })
}
