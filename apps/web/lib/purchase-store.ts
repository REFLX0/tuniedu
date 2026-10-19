// =============================================================================
// TuniEdu Durable Purchase Persistence Layer (V2)
// PostgreSQL-backed checkout -> payment -> entitlement -> ledger lifecycle.
//
// SECURITY & INTEGRITY GUARANTEES:
//   - Server-derived prices only (SEC-04). Client price/total is ignored.
//   - User-scoped idempotency via DB UNIQUE constraint on Purchase.idempotencyKey.
//   - Webhook replay protection via DB UNIQUE on PaymentEvent(paymentId, providerEventId).
//   - Entitlements granted ONLY after verified payment success, inside a Prisma
//     interactive transaction, guarded by DB UNIQUE constraints to prevent
//     double-granting under concurrent/duplicate webhook delivery.
//   - Ledger effects are atomic with the payment confirmation transition.
//   - All monetary values are integer millimes (TND). No floating point.
//   - Every read/write is scoped to the authenticated userId.
// =============================================================================

import {
  prisma,
  PurchaseStatus,
  PaymentStatus,
  EntitlementStatus,
  LedgerEntryType,
  ContentType,
  Prisma,
} from '@tuniedu/database';
import { calculateCommission } from '@tuniedu/payments';

// Platform commission is a documented, fixed business rule (20% = 2000 bps).
const PLATFORM_COMMISSION_BPS = 2000;

export interface CreatePurchaseParams {
  userId: string;
  bookIds: string[];
  paymentProvider: 'FLOUCI' | 'KONNECT' | 'GPG';
  idempotencyKey: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface PurchaseView {
  id: string;
  status: PurchaseStatus;
  currency: string;
  subtotalMillimes: number;
  discountMillimes: number;
  totalMillimes: number;
  idempotencyKey: string;
  createdAt: Date;
  paidAt: Date | null;
  items: Array<{
    id: string;
    bookId: string;
    bookTitleSnapshot: string;
    unitPriceMillimes: number;
    lineTotalMillimes: number;
  }>;
}

export class IdempotencyConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IdempotencyConflictError';
  }
}

export class PurchaseNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PurchaseNotFoundError';
  }
}

/**
 * Creates a durable PENDING purchase with its lines inside a Prisma
 * transaction. Prices are loaded from authoritative Book records — the
 * client-supplied price is never consulted. A PENDING purchase grants NO
 * paid access. Idempotency: same key + same book set returns the existing
 * purchase; same key + different books throws IdempotencyConflictError.
 */
export async function createDurablePurchase(
  params: CreatePurchaseParams
): Promise<PurchaseView> {
  const { userId, bookIds, idempotencyKey, ipAddress, userAgent } = params;
  const requestedSet = [...new Set(bookIds)].sort();

  const existing = await prisma.purchase.findUnique({
    where: { idempotencyKey },
    include: { items: true },
  });
  if (existing) {
    if (existing.userId !== userId) {
      throw new IdempotencyConflictError(
        'Cette clé idempotence est déjà utilisée par un autre compte.'
      );
    }
    const existingSet = existing.items.map((i) => i.bookId).sort();
    const sameBooks =
      existingSet.length === requestedSet.length &&
      existingSet.every((b, idx) => b === requestedSet[idx]);
    if (!sameBooks) {
      throw new IdempotencyConflictError(
        'Cette clé idempotence a déjà été utilisée avec un panier différent.'
      );
    }
    return toPurchaseView(existing);
  }

  const books = await prisma.book.findMany({
    where: { id: { in: requestedSet }, status: 'PUBLISHED' },
    select: { id: true, title: true, priceMillimes: true },
  });
  const foundIds = new Set(books.map((b) => b.id));
  const missing = requestedSet.filter((id) => !foundIds.has(id));
  if (missing.length > 0) {
    throw new Error('Manuel introuvable ou non publié: ' + missing.join(', '));
  }

  const bookById = new Map(books.map((b) => [b.id, b]));
  const subtotalMillimes = requestedSet.reduce(
    (sum, id) => sum + (bookById.get(id)?.priceMillimes ?? 0),
    0
  );

  try {
    const created = await prisma.purchase.create({
      data: {
        userId,
        status: PurchaseStatus.PENDING,
        currency: 'TND',
        subtotalMillimes,
        discountMillimes: 0,
        totalMillimes: subtotalMillimes,
        idempotencyKey,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        items: {
          create: requestedSet.map((id) => {
            const b = bookById.get(id)!;
            return {
              bookId: b.id,
              bookTitleSnapshot: b.title,
              unitPriceMillimes: b.priceMillimes,
              lineTotalMillimes: b.priceMillimes,
              quantity: 1,
              commissionBps: PLATFORM_COMMISSION_BPS,
            };
          }),
        },
      },
      include: { items: true },
    });
    return toPurchaseView(created);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const raced = await prisma.purchase.findUnique({
        where: { idempotencyKey },
        include: { items: true },
      });
      if (raced) {
        if (raced.userId !== userId) {
          throw new IdempotencyConflictError(
            'Cette clé idempotence est déjà utilisée par un autre compte.'
          );
        }
        return toPurchaseView(raced);
      }
    }
    throw err;
  }
}

