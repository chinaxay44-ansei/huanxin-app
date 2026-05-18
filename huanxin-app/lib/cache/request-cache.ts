type Json = any

interface CacheEntry {
  timestamp: number
  ttl: number
  data: Json
}

const store = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<Json>>()

function keyFrom(url: string, init?: RequestInit) {
  const method = init?.method || 'GET'
  const headers = init?.headers ? JSON.stringify(init.headers) : ''
  const body = typeof init?.body === 'string' ? init.body : ''
  return `${method}:${url}:${headers}:${body}`
}

export async function cachedJsonFetch(
  url: string,
  init?: RequestInit,
  opts: { ttlMs?: number; force?: boolean } = {}
): Promise<Json> {
  const ttl = Math.max(0, opts.ttlMs ?? 30_000)
  const key = keyFrom(url, init)
  const now = Date.now()

  if (!opts.force) {
    const hit = store.get(key)
    if (hit && now - hit.timestamp < hit.ttl) {
      return hit.data
    }
  }

  const existing = inflight.get(key)
  if (existing) return existing

  const p = (async () => {
    const res = await fetch(url, init)
    if (!res.ok) throw new Error(`Request failed: ${res.status}`)
    const json = await res.json()
    store.set(key, { timestamp: now, ttl, data: json })
    inflight.delete(key)
    return json
  })()
  inflight.set(key, p)
  return p
}

export function clearCache(prefix?: string) {
  if (!prefix) { store.clear(); inflight.clear(); return }
  for (const k of store.keys()) { if (k.includes(prefix)) store.delete(k) }
  for (const k of inflight.keys()) { if (k.includes(prefix)) inflight.delete(k) }
}