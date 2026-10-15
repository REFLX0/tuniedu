// =============================================================================
// TuniEdu Session & Anti-Account Sharing Manager (SEC-17 & SEC-18)
// Single active session enforcement · Concurrent IP risk score calculation
// =============================================================================

import { cache } from './redis';

export interface SessionContext {
  userId: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  timestamp?: number;
}

export interface RiskEvaluation {
  riskScore: number; // 0 (low) to 100 (critical)
  isSharedSuspicion: boolean;
  reasons: string[];
}

const ACTIVE_SESSION_PREFIX = 'active_session:';
const USER_IPS_PREFIX = 'user_ips:';
const SESSION_TTL_SECONDS = 7 * 24 * 3600; // 7 days

/**
 * Enforces single active session per user (SEC-18).
 * A new login from a different device/session terminates the previous session.
 */
export async function registerActiveSession(ctx: SessionContext): Promise<{ displacedPreviousSession: boolean }> {
  const key = `${ACTIVE_SESSION_PREFIX}${ctx.userId}`;
  const existingSessionId = await cache.get(key);

  const displaced = !!existingSessionId && existingSessionId !== ctx.sessionId;

  await cache.set(key, ctx.sessionId, SESSION_TTL_SECONDS);

  // Track unique IPs for account sharing detection (SEC-17)
  const ipsKey = `${USER_IPS_PREFIX}${ctx.userId}`;
  const recordedIpsJson = await cache.get(ipsKey);
  const ips: string[] = recordedIpsJson ? JSON.parse(recordedIpsJson) : [];

  if (!ips.includes(ctx.ipAddress)) {
    ips.push(ctx.ipAddress);
    // Keep max 10 recent IPs for sliding 24h window
    if (ips.length > 10) ips.shift();
    await cache.set(ipsKey, JSON.stringify(ips), 24 * 3600);
  }

  return { displacedPreviousSession: displaced };
}

/**
 * Validates if the current session is still the active one (SEC-18).
 */
export async function validateActiveSession(userId: string, sessionId: string): Promise<boolean> {
  const key = `${ACTIVE_SESSION_PREFIX}${userId}`;
  const activeSessionId = await cache.get(key);

  // If no active session recorded yet, accept current
  if (!activeSessionId) return true;

  return activeSessionId === sessionId;
}

/**
 * Evaluates account sharing risk score (SEC-17) based on IP variety and concurrency.
 */
export async function evaluateAccountSharingRisk(userId: string, currentIp: string): Promise<RiskEvaluation> {
  const ipsKey = `${USER_IPS_PREFIX}${userId}`;
  const recordedIpsJson = await cache.get(ipsKey);
  const ips: string[] = recordedIpsJson ? JSON.parse(recordedIpsJson) : [currentIp];

  const reasons: string[] = [];
  let score = 0;

  // More than 3 distinct IPs in 24 hours -> moderate risk
  if (ips.length >= 3) {
    score += 35;
    reasons.push(`${ips.length} adresses IP distinctes enregistrées dans les dernières 24h`);
  }

  // More than 5 distinct IPs in 24 hours -> high risk
  if (ips.length >= 5) {
    score += 45;
    reasons.push('Activité multi-emplacements anormale suggérant un partage d\'identifiants');
  }

  return {
    riskScore: Math.min(score, 100),
    isSharedSuspicion: score >= 50,
    reasons,
  };
}