/**
 * Associates a provider checkout session with the durable purchase. Idempotent
 * per (purchase, provider reference). Never creates a duplicate Payment.
 */
export async function attachProviderSession(
  purchaseId: string,
  provider: 'FLOUCI' | 'KONNECT' | 'GPG',
  providerReference: string,
  checkoutUrl: string,
  amountMillimes: number
): Promise<{ paymentId: string }> {
  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: { payments: true },
  });
  if (!purchase) throw new PurchaseNotFoundError('Achat introuvable.');

  const existing = purchase.payments.find(
    (p) => p.provider === provider && p.providerReference === providerReference
  );
  if (existing) return { paymentId: existing.id };

  const payment = await prisma.payment.create({
    data: {
      purchaseId,
      provider,
      providerReference,
      status: PaymentStatus.CREATED,
      amountMillimes,
      currency: purchase.currency,
      checkoutUrl,
      idempotencyKey: `${provider}:${purchaseId}:${providerReference}`,
    },
  });
  return { paymentId: payment.id };
}

export interface ConfirmPaymentParams {
  provider: 'FLOUCI' | 'KONNECT' | 'GPG';
  providerEventId: string;
  providerReference: string;
  amountMillimes: number;
  currency: string;
  status: 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  payloadHash: string;
}

export interface ConfirmPaymentResult {
  purchaseId: string;
  applied: boolean;
  reason?: string;
  entitlements: Array<{ id: string; bookId: string; academicYearId: string; expiresAt: Date }>;
}

/**
 * Idempotent, transactional payment confirmation from a verified provider
 * webhook. Exactly-once effects via PaymentEvent UNIQUE replay protection.
 * Purchase -> PAID, Payment -> SUCCEEDED, entitlements granted, and ledger
 * entries written atomically. Duplicate delivery returns applied=false.
 */
export async function confirmPurchasePayment(
  params: ConfirmPaymentParams
): Promise<ConfirmPaymentResult> {
  const {
    provider,
    providerEventId,
    providerReference,
    amountMillimes,
    currency,
    status,
    payloadHash,
  } = params;

  const payment = await prisma.payment.findFirst({
    where: { provider, providerReference },
    include: {
      purchase: { include: { items: true } },
      events: true,
    },
  });
  if (!payment) {
    throw new PurchaseNotFoundError('Référence fournisseur inconnue.');
  }
  const purchase = payment.purchase;
  const itemIds = purchase.items.map((i) => i.id);

  const alreadySeen = payment.events.some((e) => e.providerEventId === providerEventId);

  if (status === 'SUCCEEDED') {
    if (amountMillimes !== purchase.totalMillimes) {
      throw new Error(
        `Montant incohérent: webhook=${amountMillimes} achat=${purchase.totalMillimes}`
      );
    }
    if (currency !== purchase.currency) {
      throw new Error(`Devise incohérente: webhook=${currency} achat=${purchase.currency}`);
    }
  }

  if (alreadySeen) {
    const seenEnts = await prisma.entitlement.findMany({
      where: { purchaseItemId: { in: itemIds } },
    });
    return {
      purchaseId: purchase.id,
      applied: false,
      reason: 'evenement_deja_traite',
      entitlements: seenEnts.map((e) => ({
        id: e.id,
        bookId: e.bookId,
        academicYearId: e.academicYearId,
        expiresAt: e.expiresAt,
      })),
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const event = await tx.paymentEvent.create({
        data: {
          paymentId: payment.id,
          providerEventId,
          eventType: `payment.${status.toLowerCase()}`,
          payloadHash,
        },
      });

      const freshPurchase = await tx.purchase.findUniqueOrThrow({
        where: { id: purchase.id },
        include: { items: true },
      });

      if (status !== 'SUCCEEDED') {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: mapProviderStatusToPayment(status), confirmedAt: new Date() },
        });
        await tx.purchase.update({
          where: { id: purchase.id },
          data: { status: PurchaseStatus.FAILED },
        });
        await tx.paymentEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
        return { applied: true as const, entitlements: [] as Array<{ id: string; bookId: string; academicYearId: string; expiresAt: Date }> };
      }

      if (freshPurchase.status === PurchaseStatus.PAID) {
        await tx.paymentEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
        const existing = await tx.entitlement.findMany({
          where: { purchaseItemId: { in: freshPurchase.items.map((i) => i.id) } },
        });
        return {
          applied: false as const,
          entitlements: existing.map((e) => ({ id: e.id, bookId: e.bookId, academicYearId: e.academicYearId, expiresAt: e.expiresAt })),
        };
      }

      const academicYear = await tx.academicYear.findFirst({ where: { isActive: true } });
      if (!academicYear) {
        throw new Error('Aucune année scolaire active pour accorder les droits.');
      }
      const now = new Date();

      await tx.purchase.update({
        where: { id: purchase.id },
        data: { status: PurchaseStatus.PAID, paidAt: now },
      });
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.SUCCEEDED, confirmedAt: now },
      });

      const grantedEntitlements: Array<{ id: string; bookId: string; academicYearId: string; expiresAt: Date }> = [];
      for (const item of freshPurchase.items) {
        const book = await tx.book.findUniqueOrThrow({
          where: { id: item.bookId },
          select: { professorId: true },
        });

        const entitlement = await tx.entitlement.upsert({
          where: { purchaseItemId: item.id },
          update: {},
          create: {
            userId: purchase.userId,
            bookId: item.bookId,
            purchaseItemId: item.id,
            academicYearId: academicYear.id,
            contentType: ContentType.PDF_COURSE,
            status: EntitlementStatus.ACTIVE,
            startsAt: now,
            expiresAt: academicYear.endsAt,
            grantedAt: now,
          },
        });
        grantedEntitlements.push({
          id: entitlement.id,
          bookId: entitlement.bookId,
          academicYearId: entitlement.academicYearId, expiresAt: entitlement.expiresAt,
        });

        const commission = calculateCommission(item.lineTotalMillimes, PLATFORM_COMMISSION_BPS);
        await tx.financialLedgerEntry.createMany({
          data: [
            {
              professorId: book.professorId,
              purchaseId: purchase.id,
              type: LedgerEntryType.SALE,
              amountMillimes: item.lineTotalMillimes,
              currency: purchase.currency,
              reference: `SALE-${purchase.id}-${item.bookId}`,
              description: `Vente: ${item.bookTitleSnapshot}`,
            },
            {
              professorId: book.professorId,
              purchaseId: purchase.id,
              type: LedgerEntryType.PLATFORM_COMMISSION,
              amountMillimes: commission.platformFeeMillimes,
              currency: purchase.currency,
              reference: `COMM-${purchase.id}-${item.bookId}`,
              description: `Commission plateforme (20%) pour ${item.bookTitleSnapshot}`,
            },
          ],
          skipDuplicates: true,
        });
      }

      await tx.paymentEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
      return { applied: true as const, entitlements: grantedEntitlements };
    });

    return { purchaseId: purchase.id, applied: result.applied, entitlements: result.entitlements };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const existing = await prisma.entitlement.findMany({
        where: { purchaseItemId: { in: purchase.items.map((i) => i.id) } },
      });
      return {
        purchaseId: purchase.id,
        applied: false,
        reason: 'evenement_concurrent_deja_traite',
        entitlements: existing.map((e) => ({ id: e.id, bookId: e.bookId, academicYearId: e.academicYearId, expiresAt: e.expiresAt })),
      };
    }
    throw err;
  }
}

