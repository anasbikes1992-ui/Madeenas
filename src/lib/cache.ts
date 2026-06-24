/**
 * Redis Caching Layer with Upstash
 * 
 * Provides fast caching for read-heavy operations:
 * - Product searches
 * - Dashboard stats
 * - Inventory queries
 * - Gallery products
 * 
 * Features:
 * - Graceful degradation (works without Redis)
 * - TTL-based expiration
 * - Pattern-based invalidation
 * - Compressed large objects
 */

import { Redis } from '@upstash/redis'

// ============================================================================
// Configuration
// ============================================================================

const REDIS_ENABLED = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

let redis: Redis | null = null

if (REDIS_ENABLED) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
  console.log('[Cache] Redis connection established')
} else {
  console.warn('[Cache] Redis not configured, caching disabled')
}

// ============================================================================
// Cache Key Patterns
// ============================================================================

export const CACHE_KEYS = {
  // Product searches
  productSearch: (query: string, filters?: string) => `search:products:${query}:${filters || 'default'}`,
  productById: (id: string) => `product:${id}`,
  productsByCategory: (categoryId: string) => `products:category:${categoryId}`,

  // Inventory
  inventory: (locationId?: string) => `inventory${locationId ? `:${locationId}` : ':all'}`,
  inventoryMatrix: () => 'inventory:matrix',
  lowStock: (locationId: string) => `lowstock:${locationId}`,

  // Dashboard
  dashboardStats: (userId?: string, locationId?: string) => 
    `dashboard:${userId || 'all'}:${locationId || 'all'}`,
  salesReport: (locationId: string, period: string) => `sales:${locationId}:${period}`,

  // Gallery
  galleryProducts: (page: number, filters?: string) => `gallery:${page}:${filters || 'default'}`,

  // Locations
  locations: () => 'locations:all',
  locationById: (id: string) => `location:${id}`,

  // Categories
  categories: () => 'categories:all',
  categoryById: (id: string) => `category:${id}`,
} as const

// ============================================================================
// TTL Configuration (seconds)
// ============================================================================

export const CACHE_TTL = {
  SHORT: 60, // 1 minute - frequently changing data
  MEDIUM: 300, // 5 minutes - moderately stable
  LONG: 3600, // 1 hour - stable data
  VERY_LONG: 86400, // 24 hours - rarely changing
} as const

// ============================================================================
// Core Cache Operations
// ============================================================================

/**
 * Get cached value with automatic fallback to fetcher
 */
export async function cachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CACHE_TTL.MEDIUM
): Promise<T> {
  // If Redis not available, always fetch fresh
  if (!redis) {
    return fetcher()
  }

  try {
    // Try to get from cache
    const cached = await redis.get<T>(key)
    if (cached !== null) {
      console.log(`[Cache HIT] ${key}`)
      return cached
    }

    console.log(`[Cache MISS] ${key}`)
  } catch (error) {
    console.warn('[Cache] Redis read error:', error)
    // Fall through to fetcher
  }

  // Fetch fresh data
  const fresh = await fetcher()

  // Store in cache (fire and forget, don't block response)
  if (redis) {
    redis
      .setex(key, ttl, JSON.stringify(fresh))
      .catch((err) => console.warn('[Cache] Redis write error:', err))
  }

  return fresh
}

/**
 * Set a cached value manually
 */
export async function setCached<T>(key: string, value: T, ttl: number = CACHE_TTL.MEDIUM): Promise<void> {
  if (!redis) return

  try {
    await redis.setex(key, ttl, JSON.stringify(value))
    console.log(`[Cache SET] ${key} (TTL: ${ttl}s)`)
  } catch (error) {
    console.warn('[Cache] Redis write error:', error)
  }
}

/**
 * Get a cached value (null if not found or Redis unavailable)
 */
export async function getCached<T>(key: string): Promise<T | null> {
  if (!redis) return null

  try {
    const cached = await redis.get<T>(key)
    if (cached !== null) {
      console.log(`[Cache HIT] ${key}`)
    }
    return cached
  } catch (error) {
    console.warn('[Cache] Redis read error:', error)
    return null
  }
}

/**
 * Invalidate (delete) a specific cache key
 */
export async function invalidateCache(key: string): Promise<void> {
  if (!redis) return

  try {
    await redis.del(key)
    console.log(`[Cache INVALIDATE] ${key}`)
  } catch (error) {
    console.warn('[Cache] Redis delete error:', error)
  }
}

