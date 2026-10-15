# ARCHITECTURE — verified runtime (not intended design)
```mermaid
flowchart LR
  U[Browser] -->|JWT cookie/Bearer or x-user-id dev fallback| MW[Edge middleware\nper-instance Map limiter + headers]
  MW --> R[Next.js App Router + API routes]
  R --> V[packages/validation\nSEC-04 strips client price]
  R --> A[apps/web/lib/authorization\ncheckBookAccess 401/403]
  R --> S[TuniEduStore\nin-memory singleton\nusers/books/purchases/entitlements/ledger]
  R --> P[packages/payments\nHMAC verifier + simulated adapter]
  R --> MT[lib/media-token\n15-min HLS tokens]
  R --> AI[lib/ai-tutor\nPII sanitize + routing]
  AI --> OAI[OpenRouter\nreal LLM via fetch]
  R --> LK[lib/livekit\nroom JWT + provisioning]
  LK --> SFU[(LiveKit SFU :7880)]
  R --> ST[lib/storage\nS3/MinIO presign + I/O]
  ST --> OBJ[(MinIO :9000)]
  R --> HLSG[lib/hls + /api/videos/:id/hls/[...path]\ntoken-gated ladder/segment proxy]
  HLSG --> OBJ
  R --> Q[lib/queue\nBullMQ producers]
  Q --> RD
  Q --> W[workers/runner.ts\nBullMQ consumer]
  W --> PDF[book-processing\npdf-lib count + pdfjs→WebP raster]
  W --> FF[ffmpeg REAL HLS ladder]
  W --> ST
  R --> N[lib/notifications\nemail/SMS log+HTTP+SMTP adapter]
  N --> ND[lib/notification-dispatch\nqueue-backed → notifications worker]
  R -->|checkout/webhook| DB[(PostgreSQL/Prisma\n0000_init applied)]
  S -.->|NOT wired (other domains)| DB
  R --> C[cache helper\nioredis → memory fallback]
  C --> RD[(Redis :6379)]
```
API→domain→DB map (payments — DURABLE): `api/checkout` validates → `requireApiSession` → `createDurablePurchase` (Prisma transaction: PENDING purchase + lines, server-derived price, idempotencyKey unique) → adapter returns `/checkout/gateway-simulation` URL → gateway page → signed `api/payments/webhook` (HMAC-SHA256, `verifyWebhookSignature`) → `confirmPurchasePayment` (Prisma transaction: payment event idempotency + entitlement + immutable ledger). Verified by tests/persistence/purchase-integration-tests.ts. The legacy in-memory `store.processCheckout` now has **zero callers** (dead code). Page/video/live token routes still: auth → store entitlement/ownership → token/metadata (in-memory).

Integrations (verified against local Docker): AI tutor → OpenRouter real LLM (INPDP-sanitized input, deterministic-template fallback; bounded retry/backoff + usage/latency/attempts telemetry; EXPLAIN and CORRECT_EXERCISE both real-LLM with template fallback); live rooms → LiveKit SFU (real room-join JWT + RoomServiceClient provisioning; clients join/publish via livekit-client; media-token fallback); object storage → MinIO/S3 (bucket ensure, PutObject/GetObject, presigned PUT/GET; video upload returns a presigned PUT; transcode worker uploads the real HLS ladder, served via the token-gated HLS proxy); cache → Redis (ioredis, memory fallback); queues → BullMQ (queue.ts producers + workers/runner.ts consumer, tests Q-01..03; `notifications` queue added); workers → pdf-lib REAL page count + pdfjs/dist canvas REAL PDF→WebP rasterisation (MED-05/06) + ffmpeg REAL HLS ladder (MED-01..04); notifications → email/SMS log+HTTP+SMTP adapter with queue-backed dispatch (NOTIF-01..10). Suites: infra 7/7, media 6/6, queue 3/3, notify 10/10, ai 7/7, persistence 16/16, security 37/37.

## Violations / coupling
1. Persistence bypass: MIGRATED for checkout/payments/entitlements/ledger (now Prisma-authoritative). Still open for other domains: books/pages, videos/HLS, live sessions, parent-child progress remain in the in-memory singleton; a restart still loses those.
2. Rate-limit split brain: edge Map (per instance) + redis helper (memory fallback) → no global enforcement across replicas.
3. Media without custody: LARGELY ADDRESSED — video upload issues a MinIO presigned PUT, live rooms are provisioned on the SFU, the transcode worker produces a real HLS ladder and uploads it to MinIO, and the manifest + a token-gated `hls/[...path]` proxy now serve the REAL ladder (master rewritten, segments fetched from storage). Remaining gap: each segment is gated by the same 15-min signed token minted after the entitlement check, but there is no per-segment entitlement re-check against the DB nor per-object signing.
4. Type divergence: store.User/LiveSession/Ledger vs usage — REPAIRED in this session (roles, LiveSession fields, BOOK_SALE, purchaseItemId, params types).
5. Secret defaults: code still carries hard-coded fallbacks (PaymentAdapter, media-token/jwt); `.env` now holds real dev values and `.gitignore` ignores all `.env*` except `.env.example`, but production must inject secrets via a manager, not files.
