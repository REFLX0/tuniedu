# FEATURE_INVENTORY — scope classification for the release decision
Scope rule: simulated features never count as production features.

## Production-critical (advertised product)
| Feature | Classification | Evidence |
|---|---|---|
| Student registration/login/logout | PARTIAL — login route demo-maps roles, sessions JWT-issued, no password hashing path used | apps/web/app/api/auth/login/route.ts |
| Checkout with server-side pricing | PARTIAL — SEC-04 validation correct; pricing/posting in-memory | api/checkout/route.ts, packages/validation |
| Verified payment confirmation | SIMULATED — no provider event path; gateway-simulation page | PaymentAdapter, gateway-simulation/page.tsx |
| Entitlements + expiry | SIMULATED durability — correct boundary logic, memory-only | store.hasActiveEntitlement, Entitlement |
| Protected PDF pages | INCOMPLETE — metadata+watermark only, no PDF bytes | pages/[pageNumber]/route.ts |
| PDF upload/processing | SIMULATED — worker returns 12 hardcoded pages | workers/book-processing |
| Video upload/transcode/playback | SIMULATED — no FFmpeg, hardcoded HLS assets | workers/video-transcoding |
| Live classes/chat | PARTIAL — authz+chat rate-limited; LiveKit undeployed | api/lives/* |
| AI tutor/curriculum | PARTIAL — PII sanitization + routing verified; no provider wired | lib/ai-tutor.ts |
| Parent linking | PARTIAL — SEC-11 helper verified; no Prisma persistence path | api/parent/progress |
| Professor publish/verify | PARTIAL — helpers verified; enforcement partial in routes | SEC-09/10 tests, lives/videos upload |
| Admin/moderation/payouts | INCOMPLETE — ledger in-memory, no payout workflow persisted | store.ledger |
| Rate limits/sessions | PARTIAL — edge limiter per-instance; redis helper unfixed infra | middleware.ts, lib/rate-limit.ts, session-manager |
| Arabic RTL/i18n | IMPLEMENTED (frontend) — e2e/a11y NOT measured | language-context |

## Optional / explicitly excluded from GO scope
- LiveKit streaming, stored HLS, real PDF rendering, provider-confirmed payments,
  professor payouts, push/email/SMS notifications, production observability —
  all must be excluded or marked BLOCKED rather than simulated.
