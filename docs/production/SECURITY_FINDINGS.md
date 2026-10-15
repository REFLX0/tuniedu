# SECURITY_FINDINGS (severity → evidence → remediation → retest)
## P0 — Critical
1. Webhook sandbox bypass in production verifier — REMEDIATED & RETESTED.
   Evidence: packages/payments/index.ts previously accepted `sig_valid_*` / `hash_<secret-prefix>`; diff now removes that block, keeping timingSafeEqual hex+base64.
   Retest: webhook-tests 10/10 PASS; SEC-07 text repaired ("bypass patterns rejected"); SEC-21 PASS. NOT declaring provider integration — only generic HMAC.

## P1 — High
2. `.env.example` credential exposure in tracked file + Git history — PARTIAL.
   Evidence: working tree now has 25 vars, 0 dupes, only CHANGE_ME placeholders (machine-checked).
   Remaining: prior values persist in history (30b4c1b-era diff); treat as potentially exposed → rotate all real secrets, inspect sharing scope. `.env.example` stays tracked as template (per gitignore `!.env.example`) only because values are now placeholders.
3. Hardcoded dev secrets in code paths: PaymentAdapter default, JWT/auth/media-token fallbacks, docker-compose passwords/keys.
   Evidence: packages/payments/index.ts:129, apps/web/lib/auth.ts:25, lib/media-token.ts:8, docker-compose.yml.
   Remediation: required-secret validation at startup (fail closed), rotate, no defaults in production code. NOT done — needs explicit secret-management decision.
4. Next.js 15.3.3 critical advisories (RCE/SSRF/cache/XSS/DoS families) + postcss/sharp.
   Evidence: npm audit --omit=dev exit 1. Remediation: upgrade next (+regression). NOT done — would churn framework; needs scheduled window.

## P2 — Medium
5. Auth bypass surface: `x-user-id` dev fallback (auth.ts:104-122) + `store.currentUserId` fallback in routes (`sessionUser?.id || store.currentUserId`).
   Evidence: present in ~17 routes; NODE_ENV gate exists but runtime prod behavior UNVERIFIED.
   Remediation: remove fallback from prod paths or fail closed when no session; regression test prod config.
6. Distributed rate-limit weakness: edge Map per instance; chat/polling paths lack server entitlement checks on GET chat.
   Evidence: middleware.ts Map; chat GET returns messages without membership check; rate-limit.ts memory fallback.
7. Media TOKEN ≠ entitlement: manifest authenticates token only, never re-checks entitlement or object existence.
8. Upload validation shallow: PDF %PDF- prefix only; video ftyp only; no size/type/zip-bomb/isolation enforcement at ingestion.
9. Missing DB constraints for money/entitlement invariants (no migrations exist to review).

## Regression coverage added this session
- WH-01..WH-10 (webhook-tests.ts): valid hex/base64 accepted; invalid, modified body, both bypass patterns, missing/empty/malformed/wrong-secret rejected.
- SEC-07 hardened to assert bypass rejection.
