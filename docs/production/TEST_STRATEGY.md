# TEST_STRATEGY — what runs, what it proves, what is missing
Executed here: security suite 22/22, webhook suite 10/10, tsc (web) PASS, prisma validate PASS.
Meaningful: helper-level authz/entitlement/commission/webhook/PII/curriculum assertions — NOT e2e.
Gaps (no invented coverage): HTTP-level auth tests, DB persistence/restart, concurrency/duplicate-event, storage ACL, worker recovery, browser/a11y/RTL, load/chaos, provider sandbox.
Quality gates required before any GO: build+lint green, schema+migration on disposable DB, idempotency/duplicate-event integration, media ACL tests, restored backup proof, secret scan, dependency upgrade regression.
CI today runs test:security + build only; build is currently RED in this env (lint config + residual prerender issue).
