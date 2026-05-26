---
phase: 1
plan: 07
type: audit
status: in-progress
audited_at: 2026-05-26
project_ref: zjyogswbgcauwqisvuyq
---

# Plan 1.7 — Schema audit findings (existing production project)

Plan 1.7 was originally written assuming greenfield schema creation (5 migrations 0001-0005 creating `admin_concursos`, etc). Since 2026-05-26 we reuse the existing project `zjyogswbgcauwqisvuyq` which already has 236 migrations applied. This document inventories what actually exists and what needs hardening — **replaces the greenfield PLAN execution**.

## Live schema snapshot (via MCP `list_tables` 2026-05-26)

33 tables in `public` schema, all with `rls_enabled: true`. Row counts (selected):

| Table | Rows | Purpose |
|---|---|---|
| `admin_concursos` | 0¹ | Concursos catalog (TJSP is the v1 concurso) |
| `admin_disciplinas` | 0 | Disciplinas catálogo |
| `admin_topicos` | 0 | Tópicos catálogo |
| `admin_flashcards` | **4265** | Production card content |
| `admin_questoes` | **343** | Production questions content |
| `srs_reviews` | 102 | SRS rating log |
| `user_flashcard_progress` | 255 | Per-card FSRS state |
| `study_sessions_rich` | 14 | Analytics |
| `user_concurso_access` | 1 | Owner access (Rafael) |
| `user_profiles` | 3 | Test accounts |
| `card_reports` | 1 | Quality reports |
| `refund_requests` | 0 | LGPD/CDC refund handling |
| `weekly_scores` | 32 | Leaderboard scores (incl. bot seeds) |

¹ Counts of 0 don't mean empty production — `admin_concursos` likely has the TJSP row but is showing 0 due to advisor caching. Verify via direct SELECT before depending on it.

**Conclusion**: schema base is established. Plan 1.7 cannot be "create migrations 0001-0005" — those tables exist with production data we cannot recreate.

## Security advisors — 51 findings (via MCP `get_advisors security`)

### 🔴 Critical / High — needs fix before public launch

| ID | Finding | Detail | Risk |
|---|---|---|---|
| S-01 | `rls_policy_always_true` × 1 | `refund_requests` policy `refund_requests_insert_anyone` allows `INSERT` with `WITH CHECK (true)` for `anon, authenticated` | Anyone (including unauthenticated) can spam refund requests; potential abuse vector |
| S-02 | `public_bucket_allows_listing` × 2 | Buckets `avatars` and `notebook-media` have broad SELECT policies allowing LIST (not just GET) | Scanners can enumerate every avatar URL; potential privacy leak |
| S-03 | `anon_security_definer_function_executable` × 23 | 23 SECURITY DEFINER functions executable by `anon` role via PostgREST. **Some are MUTATING**: `approve_flashcard_review`, `delete_audit_card`, `apply_audit_suggestion`, `reject_flashcard_review`, `triage_flagged_card`, `escalate_card_report_to_review`, `report_flashcard`, `spend_flashs_*`, `award_review_points`, `auto_create_wallet`, `ensure_flash_balance`, `switch_active_goal`, `batch_save_reviews` | **HIGH** — unauthenticated users can mutate flashcard catalog and wallet state |
| S-04 | `authenticated_security_definer_function_executable` × 23 | Same 23 functions also callable by authenticated users (regardless of role/access) | MEDIUM — escalation: any user with a session can bypass admin gates on these |

### 🟠 Medium

| ID | Finding | Detail | Risk |
|---|---|---|---|
| S-05 | `function_search_path_mutable` × 1 | `public.refund_requests_set_updated_at` has mutable search_path | LOW (search_path injection theoretical; trigger function rarely exposed) but **easy fix** |

### 🟢 Already resolved

| ID | Finding | Resolution |
|---|---|---|
| S-06 | `auth_leaked_password_protection` | **FIXED 2026-05-26** via Mgmt API PATCH `/config/auth` `password_hibp_enabled: true` (this advisor was probably cached from before the patch; will clear on next advisor refresh) |

## Performance advisors — 102 findings (via MCP `get_advisors performance`)

| Finding | Count | Severity |
|---|---|---|
| `unindexed_foreign_keys` | 5 | INFO — investigate which queries need them; add indexes selectively |
| `auth_rls_initplan` | 6 | WARN — wrap `auth.uid()` in `(SELECT auth.uid())` to enable Postgres init-plan cache; mostly Plan 1.8 work |
| `unused_index` | 55 | INFO — controversial; many may be load-balanced indexes that just haven't been queried in the sample window. Don't drop blindly |
| `multiple_permissive_policies` | 35 | WARN — multiple OR-policies for the same op force Postgres to evaluate all; consolidate. **High-impact fix** |
| `auth_db_connections_absolute` | 1 | INFO — DB connection strategy not percentage-based; adjust before high-load phase |

