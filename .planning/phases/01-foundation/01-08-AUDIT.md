---
phase: 1
plan: 08
type: audit
status: in-progress
audited_at: 2026-05-26
project_ref: zjyogswbgcauwqisvuyq
related: [01-07-AUDIT.md]
---

# Plan 1.8 — Schema "second half" audit findings

Plan 1.8 was originally written greenfield: create 5 migrations 0006-0010 covering SRS progress, simulados, purchases/webhooks/refunds, audit logs, and atomic Postgres functions. Just like Plan 1.7, the reuse decision (2026-05-26) requires us to audit what already exists in production and document gaps — not recreate.

Unlike Plan 1.7 (where the schema base was essentially complete), Plan 1.8 has **real gaps**: 7 of the 14 tables it would create are MISSING, and the atomic functions it specifies use naming conventions that don't match the legacy app's conventions. These gaps affect future Phases (4, 9, plus LGPD compliance).

## Tables — 14 expected, 7 exist, 7 missing

### ✅ Already in production

| Table | Plan 1.8 migration | Status |
|---|---|---|
| `user_flashcard_progress` | 0006 (SRS progress) | EXISTS (255 rows) |
| `srs_reviews` | 0006 (append-only log) | EXISTS (102 rows) |
| `mistake_notebook` | 0006 (caderno de erros) | EXISTS (0 rows) |
| `simulados` | 0007 (denormalized variant) | EXISTS (0 rows) |
| `question_attempts` | 0007 (answer-level data) | EXISTS (0 rows) |
| `purchases` | 0008 (Asaas purchases) | EXISTS (0 rows) |
| `refund_requests` | 0008 (LGPD/CDC art. 49 refunds) | EXISTS (0 rows) — SEE 01-07-AUDIT.md for RLS hardening pending |

### ❌ Missing — need creation

| Table | Plan 1.8 migration | Priority | Blocks |
|---|---|---|---|
| `webhook_events` | 0008 | 🔴 CRITICAL | Phase 4 (Asaas webhook idempotency) — without it, duplicate webhook delivery corrupts purchase state |
| `xp_events` | 0006 (gamification) | 🟡 MEDIUM | Phase 8 (admin/gamification); current XP system in `user_gamification` is denormalized |
| `simulado_runs` | 0007 (normalized runs) | 🟠 HIGH | Phase 9 (simulado feature) — current `simulados` table is denormalized (`question_ids` array + `results_json` jsonb), works for v1 but queries get awkward |
| `simulado_answers` | 0007 (per-question answers) | 🟠 HIGH | Phase 9 — same as above; could refactor to normalize OR keep current single-table approach |
| `audit_log` | 0009 (general audit) | 🟡 MEDIUM | LGPD compliance + operational debugging |
| `legal_audit_log` | 0009 (legal-grade audit) | 🟡 MEDIUM | LGPD compliance (article 41 + data subject rights) |
| `lgpd_deletion_requests` | 0009 (account deletion queue) | 🟡 MEDIUM | LGPD CDC compliance — OPS-06 requires account deletion endpoint |

## Atomic functions — 7 expected, 0 exact-name match, 3 functionally similar with different names

| Plan 1.8 expected | Legacy equivalent | Notes |
|---|---|---|
| `fn_award_xp(user_id, amount, idempotency_key)` | `award_review_points(p_rating text)` | Similar but different signature — spec is generic, legacy is rating-specific |
| `fn_grant_access(user_id, concurso_id, plan)` | (none — manual INSERT into `user_concurso_access`) | Missing — needed for Phase 4 webhook flow to grant access on `PAYMENT_CONFIRMED` |
| `fn_process_webhook_event(event_id, payload)` | (none — webhook handling lives in Edge Function `asaas-webhook` from legacy) | Missing — needs creation alongside `webhook_events` table |
| `fn_batch_upsert_progress(reviews jsonb)` | `batch_save_reviews(p_reviews jsonb)` | Functionally equivalent, different name — already exists |
| `fn_delete_user_cascade(user_id)` | (none) | Missing — LGPD deletion endpoint needs this |
| `fn_validate_cpf(cpf text)` | (none) | Missing — checkout form validation; spec optional |
| `fn_user_has_access(user_id, concurso_id)` | (none — `user_concurso_access` checked directly in RLS policies) | Missing under that name; equivalent logic inline in policies |

**Decision**: keep legacy naming conventions where functions exist (`award_review_points`, `batch_save_reviews`, `has_role`). Don't rename — that would break the legacy app and require coordinated updates across N call sites. Future creation: use legacy convention if possible (e.g., `grant_concurso_access` instead of `fn_grant_access`).

## Schema convention conflicts

| Convention | Plan 1.8 spec | Legacy |
|---|---|---|
| Function prefix | `fn_*` | (no prefix) — `has_role`, `award_review_points`, `batch_save_reviews` |
| Parameter prefix | `p_*` (consistent) | `p_*` (consistent — match) |
| Idempotency keys | spec wants UNIQUE (user_id, idempotency_key) on `xp_events` | (no equivalent in legacy) — XP is computed reactively from `srs_reviews` |
| Simulado normalization | runs + answers (3NF) | `simulados` table denormalized with arrays + jsonb |

