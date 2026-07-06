// Shared Upstash Redis client for Aura's minimal backend. Every value stored
// here is either fully anonymous/aggregate (analytics, push subscriptions
// keyed by a random device id) or already end-to-end encrypted client-side
// before it ever reaches this process (backup blobs) — this file has no
// special-casing for that, it's a plain key-value client.
import { Redis } from '@upstash/redis'

let client: Redis | null = null

export function redis(): Redis {
  if (!client) {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN
    if (!url || !token) {
      throw new Error('UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not configured')
    }
    client = new Redis({ url, token })
  }
  return client
}
