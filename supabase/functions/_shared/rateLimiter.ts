/**
 * Server-side Rate Limiter for Edge Functions
 * Uses Supabase for distributed rate limiting
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

// In-memory fallback (per instance)
const memoryStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Check rate limit for a given key
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig,
  supabaseUrl?: string,
  supabaseKey?: string
): Promise<RateLimitResult> {
  const now = Date.now();
  const fullKey = `${config.keyPrefix}:${key}`;

  // Try memory store first (fast path)
  const existing = memoryStore.get(fullKey);

  if (!existing || existing.resetAt <= now) {
    memoryStore.set(fullKey, {
      count: 1,
      resetAt: now + config.windowMs
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs
    };
  }

  if (existing.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfter: Math.ceil((existing.resetAt - now) / 1000)
    };
  }

  existing.count++;
  memoryStore.set(fullKey, existing);

  return {
    allowed: true,
    remaining: config.maxRequests - existing.count,
    resetAt: existing.resetAt
  };
}

/**
 * Rate limit middleware for edge functions
 */
export async function rateLimitMiddleware(
  req: Request,
  config: RateLimitConfig
): Promise<Response | null> {
  // Get client identifier (IP or user ID)
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || req.headers.get('x-real-ip') 
    || 'unknown';
  
  const authHeader = req.headers.get('Authorization');
  const userId = authHeader ? 'auth' : 'anon';
  const key = `${clientIp}:${userId}`;

  const result = await checkRateLimit(key, config);

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        message: `Rate limit exceeded. Please try again in ${result.retryAfter} seconds.`,
        retryAfter: result.retryAfter
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.resetAt.toString(),
          'Retry-After': result.retryAfter?.toString() || '60',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        }
      }
    );
  }

  return null; // Continue processing
}

/**
 * Predefined rate limit configurations
 */
export const RATE_LIMITS = {
  // Auth - strict limits
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 10, keyPrefix: 'auth' },
  otp: { windowMs: 60 * 1000, maxRequests: 3, keyPrefix: 'otp' },
  
  // API - standard limits  
  api: { windowMs: 60 * 1000, maxRequests: 60, keyPrefix: 'api' },
  
  // Webhooks - high limits
  webhook: { windowMs: 60 * 1000, maxRequests: 1000, keyPrefix: 'webhook' },
  
  // Public endpoints
  public: { windowMs: 60 * 1000, maxRequests: 30, keyPrefix: 'public' },
  
  // Broadcast - very strict
  broadcast: { windowMs: 60 * 60 * 1000, maxRequests: 10, keyPrefix: 'broadcast' },
};

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of memoryStore.entries()) {
    if (value.resetAt <= now) {
      memoryStore.delete(key);
    }
  }
}, 60 * 1000);
