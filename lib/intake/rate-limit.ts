const buckets = new Map<string, number[]>()

export function rateLimitHit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const current = (buckets.get(key) ?? []).filter((ts) => now - ts < windowMs)
  if (current.length >= limit) {
    buckets.set(key, current)
    return true
  }
  current.push(now)
  buckets.set(key, current)
  return false
}

export function clientIp(headers: Headers) {
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || 'unknown'
}
