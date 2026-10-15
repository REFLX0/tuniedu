# THREAT_MODEL
Assets: accounts/sessions, paid content, payment/ledger integrity, minors' PII, professor content, secrets.
Boundaries: edge middleware → API handlers → helpers → store/Prisma → workers → external services.

Attackers: anonymous web user, authenticated cross-account user, malicious professor/parent, payment forger, content scraper.
Key paths & mitigations (verified where noted):
- Price tampering → neutralized: validateCheckout drops priceMillimes; server sums store prices. EXECUTED (SEC-04).
- Webhook forgery → REPAIRED: generic HMAC-SHA256 + timingSafeEqual, bypass patterns removed + regression tests (WH/SEC-07/SEC-21). Provider-specific canonicalization still UNVERIFIED.
- IDOR/BOLA → helper checks exist (SEC-02/03/09/11); page/video/live routes enforce. EXECUTED at helper level, NOT via live HTTP.
- Cross-role → verified helpers; video/live upload checks roles + VERIFIED professor status for AI review (videos upload route checks role only — gap noted).
- Session hijack → JWT HS256 + HttpOnly/SameSite-lax cookie; dev x-user-id gated NODE_ENV!=='production' (fail-closed at runtime UNVERIFIED).
- Rate abuse → per-instance Map (bypassable multi-replica) + redis helper w/o running Redis. MEDIUM residual.
- Replay/idempotency → checkout idempotencyKey dedupes in memory only; webhook dedup persistence ABSENT.
- PII leak to AI → sanitizePromptForInpdp before ingestion, tested (SEC-25); provider retention/legal posture UNASSESSED.
- Secrets → .env.example sanitized; PaymentAdapter default secret + JWT/media/token fallbacks + compose creds REMAIN — rotation + startup validation outstanding.
- Supply chain → next 15.3.3 critical advisories present; fix requires upgrade + regression run.
