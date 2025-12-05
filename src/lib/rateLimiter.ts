/**
 * Rate Limiter Utility for Edge Functions
 * Uses a sliding window algorithm with Supabase for persistence
 */

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyPrefix?: string; // Prefix for rate limit keys
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

// In-memory store for client-side rate limiting (use Supabase for server-side)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Client-side rate limiter for API calls
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig = { windowMs: 60000, maxRequests: 60 }
): RateLimitResult {
  const now = Date.now();
  const fullKey = `${config.keyPrefix || 'rl'}:${key}`;
  
  const existing = rateLimitStore.get(fullKey);
  
  // Reset window if expired
  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(fullKey, {
      count: 1,
      resetAt: now + config.windowMs
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs
    };
  }
  
  // Check if limit exceeded
  if (existing.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfter: Math.ceil((existing.resetAt - now) / 1000)
    };
  }
  
  // Increment counter
  existing.count++;
  rateLimitStore.set(fullKey, existing);
  
  return {
    allowed: true,
    remaining: config.maxRequests - existing.count,
    resetAt: existing.resetAt
  };
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Auth endpoints - stricter limits
  login: { windowMs: 15 * 60 * 1000, maxRequests: 5, keyPrefix: 'auth:login' },
  signup: { windowMs: 60 * 60 * 1000, maxRequests: 3, keyPrefix: 'auth:signup' },
  otp: { windowMs: 60 * 1000, maxRequests: 3, keyPrefix: 'auth:otp' },
  passwordReset: { windowMs: 60 * 60 * 1000, maxRequests: 3, keyPrefix: 'auth:reset' },
  
  // API endpoints - standard limits
  api: { windowMs: 60 * 1000, maxRequests: 60, keyPrefix: 'api' },
  broadcast: { windowMs: 60 * 60 * 1000, maxRequests: 10, keyPrefix: 'broadcast' },
  
  // Webhook endpoints - higher limits
  webhook: { windowMs: 60 * 1000, maxRequests: 1000, keyPrefix: 'webhook' },
  
  // Public endpoints
  publicForm: { windowMs: 60 * 1000, maxRequests: 30, keyPrefix: 'form' },
  publicStore: { windowMs: 60 * 1000, maxRequests: 100, keyPrefix: 'store' },
};

/**
 * Clear rate limit for a specific key (useful for testing)
 */
export function clearRateLimit(key: string, prefix?: string): void {
  const fullKey = `${prefix || 'rl'}:${key}`;
  rateLimitStore.delete(fullKey);
}

/**
 * Clean up expired entries (call periodically)
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

// Auto cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(cleanupRateLimits, 5 * 60 * 1000);
}
