# PHASE CHECKLIST (continuation session)
Updated: 2026-10-14 · Branch main@30b4c1b

## Legend: DONE+RETESTED / PARTIAL / BLOCKED / NOT STARTED

## Phase A — Security & authorization
- [x] Fail-closed session guard added (`requireApiSession` in apps/web/lib/auth.ts) — DONE+RETESTED (AS-01..05 PASS)
- [x] Removed `sessionUser?.id || store.currentUserId` fallback from all 17 API routes — DONE (0 occurrences remain in API code)
- [x] Chat GET read path now requires session — DONE
- [x] `/api/auth/me` no longer leaks simulated store user — DONE
- [x] Dev `x-user-id` proven inert under NODE_ENV=production — DONE+RETESTED (AS-04/05)
- [x] New suites wired into CI + `npm run test:security:all` — DONE (22+10+5 = 37 PASS)
- [ ] HTTP-level tests via a running server (current tests call handlers/helpers directly, not over TCP) — PARTIAL
- [ ] Client pages still read `store.getCurrentUser()` (UI-only; no server data exposure) — PARTIAL (flagged)

## Phase B — Database & data integrity
- [x] Prisma migration baseline + fresh disposable-DB init — DONE+RETESTED (0000_init applied to disposable DB `tuniedu-postgres-b3`:5435/tuniedu_test via `prisma migrate deploy`)
- [x] Wire checkout/entitlement/ledger through Prisma transactions — DONE+RETESTED (POST /api/checkout → createDurablePurchase(Prisma PENDING) → signed webhook → confirmPurchasePayment(Prisma tx: entitlement + immutable ledger))
- [x] Idempotency/duplicate-event durable uniqueness — DONE+RETESTED (idempotencyKey unique; providerEventId unique; tests/persistence suite 16/16 PASS incl. concurrent checkout/webhook)
- [x] Migrate the 2 stray in-memory `store.processCheckout` callers to durable paths — DONE (catalogue quick-buy → /api/checkout; gateway sim → /api/payments/simulate; 0 call sites remain)
- [ ] Remaining domains (books/pages, videos/HLS, live, parent) still in-memory — PARTIAL (flagged)

## Phase C — Payments & webhooks
- [x] Webhook bypass removed + regression-tested — DONE (prior session, re-verified this session)
- [ ] Provider-specific contract (Flouci/Konnect/GPG) + real checkout + replay persistence — BLOCKED (no credentials)

## Phase D — Content/media/workers
- [x] Real PDF processing — DONE+RETESTED (pdf-lib page count/dimensions; MED-05)
- [x] Real PDF rasterisation — DONE+RETESTED (pdfjs-dist + @napi-rs/canvas → WebP pages; runner uploads to boards bucket `rendered/<bookId>/v<n>/`; MED-06)
- [x] Real FFmpeg transcoding — DONE+RETESTED (ffmpeg HLS 4-rendition ladder + ffprobe duration; runner uploads to MinIO; MED-01..04)
- [x] HLS delivery (real ladder served) — DONE (GET /api/videos/[videoId]/hls/[...path] token-gated playlist/segment proxy + manifest rewrite; lib/hls.ts)
- [x] Manifest entitlement re-check (token≠entitlement) — PARTIAL (token is minted only after the entitlement check in /token; HLS route re-verifies the signed token; per-segment entitlement re-check against the DB is still not performed)
- [x] LiveKit wired — real room JWT + room provisioning against the running SFU — DONE+RETESTED (INF-06/07); client player now joins the SFU (StudentLivePlayer) and publishes (TeacherBroadcastStudio); chat membership/reconnect still placeholders
- [x] Object storage wired — MinIO bucket + put/get + presigned upload — DONE+RETESTED (INF-02..04); real HLS ladder uploaded by worker + served via the token-gated route; rendered PDF pages uploaded to boards
- [x] Client players consume real tokens — DONE (hls.js + livekit-client; SecureVideoPlayer/StudentLivePlayer/TeacherBroadcastStudio)
- [x] Book upload producer — DONE (POST /api/books/upload multipart → manuscripts bucket + enqueueBookPdf; runner downloads manuscript + rasterises)

## Phase E — AI & privacy
- [x] PII sanitization + curriculum routing verified — DONE (SEC-25/26)
- [x] Real provider wiring — OpenRouter LLM (INPDP-sanitized input, template fallback, generation source surfaced) — DONE+RETESTED (live smoke)
- [x] AI hardening — DONE+RETESTED (bounded retry/backoff on 429/5xx/timeout, usage + latency + attempts telemetry, real LLM CORRECT_EXERCISE via strict-JSON contract with template fallback; AI-01..07)
- [ ] Provider data-retention terms + production model selection — BLOCKED (legal/provider decision)

## Phase F — Build/types/lint/deps
- [x] tsc apps/web — PASS (this session)
- [x] ESLint config root cause fixed (FlatCompat bridge for legacy eslint-config-next@15.3.3 presets) — DONE
- [x] Lint rule violations green — DONE (0 problems at `eslint . --max-warnings 0`; 123 fixed manually, no suppression)
- [x] Production build green — DONE (next 15.5.27; 32/32 static pages)
- [x] Dependency audit clean — DONE for production (`npm audit --omit=dev` → 0). Residual: dev-only `braces` advisory (no upstream fix)
- [x] Duplicate React root cause fixed (next-auth peer next@16 hoist) → single react 19.1.0

## Phase G — Functionality/UX · Phase H — Infra/ops · Phase I — Testing/failure
- [x] Redis connectivity verified via the app client (ioredis SET/GET + cache) — DONE
- [x] BullMQ → workers wiring — DONE+RETESTED (apps/web/lib/queue.ts producers + workers/runner.ts consumer; Q-01..03 PASS; api/videos/upload enqueues)
- [x] Notifications abstraction (email/SMS) — DONE+RETESTED (apps/web/lib/notifications.ts; NOTIF-01..10; log + HTTP gateway + dependency-free SMTP providers; queue-backed dispatch via lib/notification-dispatch.ts + worker `notifications` queue; wired into live-start; book upload producer enqueues book-pdf)
- [ ] Mostly NOT STARTED / BLOCKED — dependent on infra + build gates above.
