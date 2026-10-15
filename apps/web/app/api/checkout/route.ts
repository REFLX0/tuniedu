import { NextRequest, NextResponse } from 'next/server';
import { validateCheckout } from '@/lib/validation';
import { requireApiSession } from '@/lib/auth';
import {
  createDurablePurchase,
  attachProviderSession,
  IdempotencyConflictError,
} from '@/lib/purchase-store';
import { PaymentAdapter } from '@tuniedu/payments';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();

    // 1. Strict input validation (SEC-04/05/08).
    const validation = validateCheckout(rawBody);
    if (!validation.success || !validation.data) {
      return NextResponse.json(
        { error: validation.error, details: validation.fieldErrors },
        { status: 400 }
      );
    }

    const { bookIds, paymentProvider, idempotencyKey } = validation.data;

    // 2. Fail-closed authentication (SEC-01). userId comes ONLY from the
    //    verified session, never from the request body.
    const auth = await requireApiSession(req);
    if (auth.errorResponse) return auth.errorResponse;
    const userId = auth.user.id;

    // 3. Create a durable PENDING purchase with server-derived prices
    //    (SEC-04). A pending purchase grants NO paid access; entitlements are
    //    granted only after a verified provider success webhook.
    let purchase;
    try {
      purchase = await createDurablePurchase({
        userId,
        bookIds,
        paymentProvider,
        idempotencyKey,
        ipAddress: req.headers.get('x-forwarded-for') ?? null,
        userAgent: req.headers.get('user-agent') ?? null,
      });
    } catch (err) {
      if (err instanceof IdempotencyConflictError) {
        return NextResponse.json({ error: err.message }, { status: 409 });
      }
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Erreur creation achat' },
        { status: 400 }
      );
    }

    // 4. Payment initiation (sandbox adapter). Associates the provider
    //    reference with the durable purchase. A real provider integration
    //    would replace PaymentAdapter.createCheckoutSession below.
    const adapter = new PaymentAdapter();
    const session = await adapter.createCheckoutSession({
      purchaseId: purchase.id,
      amountMillimes: purchase.totalMillimes,
      currency: purchase.currency,
      studentId: userId,
      provider: paymentProvider,
      idempotencyKey,
      returnUrl: '/student/library',
      cancelUrl: '/checkout',
    });
    await attachProviderSession(
      purchase.id,
      paymentProvider,
      session.providerReference,
      session.checkoutUrl,
      purchase.totalMillimes
    );

    // 5. Response preserves the existing public contract. entitlementsGranted
    //    is empty because payment is not yet confirmed.
    return NextResponse.json({
      success: true,
      purchaseId: purchase.id,
      totalMillimes: purchase.totalMillimes,
      currency: purchase.currency,
      status: purchase.status,
      entitlementsGranted: [],
      checkoutUrl: session.checkoutUrl,
      redirectUrl: session.checkoutUrl,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err instanceof Error ? err.message : '') || 'Erreur serveur checkout' },
      { status: 500 }
    );
  }
}