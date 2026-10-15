// =============================================================================
// TuniEdu Next.js Edge Middleware
// Layer 01: Client & delivery · Layer 04: Security Perimeter · Layer 05: Ingress Control
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';

// Edge-runtime compatible sliding-window rate limiter
const edgeRateLimitCache = new Map<string, { count: number; resetAt: number }>();

// Normalises an absolute URL to an `origin` for CSP source expressions.
function toOrigin(rawValue: string | undefined | null): string | null {
  if (!rawValue) return null;
  try {
    const url = new URL(rawValue);
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

// Builds the `connect-src` allowlist from configured infrastructure:
// - the S3/MinIO endpoint (direct browser PUT/GET to object storage)
// - the LiveKit URL (WebRTC signalling over ws/wss)
// `default-src 'self'` blocks these by default, which broke video uploads.
function buildConnectSrc(): string {
  const sources = new Set<string>(["'self'", 'blob:', 'data:']);

  for (const raw of [process.env.S3_ENDPOINT, process.env.LIVEKIT_URL]) {
    const origin = toOrigin(raw);
    if (!origin) continue;
    sources.add(origin);
    if (origin.startsWith('http://')) sources.add(origin.replace('http://', 'ws://'));
    if (origin.startsWith('https://')) sources.add(origin.replace('https://', 'wss://'));
  }

  if (process.env.NODE_ENV !== 'production') {
    sources.add('ws://localhost:3000');
    sources.add('ws://127.0.0.1:3000');
  }

  return [...sources].join(' ');
}

function checkEdgeRateLimit(key: string, maxRequests: number, windowSeconds: number) {
  const now = Date.now();
  const entry = edgeRateLimitCache.get(key);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowSeconds * 1000;
    edgeRateLimitCache.set(key, { count: 1, resetAt });
    return { success: true, remaining: maxRequests - 1, resetAt, limit: maxRequests };
  }

  entry.count += 1;
  const remaining = Math.max(0, maxRequests - entry.count);
  return {
    success: entry.count <= maxRequests,
    remaining,
    resetAt: entry.resetAt,
    limit: maxRequests,
  };
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Ingress & Traffic Control: Rate Limiting for API routes
  if (pathname.startsWith('/api/')) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    
    // Tighter rate limit for sensitive endpoints (auth, checkout)
    const isSensitive = pathname.startsWith('/api/checkout') || pathname.startsWith('/api/auth');
    const maxRequests = isSensitive ? 20 : 100;
    const windowSeconds = 60;

    const rateResult = checkEdgeRateLimit(`ip:${ip}:${isSensitive ? 'strict' : 'api'}`, maxRequests, windowSeconds);

    if (!rateResult.success) {
      return NextResponse.json(
        {
          error: 'Trop de requêtes. Veuillez patienter avant de réessayer.',
          retryAfterSeconds: Math.ceil((rateResult.resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateResult.resetAt - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': rateResult.limit.toString(),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }
  }

  // 2. Prepare Response
  const res = NextResponse.next();

  // 3. Layer 04 Security Perimeter Headers
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), display-capture=(self)'
  );
  res.headers.set(
    'Content-Security-Policy',
    `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' blob:; connect-src ${buildConnectSrc()}; worker-src 'self' blob:; frame-ancestors 'none';`
  );

  // Strict-Transport-Security (HTTPS only in production)
  if (process.env.NODE_ENV === 'production') {
    res.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
