# RELEASE_CHECKLIST — per-capability gates
## Accounts/auth: CONDITIONAL (demo only)
- [x] Helper authz tests pass (SEC-01..03,09..11) — executed
- [ ] HTTP-level login/session/logout + x-user-id impossible in prod — NOT RUN
- [ ] Cookie Secure/HttpOnly/SameSite + rotation — UNVERIFIED
## Paid books: NO-GO
- [x] Server-price + state-machine + commission helpers — executed
- [ ] Durable payment/entitlement/ledger via Prisma + restart proof — BLOCKED (no DB/migrations)
- [ ] Provider-confirmed success + replay-safe webhook route — BLOCKED (no provider/webhook route)
## Professor publishing: NO-GO
- [x] Ownership/publish helpers — executed
- [ ] End-to-end draft→review→publish→student visibility with persistence — NOT RUN
## Video/transcode: NO-GO
- [x] Token issue/verify + watermark data — executed (SEC-19/20/23/24 helper-level)
- [ ] Real transcode + object custody + manifest ACL — NOT IMPLEMENTED
## Live streaming: NO-GO
- [x] Room token + chat validation helpers — executed
- [ ] LiveKit deploy + join/start/end/reconnect + chat membership — BLOCKED
## AI tutoring: NO-GO as production AI
- [x] PII sanitize + curriculum routing — executed (SEC-25/26)
- [ ] Real provider call + retention/error/quota handling — NOT INTEGRATED
## Admin/ops: NO-GO
- [x] Security-event/audit models exist in schema
- [ ] Backups/restore/monitoring/runbook rehearsal — UNVERIFIED
## Build/quality gates: FAIL
- [x] tsc apps/web — PASS (this session)
- [ ] lint — FAIL (config/dependency mismatch)
- [ ] build — FAIL (lint gate + residual styled-jsx/React19 prerender)
- [ ] audit — FAIL (next critical advisories)
