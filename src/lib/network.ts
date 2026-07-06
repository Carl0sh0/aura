// Best-effort "is this connection likely metered/cellular" check, used to warn
// before a multi-GB model download. The Network Information API isn't
// supported everywhere (notably Safari) — when it's unavailable this simply
// returns false rather than guessing, so the warning only ever fires when we
// have real signal for it.
export function isLikelyMeteredConnection(): boolean {
  const conn = typeof navigator !== 'undefined' ? (navigator as any).connection : undefined
  if (!conn) return false
  if (conn.saveData) return true
  return conn.type === 'cellular'
}