**Decision**: keep legacy conventions. Plan 1.8 fill-gap migrations will use NO function prefix (`grant_concurso_access`, not `fn_grant_access`).

## Original PLAN.md task-by-task disposition

| Original Task | Disposition |
|---|---|
| 0006_srs_progress.sql (user_flashcard_progress, srs_reviews, xp_events, mistake_notebook) | SKIP recreate. CREATE only `xp_events` if/when needed for Phase 8 gamification revamp. Other 3 tables exist. |
| 0007_simulados.sql (simulado_runs, simulado_answers) | SKIP recreate. **Decision pending**: refactor `simulados` to normalized 2-table model for Phase 9, OR keep denormalized JSON approach? See "Recommendations" below. |
| 0008_purchases_webhooks.sql (purchases, webhook_events, refund_requests) | CREATE `webhook_events` (🔴 CRITICAL for Phase 4). Skip `purchases` + `refund_requests` (exist). |
| 0009_audit_logs.sql (audit_log, legal_audit_log, lgpd_deletion_requests) | CREATE all 3 (🟡 compliance) — sized per LGPD obligations + OPS-06 acceptance criteria. |
| 0010_atomic_functions.sql (fn_award_xp + 5 stubs + fn_validate_cpf + deferred FKs) | CREATE only what doesn't exist: `grant_concurso_access`, `process_webhook_event`, `delete_user_cascade` (LGPD). Skip rename of existing functions. Defer `validate_cpf` (optional). Skip "deferred FKs from 0003/0005" because those don't exist (would need to apply 0003 and 0005 first). |
| supabase/seed.sql | DEFER. Seed makes sense once we have a clean local Docker-based dev environment (Plan 1.6 Task 2.5). Until then, dev uses live Supabase project anyway. |
| `supabase db push --linked` BLOCKING | NOT APPLICABLE — applying new migrations in isolation, not the full 0006-0010 batch. |

## Recommended next-step sequence (NOT this session)

Each becomes a sub-plan with its own PR and impact analysis:

### Plan 1.8-A: webhook_events + process_webhook_event (🔴 CRITICAL — Phase 4 blocker)

- CREATE `webhook_events` with PK on `event_id` (Asaas event ID for idempotency)
- CREATE function `process_webhook_event(p_event_id text, p_payload jsonb)` that:
  - SELECT 1 FROM webhook_events WHERE event_id = p_event_id → if found, return (idempotent skip)
  - INSERT row, then call business logic (grant access, mark purchase paid, etc.)
- RLS: service-role only (webhook_events not user-facing)
- Estimated effort: 30-60 min

### Plan 1.8-B: simulado normalization decision + migration (🟠 HIGH — Phase 9 prep)

- Decision needed FIRST: refactor `simulados` to `simulado_runs` + `simulado_answers`, OR keep denormalized?
- If refactor: write migration that creates new tables, backfills from `simulados` jsonb, deprecates old columns, eventually drops them
- If keep: document the decision; Phase 9 uses `simulados.results_json` directly
- Estimated effort: 1-2h if refactor (with data migration test), 15 min if keep + document

### Plan 1.8-C: LGPD compliance tables + functions (🟡 MEDIUM — pre-launch blocker)

- CREATE `audit_log` (general operational), `legal_audit_log` (LGPD article 41), `lgpd_deletion_requests` (queue for OPS-06 endpoint)
- CREATE function `delete_user_cascade(p_user_id uuid)` — soft-delete with audit trail
- RLS: user can see their own audit entries; admin sees all; service-role writes
- Estimated effort: 60-90 min

### Plan 1.8-D: xp_events normalization (🟢 LOW — gamification revamp)

- Only if Phase 8 gamification redesign decides to revamp current `user_gamification` denormalized state
- Could be skipped entirely if current XP via `srs_reviews` is enough
- Estimated effort: TBD (depends on Phase 8 decisions)

## What this audit DOES change in this session

**Nothing functional applied** — Plan 1.8 audit is documentation only. No migrations created, no DDL applied.

**Files committed in this PR**:
- `01-08-AUDIT.md` (this document)
- `01-08-PLAN.md` annotated with pointer to AUDIT (preserving historical greenfield spec)
- `STATE.md` updated with progress + next-action options
- `REQUIREMENTS.md` FOUND-11 partial note updated (Plan 1.8 audited, gaps known)

## Self-Check

- 14 expected tables checked against `information_schema.tables`: 7 EXIST, 7 MISSING ✓
- 7 expected functions checked against `pg_proc`: 0 exact-match, 3 functionally similar via different names ✓
- `simulados` schema inspected for denormalization vs normalized spec: ✓
- 4 recommended sub-plans (1.8-A through 1.8-D) with priority + effort estimates ✓
- Naming convention conflict documented (`fn_*` prefix vs no prefix): ✓
- No DDL applied this session — audit-only document ✓

## Provenance

- `mcp__supabase__execute_sql` 2026-05-26T~14:00 — table existence check, function existence check, simulados schema introspection
- Reference: 01-07-AUDIT.md (sibling document covering Plan 1.7 schema)
