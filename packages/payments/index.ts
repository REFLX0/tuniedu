import * as crypto from 'crypto';
import { PaymentStatus, PurchaseStatus, LedgerEntryType } from '@tuniedu/shared-types';

export const PLATFORM_COMMISSION_BPS = 2000; // 20.00%
export const CURRENCY = 'TND';

export interface PaymentInitializationRequest {
  purchaseId: string;
  amountMillimes: number;
  currency: string;
  studentId: string;
  studentEmail?: string;
  provider: 'FLOUCI' | 'KONNECT' | 'GPG';
  idempotencyKey: string;
  returnUrl: string;
  cancelUrl: string;
}

export interface PaymentInitializationResponse {
  paymentId: string;
  providerReference: string;
  checkoutUrl: string;
  status: PaymentStatus;
}

export interface WebhookPayload {
  provider: 'FLOUCI' | 'KONNECT' | 'GPG';
  providerEventId: string;
  providerReference: string;
  status: 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  amountMillimes: number;
  currency: string;
  signature: string;
  timestamp: string;
}

export interface CommissionCalculation {
  priceMillimes: number;
  commissionBps: number;
  platformFeeMillimes: number;
  professorNetMillimes: number;
}

/**
 * Calculates platform commission and professor net earnings
 * Default: 20% (2000 bps)
 */
export function calculateCommission(priceMillimes: number, bps: number = PLATFORM_COMMISSION_BPS): CommissionCalculation {
  const platformFeeMillimes = Math.round((priceMillimes * bps) / 10000);
  const professorNetMillimes = priceMillimes - platformFeeMillimes;
  return {
    priceMillimes,
    commissionBps: bps,
    platformFeeMillimes,
    professorNetMillimes,
  };
}

/**
 * Formats millimes into Tunisian Dinars display string (e.g. 25000 -> "25.000 DT")
 */
export function formatTND(millimes: number): string {
  const dt = (millimes / 1000).toFixed(3);
  return `${dt} DT`;
}

/**
 * State machine validation for Payment status transitions
 */
export const ALLOWED_PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  CREATED: ['PENDING', 'FAILED'],
  PENDING: ['SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED'],
  SUCCEEDED: ['REFUNDED', 'DISPUTED'],
  FAILED: ['PENDING'],
  CANCELLED: ['PENDING'],
  EXPIRED: ['PENDING'],
  REFUNDED: [],
  DISPUTED: ['SUCCEEDED', 'REFUNDED'],
};

export function canTransitionPayment(current: PaymentStatus, target: PaymentStatus): boolean {
  return ALLOWED_PAYMENT_TRANSITIONS[current]?.includes(target) || false;
}

/**
 * Computes production HMAC-SHA256 signature for webhook payloads
 */
export function computeWebhookSignature(rawBody: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

/**
 * Validates webhook cryptographic signature
 * In production: Constant-time comparison of HMAC-SHA256 hex or base64
 * SEC-07: Tampered or invalid signatures are strictly rejected
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret || typeof rawBody !== 'string') return false;

  try {
    const computedHex = computeWebhookSignature(rawBody, secret);
    const sigBuffer = Buffer.from(signature, 'utf8');
    const compBuffer = Buffer.from(computedHex, 'utf8');

    if (sigBuffer.length !== compBuffer.length) {
      // Also try base64 encoding if hex length differs
      const computedBase64 = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
      const base64Buffer = Buffer.from(computedBase64, 'utf8');
      if (sigBuffer.length === base64Buffer.length && crypto.timingSafeEqual(sigBuffer, base64Buffer)) {
        return true;
      }
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, compBuffer);
  } catch {
    return false;
  }
}

/**
 * Simulates Payment Gateway Adapter (e.g., Flouci / Konnect sandbox)
 */
export class PaymentAdapter {
  constructor(private webhookSecret: string = 'tuniedu_secret_2026') {}

  async createCheckoutSession(req: PaymentInitializationRequest): Promise<PaymentInitializationResponse> {
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const providerReference = `flouci_ref_${Date.now()}`;
    const checkoutUrl = `/checkout/gateway-simulation?paymentId=${paymentId}&amount=${req.amountMillimes}&ref=${providerReference}&provider=${req.provider}`;

    return {
      paymentId,
      providerReference,
      checkoutUrl,
      status: 'PENDING',
    };
  }

  verifyWebhook(payload: WebhookPayload): boolean {
    return verifyWebhookSignature(JSON.stringify(payload), payload.signature, this.webhookSecret);
  }
}
