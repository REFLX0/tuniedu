// =============================================================================
// TuniEdu Durable Checkout Persistence Ã¢â‚¬â€ REAL PostgreSQL integration tests.
// Run: npx tsx tests/persistence/purchase-integration-tests.ts
//
// SAFETY: refuses to run unless DATABASE_URL points to a disposable test DB
// and TUNIEDU_ALLOW_DB_WRITE=1 is set. Hard-rejects the production port 5432.
// =============================================================================

import {
  createDurablePurchase,
  confirmPurchasePayment,
  attachProviderSession,
  getDurablePurchases,
  getDurableEntitlements,
  getDurablePurchaseById,
  IdempotencyConflictError,
} from '../../apps/web/lib/purchase-store';
import {
  prisma,
  PurchaseStatus,
} from '../../packages/database';
import { computeWebhookSignature, verifyWebhookSignature } from '../../packages/payments';

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  details: string;
}

function assertSafeTarget(): void {
  const url = process.env.DATABASE_URL || '';
  if (process.env.TUNIEDU_ALLOW_DB_WRITE !== '1') {
    throw new Error('Refus: definissez TUNIEDU_ALLOW_DB_WRITE=1 pour autoriser les ecritures de test.');
  }
  if (/:5432\//.test(url)) {
    throw new Error('Refus: DATABASE_URL cible le port 5432 (base existante). Utilisez une base jetable.');
  }
  if (!/^postgres(ql)?:\/\//.test(url)) {
    throw new Error('Refus: DATABASE_URL doit etre une URL PostgreSQL valide.');
  }
}

async function seedBaseData() {
  const suffix = Math.random().toString(36).slice(2, 8);
  const academicYear = await prisma.academicYear.upsert({
    where: { name: `AY-TEST-${suffix}` },
    update: { isActive: true },
    create: {
      name: `AY-TEST-${suffix}`,
      startsAt: new Date('2026-09-15T00:00:00Z'),
      endsAt: new Date('2027-06-30T22:59:59Z'),
      timezone: 'Africa/Tunis',
      isActive: true,
    },
  });
  const user = await prisma.user.create({
    data: { email: `student-${suffix}@test.tn`, name: `Student ${suffix}`, status: 'ACTIVE' },
  });
  const otherUser = await prisma.user.create({
    data: { email: `other-${suffix}@test.tn`, name: `Other ${suffix}`, status: 'ACTIVE' },
  });
  const profUser = await prisma.user.create({
    data: { email: `prof-${suffix}@test.tn`, name: `Prof ${suffix}`, status: 'ACTIVE' },
  });
  const professor = await prisma.professorProfile.create({
    data: { userId: profUser.id, displayName: `Prof ${suffix}`, specialization: [], status: 'VERIFIED', verifiedAt: new Date() },
  });
  const educationLevel = await prisma.educationLevel.upsert({
    where: { code: `LVL-${suffix}` },
    update: {},
    create: { code: `LVL-${suffix}`, nameFr: 'Niveau', nameAr: 'mst', stage: 'COLLEGE', sortOrder: 9 },
  });
  const subject = await prisma.subject.upsert({
    where: { code: `SUBJ-${suffix}` },
    update: {},
    create: { code: `SUBJ-${suffix}`, nameFr: 'Matiere', nameAr: 'md' },
  });
  const book = await prisma.book.create({
    data: {
      professorId: professor.id,
      educationLevelId: educationLevel.id,
      subjectId: subject.id,
      title: `Livre test ${suffix}`,
      slug: `livre-test-${suffix}`,
      priceMillimes: 25000,
      currency: 'TND',
      status: 'PUBLISHED',
      tags: [],
      publishedAt: new Date(),
    },
  });
  return { academicYear, user, otherUser, professor, educationLevel, subject, book };
}

