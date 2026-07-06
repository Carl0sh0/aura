// Client-side, end-to-end encrypted backup. Everything happens here, before
// anything reaches api/backup.ts — the server only ever sees
// `{ salt, iv, ciphertext }`, never the passphrase or the plaintext data.
// AES-256-GCM with a key derived from a user-chosen backup passphrase via
// PBKDF2. If the passphrase is lost, the backup is unrecoverable — that's the
// real cost of Aura (and nobody else) never being able to read it.
import { STORAGE_KEYS } from './settings'

const PBKDF2_ITERATIONS = 250_000

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((b) => (binary += String.fromCharCode(b)))
  return btoa(binary)
}

function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

function collectLocalData(): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  for (const k of STORAGE_KEYS) {
    const raw = localStorage.getItem(k)
    if (raw == null) continue
    try {
      data[k] = JSON.parse(raw)
    } catch {
      // skip unparseable entries rather than failing the whole backup
    }
  }
  return data
}

function restoreLocalData(data: Record<string, unknown>) {
  for (const k of STORAGE_KEYS) {
    if (k in data) localStorage.setItem(k, JSON.stringify(data[k]))
  }
}

export async function backupNow(idToken: string, passphrase: string): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(passphrase, salt)
  const plaintext = new TextEncoder().encode(JSON.stringify(collectLocalData()))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, plaintext)

  const res = await fetch('/api/backup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({
      salt: toBase64(salt),
      iv: toBase64(iv),
      ciphertext: toBase64(new Uint8Array(ciphertext)),
    }),
  })
  if (!res.ok) throw new Error(`backup-failed-${res.status}`)
}

export async function restoreBackup(idToken: string, passphrase: string): Promise<void> {
  const res = await fetch('/api/backup', {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}` },
  })
  if (res.status === 404) throw new Error('no-backup')
  if (!res.ok) throw new Error(`restore-failed-${res.status}`)
  const record = (await res.json()) as { salt: string; iv: string; ciphertext: string }

  const salt = fromBase64(record.salt)
  const iv = fromBase64(record.iv)
  const key = await deriveKey(passphrase, salt)
  let plaintext: ArrayBuffer
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      fromBase64(record.ciphertext) as BufferSource,
    )
  } catch {
    throw new Error('wrong-passphrase')
  }
  restoreLocalData(JSON.parse(new TextDecoder().decode(plaintext)))
}

export async function deleteBackup(idToken: string): Promise<void> {
  await fetch('/api/backup', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${idToken}` },
  }).catch(() => {})
}
