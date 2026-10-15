// =============================================================================
// TuniEdu Media Security (SEC-19, SEC-20, SEC-24)
// Short-lived signed HLS tokens · Dynamic video & live streaming watermark
// =============================================================================

import * as crypto from 'crypto';

const MEDIA_SECRET = process.env.MEDIA_TOKEN_SECRET || 'tuniedu_media_hls_secret_2026';
const TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes strict TTL (SEC-19)

export interface MediaTokenPayload {
  userId: string;
  resourceId: string;
  type: 'VIDEO' | 'LIVE' | 'PDF';
  expiresAt: number;
}

/**
 * Generates a signed, tamper-proof media token with 15-minute expiration (SEC-19)
 */
export function generateMediaToken(userId: string, resourceId: string, type: 'VIDEO' | 'LIVE' | 'PDF' = 'VIDEO'): string {
  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const payloadStr = `${userId}:${resourceId}:${type}:${expiresAt}`;
  const signature = crypto.createHmac('sha256', MEDIA_SECRET).update(payloadStr).digest('hex');
  return Buffer.from(`${payloadStr}:${signature}`).toString('base64url');
}

/**
 * Validates signed media token and ensures it is unexpired (SEC-19)
 */
export function verifyMediaToken(token: string): MediaTokenPayload | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length !== 5) return null;

    const [userId, resourceId, type, expiresAtStr, signature] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);

    // Expiry check
    if (Math.floor(Date.now() / 1000) > expiresAt) {
      return null;
    }

    // Signature verification (constant time)
    const payloadStr = `${userId}:${resourceId}:${type}:${expiresAtStr}`;
    const expectedSig = crypto.createHmac('sha256', MEDIA_SECRET).update(payloadStr).digest('hex');

    const sigBuf = Buffer.from(signature, 'utf8');
    const expBuf = Buffer.from(expectedSig, 'utf8');

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    return {
      userId,
      resourceId,
      type: type as 'VIDEO' | 'LIVE' | 'PDF',
      expiresAt,
    };
  } catch {
    return null;
  }
}

/**
 * Generates dynamic watermark data for HLS video player overlay (SEC-20)
 */
export function generateVideoWatermark(userId: string, userEmail: string): {
  maskedEmail: string;
  sessionRef: string;
  timestamp: string;
} {
  const [name, domain] = userEmail.split('@');
  const maskedEmail = `${name.slice(0, 2)}***@${domain || 'tuniedu.tn'}`;
  return {
    maskedEmail,
    sessionRef: `TND-${userId.slice(-6).toUpperCase()}`,
    timestamp: new Date().toISOString(),
  };
}
