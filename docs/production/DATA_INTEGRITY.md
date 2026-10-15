# DATA_INTEGRITY
## Migration baseline — ADDED THIS SESSION (2026-10-14)
- `prisma/migrations/0000_init/migration.sql` generated via `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma` (1168 lines, UTF-8).
- Status: GENERATED, NOT YET VALIDATED against a live database (no disposable Postgres in this env; not authorized to start infra). Applying it requires a disposable DB + approval.
- Once applied on a disposable DB, run `prisma migrate deploy` + `prisma migrate status` to prove fresh init, then `npm run prisma:seed`.

## Persistence reality (unchanged)
- Authoritative store today: apps/web/lib/store.ts singleton (users, purchases, entitlements, ledger, links, sessions, videos, lives, AI, D17, cards, community).
- No route writes via Prisma yet; no $transaction usage. Checkout/entitlement/ledger remain in-memory.
- Consequence: restart wipes business state; replicas diverge; "immutable ledger" is an in-memory array; idempotency survives only per-process.

## Verified financial invariants (helper level)
- SEC-08: 25000 mil @2000bps → 5000 platform + 20000 author, integer math, executed PASS.
- Entitlement rule enforced in helpers: startsAt <= now < expiresAt (SEC-12 PASS).
- Checkout sums store price only (SEC-04 PASS); no client price accepted by schema.
- Payment state machine rejects CREATED→SUCCEEDED (SEC-05 PASS).

## Missing durability (open)
- No DB tables created here; no UNIQUE(idempotencyKey/eventId) enforced at runtime; no FK/append-only constraints active; no transaction boundaries; no restart/recovery evidence.
- Concurrency/failure matrix (double webhook, crash mid-issuance, refund vs payout race): UNVERIFIED — requires Prisma + durable outbox.
- Seed safety: seed.ts uses fixed IDs; run only against disposable/dev DBs; never point at production.