/** User-scoped read of purchases. Never returns another user data. */
export async function getDurablePurchases(userId: string): Promise<PurchaseView[]> {
  const rows = await prisma.purchase.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { items: true },
  });
  return rows.map(toPurchaseView);
}

/** User-scoped read of a single purchase. Returns null if not owned by user. */
export async function getDurablePurchaseById(
  userId: string,
  purchaseId: string
): Promise<PurchaseView | null> {
  const row = await prisma.purchase.findFirst({
    where: { id: purchaseId, userId },
    include: { items: true },
  });
  return row ? toPurchaseView(row) : null;
}

/** User-scoped read of entitlements. */
export async function getDurableEntitlements(userId: string): Promise<
  Array<{
    id: string;
    bookId: string;
    status: EntitlementStatus;
    startsAt: Date;
    expiresAt: Date;
  }>
> {
  return prisma.entitlement.findMany({
    where: { userId },
    select: {
      id: true,
      bookId: true,
      status: true,
      startsAt: true,
      expiresAt: true,
    },
    orderBy: { grantedAt: 'desc' },
  });
}

function mapProviderStatusToPayment(
  status: 'SUCCEEDED' | 'FAILED' | 'CANCELLED'
): PaymentStatus {
  switch (status) {
    case 'SUCCEEDED':
      return PaymentStatus.SUCCEEDED;
    case 'FAILED':
      return PaymentStatus.FAILED;
    case 'CANCELLED':
      return PaymentStatus.CANCELLED;
  }
}

function toPurchaseView(row: {
  id: string;
  status: PurchaseStatus;
  currency: string;
  subtotalMillimes: number;
  discountMillimes: number;
  totalMillimes: number;
  idempotencyKey: string;
  createdAt: Date;
  paidAt: Date | null;
  items: Array<{
    id: string;
    bookId: string;
    bookTitleSnapshot: string;
    unitPriceMillimes: number;
    lineTotalMillimes: number;
  }>;
}): PurchaseView {
  return {
    id: row.id,
    status: row.status,
    currency: row.currency,
    subtotalMillimes: row.subtotalMillimes,
    discountMillimes: row.discountMillimes,
    totalMillimes: row.totalMillimes,
    idempotencyKey: row.idempotencyKey,
    createdAt: row.createdAt,
    paidAt: row.paidAt,
    items: row.items.map((i) => ({
      id: i.id,
      bookId: i.bookId,
      bookTitleSnapshot: i.bookTitleSnapshot,
      unitPriceMillimes: i.unitPriceMillimes,
      lineTotalMillimes: i.lineTotalMillimes,
    })),
  };
}
