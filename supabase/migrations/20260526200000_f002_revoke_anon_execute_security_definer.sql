-- F-002 — REVOKE EXECUTE FROM anon on SECURITY DEFINER public functions
-- ============================================================================
--
-- Context: Plan 1.7 audit (.planning/phases/01-foundation/01-07-AUDIT.md)
-- identified 23 SECURITY DEFINER functions in the public schema exposed
-- to the anonymous PostgREST role.
--
-- SECURITY DEFINER means the function runs as its OWNER (postgres in
-- our case), bypassing RLS policies. Combined with a permissive anon
-- EXECUTE grant, the only barrier between an anonymous request and
-- privileged DB ops is the function body's internal auth check —
-- which historically was inconsistent across the legacy codebase.
--
-- Strategy: ALLOWLIST a small set of truly anon-callable helpers, then
-- REVOKE EXECUTE from anon on every OTHER SECURITY DEFINER public
-- function. This handles signature drift across overloads without us
-- having to enumerate exact argument types — pg_proc loop matches by
-- function OID.
--
-- Function bodies retain their own auth.uid()/has_role() checks as
-- defence in depth. This migration just removes the loose anon grant.
--
-- The three tiers:
--   PUBLIC anon-callable (allowlist) → leaderboard, has_role (RLS uses
--     it in caller's role context), flashcard_heuristic_flags (pure fn)
--   AUTHENTICATED ONLY → all user-scoped mutations
--   SERVICE_ROLE ONLY  → grant_concurso_access + process_webhook_event
--     (webhook is the only legitimate caller)
--
-- Verification queries at the bottom.
-- ============================================================================

BEGIN;

-- ------------------------------------------------------------------
-- TIER 1: ensure anon-callable functions stay accessible to anon
-- (defensive — these grants are idempotent and document intent).
-- ------------------------------------------------------------------

DO $$
DECLARE
  fn_oid oid;
  fn_signature text;
BEGIN
  FOR fn_oid, fn_signature IN
    SELECT p.oid, p.oid::regprocedure::text
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'get_weekly_leaderboard',
        'flashcard_heuristic_flags',
        'has_role'
      )
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated', fn_signature);
    RAISE NOTICE 'KEEP public-callable: %', fn_signature;
  END LOOP;
END;
$$;

-- ------------------------------------------------------------------
-- TIER 2 + 3: REVOKE anon EXECUTE on every OTHER SECURITY DEFINER
-- function in the public schema.
-- ------------------------------------------------------------------

DO $$
DECLARE
  fn_oid oid;
  fn_signature text;
  fn_name text;
BEGIN
  FOR fn_oid, fn_signature, fn_name IN
    SELECT p.oid, p.oid::regprocedure::text, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.proname NOT IN (
        'get_weekly_leaderboard',
        'flashcard_heuristic_flags',
        'has_role'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn_signature);
    RAISE NOTICE 'REVOKE anon: %', fn_signature;

    -- Service-role-only functions also revoke from authenticated.
    -- Webhook + Asaas-only paths.
    IF fn_name IN (
      'grant_concurso_access',
      'process_webhook_event',
      'refresh_bot_weekly_scores',
      'apply_audit_suggestion',
      'approve_flashcard_review',
      'approve_flashcard_review_with_edit',
      'delete_audit_card',
      'reject_audit_suggestion',
      'reject_flashcard_review',
      'triage_flagged_card',
      'run_flashcard_heuristic_audit'
    ) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', fn_signature);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn_signature);
      RAISE NOTICE '  + REVOKE authenticated, GRANT service_role: %', fn_signature;
    END IF;
  END LOOP;
END;
$$;

COMMIT;

-- ============================================================================
-- VERIFICATION (run manually after apply):
--
--   SELECT
--     p.proname,
--     p.prosecdef,
--     COALESCE(
--       array_to_string(p.proacl::text[], E'\n  '),
--       '(default: PUBLIC EXECUTE)'
--     ) AS grants
--   FROM pg_proc p
--   JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND p.prosecdef = true
--   ORDER BY p.proname;
--
-- Expected:
--   - get_weekly_leaderboard / flashcard_heuristic_flags / has_role
--     → anon=X (EXECUTE) AND authenticated=X
--   - All others → anon should be ABSENT from acl
--
-- Reversal:
--   DO $$ DECLARE fn text;
--   BEGIN
--     FOR fn IN
--       SELECT p.oid::regprocedure::text FROM pg_proc p
--       JOIN pg_namespace n ON n.oid = p.pronamespace
--       WHERE n.nspname = 'public' AND p.prosecdef = true
--     LOOP EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated', fn);
--     END LOOP;
--   END $$;
