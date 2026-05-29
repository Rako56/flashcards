-- Study queue RPC — fixes the frozen-slice coverage bug.
--
-- Why: app/study/page.tsx (default mode) did:
--   .from('admin_flashcards').select(...).eq(status,'active').limit(200)
-- with NO .order(). PostgREST then issues `... LIMIT 200` with no ORDER
-- BY, so Postgres returns the SAME physical-order first 200 rows every
-- session (verified: two identical queries overlap 200/200). With the
-- 22.351-card Correios bank that means ~99% of cards — and 4 entire
-- disciplinas (Civil, Previdenciário, Processual do Trabalho, Juris
-- BÔNUS) — are permanently unreachable, and due cards only surface if
-- they happen to sit in that frozen slice. The spaced-repetition core
-- is effectively broken for any bank larger than the sample.
--
-- PostgREST can't express "due cards first, then a RANDOM sample of new
-- cards" because it can't filter/order by the embedded
-- user_flashcard_progress table server-side (see the client-side filter
-- hack the page used). Fetching all 22k rows per page load to sort in
-- JS is wasteful and unbounded. So selection belongs in SQL.
--
-- This function returns, in priority order:
--   1. DUE   — progress exists and due_at <= now, most-overdue first
--   2. NEW   — no progress row, RANDOM order (rotates coverage across
--              the whole bank / all disciplinas, session to session)
--   3. FUTURE — progress exists and due_at > now, soonest first (filler)
-- buildQueue() then trims to the session limit, preserving its tested
-- DUE>NEW>FUTURE bucketing.
--
-- SECURITY INVOKER: RLS still applies. "Read flashcards from purchased
-- concursos" already gates admin_flashcards to admins + users with a
-- live user_concurso_access grant; "Users manage own flashcard
-- progress" scopes the LEFT JOIN to the caller. No access re-check
-- needed — the policies are the boundary. anon never calls this (the
-- page requires auth), so EXECUTE is granted to authenticated only.

CREATE OR REPLACE FUNCTION public.get_study_queue(
  p_concurso_id uuid,
  p_limit integer DEFAULT 200
)
RETURNS TABLE (
  id uuid,
  front_text text,
  back_text text,
  tipo_card text,
  topico_id uuid,
  disciplina_id uuid,
  fundamento_legal text,
  stability double precision,
  difficulty double precision,
  lapses integer,
  last_reviewed_at timestamptz,
  due_at timestamptz
)
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT
    f.id,
    f.front_text,
    f.back_text,
    f.tipo_card,
    f.topico_id,
    f.disciplina_id,
    f.fundamento_legal,
    p.stability,
    p.difficulty,
    p.lapses,
    p.last_reviewed_at,
    p.due_at
  FROM public.admin_flashcards f
  LEFT JOIN public.user_flashcard_progress p
    ON p.flashcard_id = f.id
   AND p.user_id = auth.uid()
  WHERE f.concurso_id = p_concurso_id
    AND f.status = 'active'
  ORDER BY
    CASE
      WHEN p.flashcard_id IS NULL OR p.due_at IS NULL THEN 1  -- NEW
      WHEN p.due_at <= now() THEN 0                            -- DUE
      ELSE 2                                                   -- FUTURE
    END ASC,
    p.due_at ASC NULLS LAST,  -- DUE: most overdue first; FUTURE: soonest first
    random()                  -- NEW: rotate coverage; tiebreak elsewhere
  LIMIT p_limit;
$$;

REVOKE EXECUTE ON FUNCTION public.get_study_queue(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_study_queue(uuid, integer) TO authenticated;

COMMENT ON FUNCTION public.get_study_queue(uuid, integer) IS
  'Study queue: DUE (by due_at) then RANDOM new then FUTURE filler. Fixes frozen-slice coverage bug. SECURITY INVOKER (RLS-gated). 2026-05-29.';
