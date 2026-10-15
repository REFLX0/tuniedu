// =============================================================================
// Payment provider webhook endpoint (V2 durable path).
//
// SECURITY:
//   - HMAC-SHA256 signature over the EXACT raw body is verified BEFORE any
//     state change (SEC-07/21). Invalid signatures -> 401, no DB work.
//   - Provider event IDs are persisted with DB-enforced uniqueness for replay
//     protection (PaymentEvent @@unique([paymentId, providerEventId])).
//   - Amount + currency are verified against the durable purchase.
//   - Entitlements are granted and ledger entries written atomically, exactly
//     once, inside confirmPurchasePayment().
//
// PROVIDER CONTRACT: This mirrors the WebhookPayload shape defined in
// packages/payments/index.ts (the sandbox Flouci-style contract). A real
// provider integration must match that provider's actual documented scheme;
// the signature here is HMAC-SHA256 hex/base64 via verifyWebhookSignature.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { verifyWebhookSignature } from '@tuniedu/payments';
import { confirmPurchasePayment } from '@/lib/purchase-store';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET_KEY || 'tuniedu_secret_2026';

export async function POST(req: NextRequest) {
  // Read the raw body ONCE â€” HMAC must be computed over the exact bytes.
  const rawBody = await req.text();

  let payload: {
    provider?: string;
    providerEventId?: string;
    providerReference?: string;
    status?: string;
    amountMillimes?: number;
    currency?: string;
    signature?: string;
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Payload JSON invalide' }, { status: 400 });
  }

  // 1. Signature verification (fail closed). No state change before this.
  const signature = req.headers.get('x-webhook-signature') || payload.signature || '';
  if (!verifyWebhookSignature(rawBody, signature, WEBHOOK_SECRET)) {
    return NextResponse.json({ error: 'Signature webhook invalide' }, { status: 401 });
  }

  // 2. Structural validation of required fields.
  const provider = payload.provider;
  const providerEventId = payload.providerEventId;
  const providerReference = payload.providerReference;
  const status = payload.status;
  if (
    (provider !== 'FLOUCI' && provider !== 'KONNECT' && provider !== 'GPG') ||
    typeof providerEventId !== 'string' ||
    typeof providerReference !== 'string' ||
    (status !== 'SUCCEEDED' && status !== 'FAILED' && status !== 'CANCELLED')
  ) {
    return NextResponse.json({ error: 'Evenement webhook invalide' }, { status: 400 });
  }

  const amountMillimes = Number(payload.amountMillimes);
  const currency = typeof payload.currency === 'string' ? payload.currency : '';
  if (!Number.isInteger(amountMillimes) || !currency) {
    return NextResponse.json({ error: 'Montant/devise webhook invalide' }, { status: 400 });
  }

  const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');

  // 3. Durable, idempotent confirmation.
  try {
    const result = await confirmPurchasePayment({
      provider,
      providerEventId,
      providerReference,
      amountMillimes,
      currency,
      status,
      payloadHash,
    });
    // Always acknowledge with 200 so the provider stops retrying a genuinely
    // processed (or intentionally ignored) event. applied=false means it was a
    // safe no-op (already processed / duplicate).
    return NextResponse.json(
      { received: true, applied: result.applied, purchaseId: result.purchaseId },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur traitement webhook';
    // Unknown reference / amount mismatch are recorded but acknowledged so the
    // provider does not retry forever; operators alert on received=false.
    return NextResponse.json({ received: false, error: message }, { status: 400 });
  }
}