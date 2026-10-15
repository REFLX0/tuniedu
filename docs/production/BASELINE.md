# TuniEdu Production Readiness Dossier — BASELINE
Date: 2026-10-14 · Branch: main · HEAD: 30b4c1b
Auditor: Staff Engineering (evidence-driven, read-only where required)

## Repository identity
- Root: D:/EduTn/tuniedu · Monorepo workspaces: apps/*, packages/*, workers/*
- Package manager: npm 11.18.0 (lockfile: package-lock.json v3, npm workspaces)
- Runtime: Node v25.8.2 (CI pins Node 20)
- Prior agent work preserved: 35 modified tracked files + untracked UI/API additions.
- docs/production/ did NOT exist before this audit — created now.

## Execution environment
- Deps present: root node_modules, apps/web/node_modules installed.
- Services: PostgreSQL 16, Redis 7, MinIO, LiveKit NOT running (docker-compose config valid; no `docker compose up` executed).
- Prisma migrations: NONE present (prisma/ only has schema.prisma + seed.ts).

## Feature inventory (actual implementation → state)
| Feature | Implementation | Persistence | Ext deps | State |
|---|---|---|---|---|
| AuthN (JWT cookie/Bearer) | apps/web/lib/auth.ts:createSessionToken/verifySessionToken/getSessionUser | stateless JWT (secret from env) | none | IMPLEMENTED, tested via SEC-01 indirectly |
| Dev fallback (x-user-id) | auth.ts:104-122, gated NODE_ENV!=='production' | n/a | none | IMPLEMENTED, conditionally disabled in prod (UNVERIFIED at runtime) |
| Checkout (price safe) | api/checkout/route.ts → store.processCheckout; validateCheckout ignores client price (SEC-04) | in-memory store (NOT Prisma) | none | PARTIAL — logic correct, persistence NOT authoritative |
| Entitlements + academic-year snapshot | store.processCheckout lines 1491-1530; hasActiveEntitlement | in-memory | none | SIMULATED (no Prisma usage in route) |
| Idempotency | store.purchases.find(idempotencyKey) | in-memory | none | SIMULATED durability (lost on restart) |
| Financial ledger | store.ledger push SALE + PLATFORM_COMMISSION; types in schema.prisma | in-memory | none | SIMULATED (immutable-ledger claim unsupported) |
| Payments (Flouci/Konnect/GPG) | packages/payments/PaymentAdapter simulated checkout URL + sandbox secret default | none | NONE integrated | SIMULATED |
| Webhook verify | packages/payments/verifyWebhookSignature (HMAC, timingSafeEqual) | none | none (generic HMAC) | VERIFIED, no per-provider contract |
| Books/pages delivery | api/books/[bookId]/pages → store + watermark metadata, Cache-Control: no-store | in-memory | none | PARTIAL (no real PDF bytes) |
| PDF worker | workers/book-processing: 12 hardcoded pages | none | none (no pdf lib) | SIMULATED |
| Videos/HLS + tokens | api/videos/[videoId]/token → entitlement check + generateMediaToken(15m); manifest template | in-memory | LiveKit (not running), MinIO (not running) | PARTIAL (tokens real, hosting simulated) |
| Video transcoding | workers/video-transcoding: hardcoded duration/assets | none | FFmpeg NOT invoked | SIMULATED |
| LiveKit rooms/chat | api/lives/*: auth + entitlement + in-memory state | in-memory | LiveKit (not deployed) | PARTIAL (authz real, media UNVERIFIED) |
| AI tutor + PII | ai-tutor.sanitizePromptForInpdp + curriculum routing | in-memory | NO real AI provider call | PARTIAL (sanitization verified, generation local) |
| Parent-child | api/parent/progress + ParentChildLink in store/Prisma | in-memory | none | PARTIAL (SEC-11 helper verified) |
| Rate limiting | middleware edge Map + redis-backed helper (falls back to memory) | memory/redis-if-up | Redis (not running) | PARTIAL — edge limiter is per-instance |
| i18n RTL | language-context FR/AR, dir=rtl | n/a | none | IMPLEMENTED (visual, not e2e-tested) |

## Tests available
- npm run test:security (tsx tests/security/runner.ts) — 22 executed PASS
- tests/security/webhook-tests.ts — 10 executed PASS
- apps/web tsc --noEmit — PASS (this session, after type fixes)
- lint — FAIL: eslint-config-next flat-config resolution broken
- build — FAIL: lint gate + generated route-type mismatch (fixed source; residual React19 styled-jsx prerender crash)
- Prisma validate — PASS