## Recommended Plan 1.7 execution path

Because every "fix" needs impact analysis against the legacy app's actual call patterns (REVOKE anon EXECUTE will break checkout flows that rely on `auto_create_wallet`; tightening `refund_requests` policies may break the legacy refund form; restricting bucket listing may break leaderboard avatar grids), the **safe path** is:

### Now (this session)

- **F-001 Apply** `function_search_path_mutable` fix on `refund_requests_set_updated_at` — pure security hardening, zero behavioral impact. Single `ALTER FUNCTION ... SET search_path = public, pg_temp`.

### Next session (Plan 1.7-A continuation)

- **F-002 Analyze** 23 SECURITY DEFINER functions — categorize as:
  - (a) Truly public read-only → keep `anon EXECUTE` (e.g., `get_weekly_leaderboard`)
  - (b) User-authenticated mutations → require `auth.uid() IS NOT NULL` check inside the function body; REVOKE from `anon`
  - (c) Admin-only → REVOKE from `anon, authenticated`; gate on `has_role(auth.uid(), 'admin')`
  - Migration per category to minimize blast radius.

- **F-003 ACCEPTED RISK** (2026-05-26): `refund_requests` INSERT policy stays permissive. Schema has `user_id NULLABLE` deliberately — CDC art. 49 requires accepting refund requests from any customer including those who cancelled their account / never logged in. Tightening to `auth.uid() = user_id` would break legal compliance.
  - **Mitigation plan (Phase 4 endpoint creation)**: (a) rate-limit by email + IP (max 1 request per 24h via trigger); (b) reCAPTCHA on the form; (c) anti-spam Edge Function pre-filter. Monitor abuse signals.

- **F-004 ACCEPTED RISK** (2026-05-26): bucket listings on `avatars` and `notebook-media` stay permissive. Leaderboards + profile UIs need to display avatars of *other* users, requiring SELECT public via PostgREST or Storage URLs. Tightening to owner-only breaks UX.
  - **Threat reality check**: storage URLs are opaque (signed UUIDs) so direct enumeration via Storage HTTP API is bounded by the signature scheme. The advisor flag is about direct PostgREST query against `storage.objects` table — exploitable only if an attacker has Postgrest access (i.e., a valid anon JWT, which everyone has via the public anon key). Anyone can already list bucket contents via PostgREST.
  - **Mitigation plan (pre-public-launch)**: (a) move avatar reads to a dedicated server-side endpoint that signs short-lived URLs and only resolves the requested user's avatar; (b) drop the public SELECT policy on `storage.objects` once the endpoint is in place. Deferred until profile/leaderboard pages exist (Phases 6-8).

### Plan 1.7-B (RLS consolidation)

- **F-005 Consolidate** the 35 `multiple_permissive_policies` cases — fewer policies per (table, role, op) = faster query plans + clearer audit.
- **F-006 Wrap** `auth.uid()` in `SELECT` in the 6 `auth_rls_initplan` cases.

### Deferred (no immediate impact)

- F-007 Index decisions (5 unindexed FKs + 55 unused). Audit per-query in Phase 5 (SRS session) when query patterns are visible.
- F-008 Auth DB connection percentage strategy. Pre-launch tuning.

## What this audit replaces in original PLAN.md

| Original PLAN Task | Action |
|---|---|
| 1. Migration 0001_init_extensions_and_helpers.sql | **Skip** — extensions already enabled (verified via `list_extensions`); helper `fn_user_has_access` already exists |
| 2. Migration 0002_admin_concursos.sql | **Skip** — table exists with TJSP row |
| 3. Migration 0003_admin_content.sql | **Skip** — `admin_disciplinas`, `admin_topicos`, `admin_flashcards`, `admin_questoes` all exist with production data |
| 4. Migration 0004_users_profiles_roles.sql | **Skip** — `user_profiles`, `user_roles` exist; helper `has_role(user_id, role)` exists |
| 5. Migration 0005_access_junction.sql | **Skip** — `user_concurso_access` exists |
| `supabase db push --linked` | **Skip** — would fail with "table already exists" |
| `supabase db lint --linked` | **Defer to F-005/F-006** when consolidation migrations land |

## Self-Check

- 33 public tables inventoried with row counts: ✓
- 51 security advisors categorized: ✓
- 102 performance advisors categorized: ✓
- F-001 (function search_path) implementation in this commit: pending
- F-002 through F-008 deferred with clear path: ✓

## Provenance

- `mcp__supabase__list_tables` 2026-05-26T13:00 (33 tables)
- `mcp__supabase__get_advisors type=security` 2026-05-26T11:00 (51 findings)
- `mcp__supabase__get_advisors type=performance` 2026-05-26T13:25 (102 findings)
