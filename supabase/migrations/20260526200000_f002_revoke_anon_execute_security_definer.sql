-- F-002 — REVOKE EXECUTE FROM PUBLIC+anon on SECURITY DEFINER fns
-- ============================================================================
--
-- Context: Plan 1.7 audit. SECURITY DEFINER functions in the public schema
-- have permissive grants via PostgreSQL's default `PUBLIC=EXECUTE` semantic
-- — anyone (including anon role via PostgREST) can invoke them. Combined
-- with SECURITY DEFINER running as owner (bypasses RLS), the function body's
-- internal auth check is the only barrier.
--
-- Pre-apply state (sampled 2026-05-26 via mcp__supabase__execute_sql):
--
--   {proname: 'apply_audit_suggestion',
--    grants: '=X/postgres, postgres=X/postgres, authenticated=X/postgres,
--             service_role=X/postgres'}
--
--   The leading `=X/postgres` is the implicit PUBLIC grant — that's the
--   surface we have to close. Three sensitive fns (delete_user_cascade,
--   grant_concurso_access, process_webhook_event) had anon EXPLICITLY
--   granted on top, which is also closed below.
--
-- Strategy: ALLOWLIST 3 truly anon-callable helpers, then on every
-- OTHER SECURITY DEFINER public function:
--   - REVOKE EXECUTE FROM PUBLIC      (kills implicit grant)
--   - REVOKE EXECUTE FROM anon         (kills explicit grant if exists)
--   - For tier-3 (admin/service-role only): ALSO REVOKE from authenticated
--
-- Tier 3 fns retain only service_role + the function owner (postgres).
-- Tier 2 fns retain authenticated + service_role.
-- Tier 1 fns (allowlist) keep their existing grants untouched.
--
-- All function bodies retain their internal auth.uid()/has_role() checks
-- as defence in depth.
--
-- Reversal at the bottom of this file.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  fn_signature text;
  fn_name text;
  service_only_fns text[] := ARRAY[
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
    'run_flashcard_heuristic_audit',
    'escalate_card_report_to_review',
    'auto_create_wallet'
  ];
  public_allowlist text[] := ARRAY[
    'get_weekly_leaderboard',
    'flashcard_heuristic_flags',
    'has_role'
  ];
BEGIN
  FOR fn_signature, fn_name IN
    SELECT p.oid::regprocedure::text, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.proname <> ALL(public_allowlist)
  LOOP
    -- Close PUBLIC default
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn_signature);
    -- Close explicit anon (if any)
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn_signature);

    RAISE NOTICE 'REVOKE PUBLIC, anon: %', fn_signature;

    IF fn_name = ANY(service_only_fns) THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', fn_signature);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn_signature);
      RAISE NOTICE '  + tier-3 service-only: %', fn_signature;
    ELSE
      -- Tier 2 — keep authenticated callable
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn_signature);
      RAISE NOTICE '  + tier-2 keep authenticated: %', fn_signature;
    END IF;
  END LOOP;
END;
$$;

-- Reaffirm tier-1 allowlist (idempotent, makes intent explicit).
DO $$
DECLARE
  fn_signature text;
BEGIN
  FOR fn_signature IN
    SELECT p.oid::regprocedure::text
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.proname IN ('get_weekly_leaderboard', 'flashcard_heuristic_flags', 'has_role')
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated', fn_signature);
  END LOOP;
END;
$$;

COMMIT;

-- ============================================================================
-- VERIFICATION (run after apply):
--
--   SELECT
--     p.proname,
--     COALESCE(array_to_string(p.proacl::text[], ', '), '(default PUBLIC EXECUTE)') AS grants
--   FROM pg_proc p
--   JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND p.prosecdef = true
--   ORDER BY p.proname;
--
-- Expected:
--   - Tier 1 (allowlist) → anon + authenticated present
--   - Tier 2 → only authenticated + service_role + postgres
--   - Tier 3 → only service_role + postgres
--
-- REVERSAL (emergency rollback):
--   DO $$ DECLARE fn text;
--   BEGIN
--     FOR fn IN
--       SELECT p.oid::regprocedure::text FROM pg_proc p
--       JOIN pg_namespace n ON n.oid = p.pronamespace
--       WHERE n.nspname = 'public' AND p.prosecdef = true
--     LOOP EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO PUBLIC', fn);
--     END LOOP;
--   END $$;
