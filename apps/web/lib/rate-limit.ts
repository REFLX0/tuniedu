// =============================================================================
// TuniEdu Rate Limiter (Layer 5: Ingress & Traffic Control)
// Sliding window rate limiter backed by Redis/MemoryCache
// SEC-05, SEC-18: Protection against DDoS, brute force, and credential stuffing
// =============================================================================

import { cache } from './redis';

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export async function rateLimit(
  identifier: string,
  config: RateLimitConfig = { maxRequests: 60, windowSeconds: 60 }
): Promise<RateLimitResult> {
  const windowKey = `ratelimit:${identifier}:${Math.floor(Date.now() / (config.windowSeconds * 1000))}`;

  const currentCount = await cache.incr(windowKey);

  if (currentCount === 1) {
    await cache.expire(windowKey, config.windowSeconds + 2);
  }

  const remaining = Math.max(0, config.maxRequests - currentCount);
  const resetAt = Math.ceil(Date.now() / (config.windowSeconds * 1000)) * (config.windowSeconds * 1000);

  return {
    success: currentCount <= config.maxRequests,
    limit: config.maxRequests,
    remaining,
    resetAt,
  };
}

export async function checkRateLimit(
  identifier: string,
  maxRequests: number = 60,
  windowSeconds: number = 60
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const result = await rateLimit(identifier, { maxRequests, windowSeconds });
  return {
    allowed: result.success,
    remaining: result.remaining,
    resetAt: result.resetAt,
  };
}
