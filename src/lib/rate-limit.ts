import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { env } from '@/lib/env'

type RateLimitOptions = {
  key: string
  maxRequests: number
  windowMs: number
}

export type RateLimitResult = {
  success: boolean
  remaining: number
  resetAt: number
}

const memoryBuckets = new Map<string, number[]>()

function limitRequestsMemory({ key, maxRequests, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const windowStart = now - windowMs
  const recent = (memoryBuckets.get(key) || []).filter((timestamp) => timestamp > windowStart)

  if (recent.length >= maxRequests) {
    memoryBuckets.set(key, recent)
    return {
      success: false,
      remaining: 0,
      resetAt: recent[0]! + windowMs,
    }
  }

  recent.push(now)
  memoryBuckets.set(key, recent)

  return {
    success: true,
    remaining: Math.max(maxRequests - recent.length, 0),
    resetAt: now + windowMs,
  }
}

const ratelimitByPolicy = new Map<string, Ratelimit>()

function getUpstashRatelimit(maxRequests: number, windowMs: number): Ratelimit | null {
  const url = env.UPSTASH_REDIS_REST_URL
  const token = env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    return null
  }

  const windowSec = Math.max(1, Math.floor(windowMs / 1000))
  const policyKey = `${maxRequests}:${windowSec}`
  let instance = ratelimitByPolicy.get(policyKey)
  if (!instance) {
    const redis = new Redis({ url, token })
    instance = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowSec} s`),
      analytics: true,
      prefix: '@upstash/ratelimit/textilestock',
    })
    ratelimitByPolicy.set(policyKey, instance)
  }
  return instance
}

/**
 * Rate limit by key. Uses Upstash Redis when `UPSTASH_REDIS_REST_URL` and
 * `UPSTASH_REDIS_REST_TOKEN` are set; otherwise falls back to in-memory (dev / single instance).
 */
export async function limitRequestsAsync(opts: RateLimitOptions): Promise<RateLimitResult> {
  const upstash = getUpstashRatelimit(opts.maxRequests, opts.windowMs)
  if (!upstash) {
    return limitRequestsMemory(opts)
  }

  const res = await upstash.limit(opts.key)
  return {
    success: res.success,
    remaining: res.remaining,
    resetAt: res.reset,
  }
}

/** @deprecated Prefer `limitRequestsAsync` for serverless/multi-instance. */
export function limitRequests(opts: RateLimitOptions): RateLimitResult {
  return limitRequestsMemory(opts)
}
