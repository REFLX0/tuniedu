# OPERATIONS_RUNBOOK (minimal, safe)
- Webhook forgery spike: check SEC-07/WH logs; verify WEBHOOK_SECRET_KEY rotation plan; compare provider dashboard vs Payment/ledger; quarantine auto-entitlement grant; preserve raw payloads+headers (redact secrets).
- Credential exposure: rotate JWT/NEXTAUTH/MEDIA_TOKEN/WEBHOOK/S3/LIVEKIT/DB secrets; inspect Git history sharing; invalidate tuniedu_session cookies; force re-login.
- 401/403 surge: confirm getSessionUser path (Bearer→cookie→dev fallback); check NODE_ENV; inspect store vs expected identity.
- Media 403 spike: verify entitlement + token expiry (15m) + clock skew; check resourceId binding.
- DB/Redis outage: app currently falls back to memory (rate-limit/session/chat) — treat as DEGRADED, not healthy; restore service, then reconcile in-memory vs DB writes (none authoritative today).
- Failed deploy: keep prior artifact; do NOT migrate prod without backup + approval; roll forward only with green build+SEC suite.
- AI/PII incident: confirm sanitizePromptForInpdp executed pre-ingestion; purge offending logs/traces; assess provider retention.