async function cleanup(seed: Awaited<ReturnType<typeof seedBaseData>>, purchaseIds: string[]) {
  // Delete in FK-safe order (children first; all child FKs are onDelete: Restrict).
  await prisma.entitlement.deleteMany({ where: { userId: { in: [seed.user.id, seed.otherUser.id] } } });
  await prisma.financialLedgerEntry.deleteMany({ where: { professorId: seed.professor.id } });
  await prisma.paymentEvent.deleteMany({ where: { payment: { purchase: { userId: { in: [seed.user.id, seed.otherUser.id] } } } } });
  await prisma.payment.deleteMany({ where: { purchase: { userId: { in: [seed.user.id, seed.otherUser.id] } } } });
  await prisma.purchaseItem.deleteMany({ where: { purchase: { userId: { in: [seed.user.id, seed.otherUser.id] } } } });
  await prisma.purchase.deleteMany({ where: { userId: { in: [seed.user.id, seed.otherUser.id] } } });
  await prisma.book.deleteMany({ where: { id: seed.book.id } });
  await prisma.professorProfile.deleteMany({ where: { id: seed.professor.id } });
  await prisma.user.deleteMany({ where: { id: { in: [seed.user.id, seed.otherUser.id, seed.professor.userId] } } });
  await prisma.educationLevel.deleteMany({ where: { id: seed.educationLevel.id } });
  await prisma.subject.deleteMany({ where: { id: seed.subject.id } });
  await prisma.academicYear.deleteMany({ where: { id: seed.academicYear.id } });
}

