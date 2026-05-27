-- F-004: public counts RPC for landing pages
--
-- Why: anon visitors on the apex + subdomain landings need totals
-- ("3.139 flashcards · 175 questões reais") for social proof. RLS on
-- admin_flashcards/admin_questoes is scoped to admins + paying users:
--
--   admin_flashcards: "Read flashcards from purchased concursos"
--     USING (status='active' AND (has_role(admin) OR EXISTS purchase))
--   admin_questoes: "Authenticated users can read active questoes"
--     TO authenticated USING (status='active')
--
-- So direct COUNT queries return 0 to anon → silent failure masked by
-- the ZERO_STATS fallback in lib/landing/get-content-stats.ts. Same
-- shape as F-003: aggregate filter never matched, fallback hid the bug,
-- landings showed wrong/zero data to every pre-sale visitor.
--
-- Adding a permissive SELECT policy `TO anon USING (status='active')`
-- would expose row contents too (RLS controls rows, not columns) — a
-- huge leak of curated flashcard content the customer paid for.
--
-- The correct shape is a SECURITY DEFINER function that returns only
-- aggregate jsonb. The function is the boundary — anon can ASK how
-- many, never browse rows.
--
-- F-002 hardening: REVOKE EXECUTE FROM PUBLIC, then GRANT only to
-- anon + authenticated. service_role doesn't need it (uses anon client
-- on the landing).
--
-- Applied to remote via MCP apply_migration on 2026-05-27 (verified
-- with `SET LOCAL role = anon; SELECT public.get_content_counts(...)`
-- returns 3139/175/1 instead of 0/0/0).

CREATE OR REPLACE FUNCTION public.get_content_counts(p_concurso_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_flashcards bigint;
  v_questoes bigint;
  v_concursos bigint;
BEGIN
  IF p_concurso_id IS NULL THEN
    -- Global counts — apex landing
    SELECT COUNT(*) INTO v_flashcards
    FROM public.admin_flashcards
    WHERE status = 'active';

    SELECT COUNT(*) INTO v_questoes
    FROM public.admin_questoes
    WHERE status = 'active';

    SELECT COUNT(*) INTO v_concursos
    FROM public.admin_concursos
    WHERE status = 'publicado';
  ELSE
    -- Per-concurso counts — subdomain landing
    SELECT COUNT(*) INTO v_flashcards
    FROM public.admin_flashcards
    WHERE status = 'active' AND concurso_id = p_concurso_id;

    SELECT COUNT(*) INTO v_questoes
    FROM public.admin_questoes
    WHERE status = 'active' AND concurso_id = p_concurso_id;

    v_concursos := 1;
  END IF;

  RETURN jsonb_build_object(
    'flashcardsCount', v_flashcards,
    'questoesCount', v_questoes,
    'concursosCount', v_concursos
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_content_counts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_content_counts(uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.get_content_counts(uuid) IS
  'Aggregate counts for landing pages — anon-callable, returns no row data. F-004 2026-05-27.';
