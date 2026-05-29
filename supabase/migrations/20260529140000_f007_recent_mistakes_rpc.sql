-- F-007: get_recent_mistakes RPC — fixes two bugs in the caderno de erros.
--
-- Old behavior (lib/mistakes/get-recent.ts): query srs_reviews WHERE
-- rating='again' within the window, LIMIT N, then filter by concurso +
-- active in JS. Two defects:
--   1. "Dominei" (mark-mastered) is a NO-OP. It inserts a rating='good'
--      srs_reviews row, but the query only ever reads rating='again' rows
--      — the old 'again' rows still match, so the card never leaves the
--      caderno (a page refresh brings it back).
--   2. The LIMIT is applied BEFORE the concurso filter, so in a
--      multi-concurso future a user with many 'again' reviews in concurso
--      B could push all of concurso A's mistakes out of the top-N.
--
-- Fix: take the LATEST review per card (DISTINCT ON) and only surface a
-- card whose most-recent review in the window is 'again'. A later 'good'
-- (Dominei) now correctly suppresses it. Concurso + active filters apply
-- server-side BEFORE the limit.
--
-- SECURITY INVOKER: RLS still applies — srs_reviews is scoped to the
-- caller's own rows; admin_flashcards to active cards in concursos the
-- user has access to. auth.uid() identifies the caller.

CREATE OR REPLACE FUNCTION public.get_recent_mistakes(
  p_concurso_id uuid,
  p_window_days integer DEFAULT 90,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  card_id uuid,
  reviewed_at timestamptz,
  front_text text,
  back_text text,
  tipo_card text,
  topico_titulo text,
  disciplina_titulo text,
  fundamento_legal text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH latest AS (
    SELECT DISTINCT ON (r.flashcard_id)
           r.flashcard_id,
           r.reviewed_at,
           r.rating
    FROM public.srs_reviews r
    WHERE r.user_id = auth.uid()
      AND r.card_source = 'admin'
      AND r.reviewed_at >= now() - make_interval(days => p_window_days)
    ORDER BY r.flashcard_id, r.reviewed_at DESC
  )
  SELECT f.id,
         l.reviewed_at,
         f.front_text,
         f.back_text,
         f.tipo_card,
         f.topico_titulo,
         f.disciplina_titulo,
         f.fundamento_legal
  FROM latest l
  JOIN public.admin_flashcards f ON f.id = l.flashcard_id
  WHERE l.rating = 'again'
    AND f.concurso_id = p_concurso_id
    AND f.status = 'active'
  ORDER BY l.reviewed_at DESC
  LIMIT p_limit;
$$;

REVOKE EXECUTE ON FUNCTION public.get_recent_mistakes(uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_recent_mistakes(uuid, integer, integer) TO authenticated;

COMMENT ON FUNCTION public.get_recent_mistakes(uuid, integer, integer) IS
  'Caderno de erros: cards whose LATEST review in the window is ''again''. Fixes Dominei no-op + concurso-before-limit. SECURITY INVOKER. F-007 2026-05-29.';