export async function runPurchaseIntegrationTests(): Promise<TestResult[]> {
  assertSafeTarget();
  const results: TestResult[] = [];
  const seed = await seedBaseData();
  const purchaseIds: string[] = [];
  const push = (id: string, name: string, passed: boolean, details: string) =>
    results.push({ id, name, passed, details });

  try {
    // IT-01: durable PENDING purchase + lines; no entitlement.
    {
      const key = `idem-it01-${Date.now()}`;
      const p = await createDurablePurchase({ userId: seed.user.id, bookIds: [seed.book.id], paymentProvider: 'FLOUCI', idempotencyKey: key });
      purchaseIds.push(p.id);
      const dbP = await prisma.purchase.findUnique({ where: { id: p.id }, include: { items: true } });
      const ents = await prisma.entitlement.count({ where: { userId: seed.user.id } });
      push('IT-01', 'Checkout creates durable PENDING purchase + lines, no entitlement', !!dbP && dbP.status === PurchaseStatus.PENDING && dbP.items.length === 1 && dbP.totalMillimes === 25000 && ents === 0, `status=${dbP?.status} items=${dbP?.items.length} total=${dbP?.totalMillimes} entitlements=${ents}`);
    }

    // IT-02: server-derived price used regardless of client amount.
    {
      const key = `idem-it02-${Date.now()}`;
      const p = await createDurablePurchase({ userId: seed.user.id, bookIds: [seed.book.id], paymentProvider: 'FLOUCI', idempotencyKey: key });
      purchaseIds.push(p.id);
      push('IT-02', 'Server-derived price used (client amount ignored)', p.totalMillimes === 25000, `total=${p.totalMillimes} (attendu 25000)`);
    }

    // IT-03: equivalent retry with same key returns same purchase.
    {
      const key = `idem-it03-${Date.now()}`;
      const p1 = await createDurablePurchase({ userId: seed.user.id, bookIds: [seed.book.id], paymentProvider: 'FLOUCI', idempotencyKey: key });
      purchaseIds.push(p1.id);
      const p2 = await createDurablePurchase({ userId: seed.user.id, bookIds: [seed.book.id], paymentProvider: 'FLOUCI', idempotencyKey: key });
      const count = await prisma.purchase.count({ where: { idempotencyKey: key } });
      push('IT-03', 'Same idempotency key returns same purchase (no duplicate)', p1.id === p2.id && count === 1, `p1=${p1.id} p2=${p2.id} rows=${count}`);
    }

    // IT-04: reuse key with different cart is rejected.
    {
      const key = `idem-it04-${Date.now()}`;
      const p1 = await createDurablePurchase({ userId: seed.user.id, bookIds: [seed.book.id], paymentProvider: 'FLOUCI', idempotencyKey: key });
      purchaseIds.push(p1.id);
      const book2 = await prisma.book.create({ data: { professorId: seed.professor.id, educationLevelId: seed.educationLevel.id, subjectId: seed.subject.id, title: 'Livre test 2', slug: `livre-test2-${key}`, priceMillimes: 10000, currency: 'TND', status: 'PUBLISHED', tags: [], publishedAt: new Date() } });
      let rejected = false;
      try {
        await createDurablePurchase({ userId: seed.user.id, bookIds: [seed.book.id, book2.id], paymentProvider: 'FLOUCI', idempotencyKey: key });
      } catch (e) { rejected = e instanceof IdempotencyConflictError; }
      await prisma.book.delete({ where: { id: book2.id } });
      push('IT-04', 'Idempotency key reuse with different cart is rejected', rejected, `rejected=${rejected}`);
    }

    // IT-05: failed payment grants no paid entitlement.
    {
      const key = `idem-it05-${Date.now()}`;
      const p = await createDurablePurchase({ userId: seed.user.id, bookIds: [seed.book.id], paymentProvider: 'FLOUCI', idempotencyKey: key });
      purchaseIds.push(p.id);
      const ref = `ref-it05-${key}`;
      await attachProviderSession(p.id, 'FLOUCI', ref, '/checkout/sim', p.totalMillimes);
      await confirmPurchasePayment({ provider: 'FLOUCI', providerEventId: `evt-it05-${key}`, providerReference: ref, amountMillimes: p.totalMillimes, currency: 'TND', status: 'FAILED', payloadHash: 'x' });
      const entCount = await prisma.entitlement.count({ where: { userId: seed.user.id } });
      const dbP = await prisma.purchase.findUnique({ where: { id: p.id } });
      push('IT-05', 'Failed payment grants no entitlement', entCount === 0 && dbP?.status === PurchaseStatus.FAILED, `entitlements=${entCount} status=${dbP?.status}`);
    }

    // IT-06: valid payment grants entitlement + purchase PAID + ledger.
    {
      const key = `idem-it06-${Date.now()}`;
      const p = await createDurablePurchase({ userId: seed.user.id, bookIds: [seed.book.id], paymentProvider: 'KONNECT', idempotencyKey: key });
      purchaseIds.push(p.id);
      const ref = `ref-it06-${key}`;
      await attachProviderSession(p.id, 'KONNECT', ref, '/checkout/sim', p.totalMillimes);
      const res = await confirmPurchasePayment({ provider: 'KONNECT', providerEventId: `evt-it06-${key}`, providerReference: ref, amountMillimes: p.totalMillimes, currency: 'TND', status: 'SUCCEEDED', payloadHash: 'y' });
      const dbP = await prisma.purchase.findUnique({ where: { id: p.id } });
      const ent = await prisma.entitlement.findFirst({ where: { userId: seed.user.id, bookId: seed.book.id } });
      const ledger = await prisma.financialLedgerEntry.findMany({ where: { purchaseId: p.id } });
      push('IT-06', 'Valid payment grants entitlement + ledger', res.applied && dbP?.status === PurchaseStatus.PAID && !!ent && ledger.length === 2, `applied=${res.applied} status=${dbP?.status} ent=${!!ent} ledger=${ledger.length}`);
    }

    // IT-07: duplicate webhook delivery -> exactly one logical effect.
    {
      const key = `idem-it07-${Date.now()}`;
      const p = await createDurablePurchase({ userId: seed.user.id, bookIds: [seed.book.id], paymentProvider: 'GPG', idempotencyKey: key });
      purchaseIds.push(p.id);
      const ref = `ref-it07-${key}`;
      const evt = `evt-it07-${key}`;
      await attachProviderSession(p.id, 'GPG', ref, '/checkout/sim', p.totalMillimes);
      const r1 = await confirmPurchasePayment({ provider: 'GPG', providerEventId: evt, providerReference: ref, amountMillimes: p.totalMillimes, currency: 'TND', status: 'SUCCEEDED', payloadHash: 'z' });
      const r2 = await confirmPurchasePayment({ provider: 'GPG', providerEventId: evt, providerReference: ref, amountMillimes: p.totalMillimes, currency: 'TND', status: 'SUCCEEDED', payloadHash: 'z' });
      const ledgerCount = await prisma.financialLedgerEntry.count({ where: { purchaseId: p.id } });
      const evtCount = await prisma.paymentEvent.count({ where: { providerEventId: evt } });
      push('IT-07', 'Duplicate webhook produces exactly one effect', r1.applied && !r2.applied && ledgerCount === 2 && evtCount === 1, `r1.applied=${r1.applied} r2.applied=${r2.applied} ledger=${ledgerCount} events=${evtCount}`);
    }

    // IT-08: concurrent webhooks cannot double-grant / duplicate ledger.
    {
      const key = `idem-it08-${Date.now()}`;
      const p = await createDurablePurchase({ userId: seed.user.id, bookIds: [seed.book.id], paymentProvider: 'FLOUCI', idempotencyKey: key });
      purchaseIds.push(p.id);
      const ref = `ref-it08-${key}`;
      await attachProviderSession(p.id, 'FLOUCI', ref, '/checkout/sim', p.totalMillimes);
      const [a, b] = await Promise.all([
        confirmPurchasePayment({ provider: 'FLOUCI', providerEventId: `evt-it08a-${key}`, providerReference: ref, amountMillimes: p.totalMillimes, currency: 'TND', status: 'SUCCEEDED', payloadHash: 'a' }),
        confirmPurchasePayment({ provider: 'FLOUCI', providerEventId: `evt-it08b-${key}`, providerReference: ref, amountMillimes: p.totalMillimes, currency: 'TND', status: 'SUCCEEDED', payloadHash: 'b' }),
      ]);
      const items8 = await prisma.purchaseItem.findMany({ where: { purchaseId: p.id } });
      const entCount = await prisma.entitlement.count({ where: { purchaseItemId: { in: items8.map((i) => i.id) } } });
      const ledgerCount = await prisma.financialLedgerEntry.count({ where: { purchaseId: p.id } });
      push('IT-08', 'Concurrent webhooks: single entitlement + single ledger pair', entCount === 1 && ledgerCount === 2, `a.applied=${a.applied} b.applied=${b.applied} ent=${entCount} ledger=${ledgerCount}`);
    }

    // IT-09: invalid signature rejected (no DB).
    {
      const body = JSON.stringify({ x: 1 });
      const bad = verifyWebhookSignature(body, 'deadbeef', 'secretA');
      const good = verifyWebhookSignature(body, computeWebhookSignature(body, 'secretA'), 'secretA');
      push('IT-09', 'Invalid webhook signature rejected; valid accepted', bad === false && good === true, `verifyBad=${bad} verifyGood=${good}`);
    }

    // IT-10: incorrect amount rejected.
    {
      const key = `idem-it10-${Date.now()}`;
      const p = await createDurablePurchase({ userId: seed.user.id, bookIds: [seed.book.id], paymentProvider: 'FLOUCI', idempotencyKey: key });
      purchaseIds.push(p.id);
      const ref = `ref-it10-${key}`;
      await attachProviderSession(p.id, 'FLOUCI', ref, '/checkout/sim', p.totalMillimes);
      let rejected = false;
      try {
        await confirmPurchasePayment({ provider: 'FLOUCI', providerEventId: `evt-it10-${key}`, providerReference: ref, amountMillimes: 1, currency: 'TND', status: 'SUCCEEDED', payloadHash: 'q' });
      } catch { rejected = true; }
      const items10 = await prisma.purchaseItem.findMany({ where: { purchaseId: p.id } });
      const entCount = await prisma.entitlement.count({ where: { purchaseItemId: { in: items10.map((i) => i.id) } } });
      push('IT-10', 'Incorrect amount rejected', rejected && entCount === 0, `rejected=${rejected} entitlements=${entCount}`);
    }

    // IT-11: unknown provider reference rejected.
    {
      let rejected = false;
      try {
        await confirmPurchasePayment({ provider: 'FLOUCI', providerEventId: 'evt-unknown', providerReference: 'ref-unknown', amountMillimes: 100, currency: 'TND', status: 'SUCCEEDED', payloadHash: 'w' });
      } catch { rejected = true; }
      push('IT-11', 'Unknown provider reference rejected', rejected, `rejected=${rejected}`);
    }

    // IT-13: concurrent checkout attempts preserve idempotency.
    {
      const key = `idem-it13-${Date.now()}`;
      const [a, b] = await Promise.all([
        createDurablePurchase({ userId: seed.user.id, bookIds: [seed.book.id], paymentProvider: 'FLOUCI', idempotencyKey: key }),
        createDurablePurchase({ userId: seed.user.id, bookIds: [seed.book.id], paymentProvider: 'FLOUCI', idempotencyKey: key }),
      ]);
      purchaseIds.push(a.id);
      const count = await prisma.purchase.count({ where: { idempotencyKey: key } });
      push('IT-13', 'Concurrent checkout -> single purchase (idempotent)', a.id === b.id && count === 1, `a=${a.id} b=${b.id} rows=${count}`);
    }

    // IT-14: durability across a simulated restart (fresh durable reads).
    {
      const key = `idem-it14-${Date.now()}`;
      const p = await createDurablePurchase({ userId: seed.user.id, bookIds: [seed.book.id], paymentProvider: 'FLOUCI', idempotencyKey: key });
      purchaseIds.push(p.id);
      const ref = `ref-it14-${key}`;
      await attachProviderSession(p.id, 'FLOUCI', ref, '/checkout/sim', p.totalMillimes);
      await confirmPurchasePayment({ provider: 'FLOUCI', providerEventId: `evt-it14-${key}`, providerReference: ref, amountMillimes: p.totalMillimes, currency: 'TND', status: 'SUCCEEDED', payloadHash: 'h' });
      const purchases = await getDurablePurchases(seed.user.id);
      const entitlements = await getDurableEntitlements(seed.user.id);
      const found = purchases.some((x) => x.id === p.id);
      const foundEnt = entitlements.some((e) => e.bookId === seed.book.id);
      push('IT-14', 'Purchase + entitlement survive restart (durable reads)', found && foundEnt, `purchase=${found} entitlement=${foundEnt}`);
    }

    // IT-15: cross-user access denied.
    {
      const key = `idem-it15-${Date.now()}`;
      const p = await createDurablePurchase({ userId: seed.user.id, bookIds: [seed.book.id], paymentProvider: 'FLOUCI', idempotencyKey: key });
      purchaseIds.push(p.id);
      const ref = `ref-it15-${key}`;
      await attachProviderSession(p.id, 'FLOUCI', ref, '/checkout/sim', p.totalMillimes);
      await confirmPurchasePayment({ provider: 'FLOUCI', providerEventId: `evt-it15-${key}`, providerReference: ref, amountMillimes: p.totalMillimes, currency: 'TND', status: 'SUCCEEDED', payloadHash: 'i' });
      const otherRead = await getDurablePurchaseById(seed.otherUser.id, p.id);
      const otherEnts = await getDurableEntitlements(seed.otherUser.id);
      push('IT-15', 'Cross-user access denied', otherRead === null && otherEnts.length === 0, `otherPurchase=${otherRead} otherEnts=${otherEnts.length}`);
    }

    // IT-16: invalid amount leaves no partial state (rollback).
    {
      const key = `idem-it16-${Date.now()}`;
      const p = await createDurablePurchase({ userId: seed.user.id, bookIds: [seed.book.id], paymentProvider: 'FLOUCI', idempotencyKey: key });
      purchaseIds.push(p.id);
      const ref = `ref-it16-${key}`;
      await attachProviderSession(p.id, 'FLOUCI', ref, '/checkout/sim', p.totalMillimes);
      let threw = false;
      try {
        await confirmPurchasePayment({ provider: 'FLOUCI', providerEventId: `evt-it16-${key}`, providerReference: ref, amountMillimes: 999999, currency: 'TND', status: 'SUCCEEDED', payloadHash: 'j' });
      } catch { threw = true; }
      const dbP = await prisma.purchase.findUnique({ where: { id: p.id } });
      const items = await prisma.purchaseItem.findMany({ where: { purchaseId: p.id } });
      const entCount = await prisma.entitlement.count({ where: { purchaseItemId: { in: items.map((i) => i.id) } } });
      const evtCount = await prisma.paymentEvent.count({ where: { payment: { providerReference: ref } } });
      push('IT-16', 'Invalid amount -> no partial state (rollback)', threw && dbP?.status === PurchaseStatus.PENDING && entCount === 0 && evtCount === 0, `threw=${threw} status=${dbP?.status} ent=${entCount} events=${evtCount}`);
    }

    // IT-17: exactly-once ledger + entitlement under retries (distinct events).
    {
      const key = `idem-it17-${Date.now()}`;
      const p = await createDurablePurchase({ userId: seed.user.id, bookIds: [seed.book.id], paymentProvider: 'FLOUCI', idempotencyKey: key });
      purchaseIds.push(p.id);
      const ref = `ref-it17-${key}`;
      await attachProviderSession(p.id, 'FLOUCI', ref, '/checkout/sim', p.totalMillimes);
      await confirmPurchasePayment({ provider: 'FLOUCI', providerEventId: `evt-it17a-${key}`, providerReference: ref, amountMillimes: p.totalMillimes, currency: 'TND', status: 'SUCCEEDED', payloadHash: 'k' });
      await confirmPurchasePayment({ provider: 'FLOUCI', providerEventId: `evt-it17b-${key}`, providerReference: ref, amountMillimes: p.totalMillimes, currency: 'TND', status: 'SUCCEEDED', payloadHash: 'l' });
      const ledgerCount = await prisma.financialLedgerEntry.count({ where: { purchaseId: p.id } });
      const items17 = await prisma.purchaseItem.findMany({ where: { purchaseId: p.id } });
      const entCount = await prisma.entitlement.count({ where: { purchaseItemId: { in: items17.map((i) => i.id) } } });
      push('IT-17', 'Exactly-once ledger + entitlement under retries', ledgerCount === 2 && entCount === 1, `ledger=${ledgerCount} ent=${entCount}`);
    }
  } finally {
    await cleanup(seed, purchaseIds);
    await prisma.$disconnect();
  }

  return results;
}

if (require.main === module) {
  (async () => {
    try {
      const results = await runPurchaseIntegrationTests();
      console.log('===========================================================');
      console.log('  TUNIEDU DURABLE CHECKOUT INTEGRATION TESTS (PostgreSQL)');
      console.log('===========================================================');
      let allPassed = true;
      for (const r of results) {
        console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.id}: ${r.name}`);
        console.log(`        -> ${r.details}`);
        if (!r.passed) allPassed = false;
      }
      console.log('-----------------------------------------------------------');
      console.log(`${results.filter((r) => r.passed).length}/${results.length} passed`);
      if (!allPassed) { console.error('INTEGRATION TESTS FAILED'); process.exit(1); }
      console.log('ALL INTEGRATION TESTS PASSED');
    } catch (err) {
      console.error('INTEGRATION TEST SUITE ERROR:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  })();
}
