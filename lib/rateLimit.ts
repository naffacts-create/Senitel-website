/**
 * Simple in-memory rate limiter for tracking API calls per user.
 * Note: This is not persistent across server restarts. For production,
 * consider using Redis or a similar persistent solution.
 */

type RateLimitKey = string;
type RateLimitEntry = { count: number; resetAt: number };

const store = new Map<RateLimitKey, RateLimitEntry>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Check if a request should be allowed under rate limit.
 * @param key Unique identifier (e.g., user ID)
 * @param limit Maximum requests per window
 * @param windowMs Time window in milliseconds
 */
export function checkRateLimit(
  key: RateLimitKey,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  // Initialize or reset if window expired
  if (!entry || entry.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: new Date(resetAt),
    };
  }

  // Increment within window
  const allowed = entry.count < limit;
  if (allowed) {
    entry.count++;
  }

  return {
    allowed,
    remaining: Math.max(0, limit - entry.count),
    resetAt: new Date(entry.resetAt),
  };
}

/** Clean up expired entries periodically (call occasionally to prevent memory bloat). */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}