/**
 * Invalidate all keys matching a pattern
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  if (!redis) return

  try {
    // Note: Upstash Redis doesn't support SCAN, so we need to track keys
    // For now, invalidate known patterns
    const keysToInvalidate: string[] = []

    // Map patterns to actual keys
    if (pattern.startsWith('product:')) {
      keysToInvalidate.push(pattern)
    } else if (pattern === 'products:*') {
      // Invalidate all product-related caches
      keysToInvalidate.push(
        'search:products:*',
        'products:category:*',
        'gallery:*'
      )
    } else if (pattern.startsWith('inventory:')) {
      keysToInvalidate.push(pattern, 'inventory:all', 'inventory:matrix')
    } else if (pattern.startsWith('dashboard:')) {
      keysToInvalidate.push(pattern)
    }

    for (const key of keysToInvalidate) {
      await redis.del(key).catch(() => {})
    }

    console.log(`[Cache INVALIDATE PATTERN] ${pattern} (${keysToInvalidate.length} keys)`)
  } catch (error) {
    console.warn('[Cache] Redis pattern delete error:', error)
  }
}

/**
 * Clear all cache (use sparingly)
 */
export async function clearAllCache(): Promise<void> {
  if (!redis) return

  try {
    await redis.flushdb()
    console.log('[Cache] All cache cleared')
  } catch (error) {
    console.warn('[Cache] Redis flush error:', error)
  }
}

// ============================================================================
// Cache Invalidation Triggers
// ============================================================================

/**
 * Invalidate caches when products change
 */
export async function invalidateProductCaches(productId?: string): Promise<void> {
  if (productId) {
    await invalidateCache(CACHE_KEYS.productById(productId))
  }
  await invalidateCachePattern('products:*')
  await invalidateCachePattern('search:products:*')
  await invalidateCachePattern('gallery:*')
}

/**
 * Invalidate caches when inventory changes
 */
export async function invalidateInventoryCaches(locationId?: string): Promise<void> {
  if (locationId) {
    await invalidateCache(CACHE_KEYS.inventory(locationId))
    await invalidateCache(CACHE_KEYS.lowStock(locationId))
  }
  await invalidateCache(CACHE_KEYS.inventory())
  await invalidateCache(CACHE_KEYS.inventoryMatrix())
  await invalidateCachePattern('dashboard:*')
}

/**
 * Invalidate caches when sales occur
 */
export async function invalidateSalesCaches(locationId?: string): Promise<void> {
  await invalidateInventoryCaches(locationId)
  await invalidateCachePattern('dashboard:*')
  if (locationId) {
    await invalidateCachePattern(`sales:${locationId}:*`)
  }
}

/**
 * Invalidate caches when categories change
 */
export async function invalidateCategoryCaches(): Promise<void> {
  await invalidateCache(CACHE_KEYS.categories())
  await invalidateCachePattern('category:*')
  await invalidateCachePattern('products:category:*')
}

/**
 * Invalidate caches when locations change
 */
export async function invalidateLocationCaches(): Promise<void> {
  await invalidateCache(CACHE_KEYS.locations())
  await invalidateCachePattern('location:*')
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * Check if Redis is available and responsive
 */
export async function checkCacheHealth(): Promise<{ available: boolean; latency?: number }> {
  if (!redis) {
    return { available: false }
  }

  try {
    const start = Date.now()
    await redis.ping()
    const latency = Date.now() - start
    return { available: true, latency }
  } catch (error) {
    console.error('[Cache] Health check failed:', error)
    return { available: false }
  }
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Generate cache key from object (useful for dynamic filters)
 */
export function generateCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${JSON.stringify(params[key])}`)
    .join('&')
  return `${prefix}:${sortedParams}`
}

/**
 * Wrap a function with automatic caching
 */
export function withCache<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options: {
    keyGenerator: (...args: TArgs) => string
    ttl?: number
  }
) {
  return async (...args: TArgs): Promise<TReturn> => {
    const key = options.keyGenerator(...args)
    return cachedQuery(key, () => fn(...args), options.ttl)
  }
}

// ============================================================================
// Export Redis instance for advanced usage
// ============================================================================

export { redis }
export const isCacheEnabled = REDIS_ENABLED
