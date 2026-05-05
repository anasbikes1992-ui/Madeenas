const buckets = new Map<string, number[]>()

type RateLimitOptions = {
  key: string
  maxRequests: number
  windowMs: number
}

export function limitRequests({ key, maxRequests, windowMs }: RateLimitOptions) {
  const now = Date.now()
  const windowStart = now - windowMs
  const recent = (buckets.get(key) || []).filter((timestamp) => timestamp > windowStart)

  if (recent.length >= maxRequests) {
    buckets.set(key, recent)
    return {
      success: false,
      remaining: 0,
      resetAt: recent[0] + windowMs,
    }
  }

  recent.push(now)
  buckets.set(key, recent)

  return {
    success: true,
    remaining: Math.max(maxRequests - recent.length, 0),
    resetAt: now + windowMs,
  }
}