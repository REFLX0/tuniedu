// =============================================================================
// SANDBOX-ONLY payment provider simulator.
//
// This endpoint exists so the client-side gateway-simulation page can exercise
// the REAL durable payment path end-to-end without the HMAC signing secret ever
// leaving the server:
//
//   client (gateway-simulation)  ->  POST /api/payments/simulate
//     -> server computes HMAC-SHA256 over the exact body with WEBHOOK_SECRET_KEY
//     -> server invokes the real /api/payments/webhook handler
//     -> confirmPurchasePayment() grants entitlements + ledger atomically
//
// SECURITY / PRODUCTION BEHAVIOUR:
//   - In production this route is DISABLED (404) unless ALLOW_PAYMENT_SIMULATION=1.
//     A real deployment must use the provider's own hosted checkout + webhooks.
//   - It never accepts a client-supplied signature; the signature is computed
//     server-side, so it cannot be used to forge arbitrary webhook events.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { computeWebhookSignature } from '@tuniedu/payments';
import { POST as webhookPOST } from '@/app/api/payments/webhook/route';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET_KEY || 'tuniedu_secret_2026';

type SimProvider = 'FLOUCI' | 'KONNECT' | 'GPG';
type SimStatus = 'SUCCEEDED' | 'FAILED' | 'CANCELLED';

export async function POST(req: NextRequest) {
  // Fail closed in production unless explicitly opted in for a staging sandbox.
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PAYMENT_SIMULATION !== '1') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: {
    provider?: string;
    providerReference?: string;
    providerEventId?: string;
    status?: string;
    amountMillimes?: number;
    currency?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Payload JSON invalide' }, { status: 400 });
  }

  const provider = body.provider;
  const status = body.status;
  const providerReference = body.providerReference;
  const amountMillimes = Number(body.amountMillimes);
  const currency = typeof body.currency === 'string' && body.currency ? body.currency : 'TND';

  if (
    (provider !== 'FLOUCI' && provider !== 'KONNECT' && provider !== 'GPG') ||
    (status !== 'SUCCEEDED' && status !== 'FAILED' && status !== 'CANCELLED') ||
    typeof providerReference !== 'string' ||
    !providerReference ||
    !Number.isInteger(amountMillimes) ||
    amountMillimes <= 0
  ) {
    return NextResponse.json({ error: 'Parametres de simulation invalides' }, { status: 400 });
  }

  const providerEventId =
    typeof body.providerEventId === 'string' && body.providerEventId
      ? body.providerEventId
      : `sim_evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  // Build the exact provider webhook payload and sign it server-side.
  const rawBody = JSON.stringify({
    provider: provider as SimProvider,
    providerEventId,
    providerReference,
    status: status as SimStatus,
    amountMillimes,
    currency,
    timestamp: new Date().toISOString(),
  });
  const signature = computeWebhookSignature(rawBody, WEBHOOK_SECRET);

  // Drive the real webhook handler so signature verification, replay
  // protection and atomic entitlement granting all run exactly as in prod.
  const webhookReq = new NextRequest(new URL('/api/payments/webhook', req.url), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-webhook-signature': signature,
    },
    body: rawBody,
  });

  return webhookPOST(webhookReq);
}
