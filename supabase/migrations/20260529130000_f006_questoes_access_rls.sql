-- F-006: gate admin_questoes reads behind concurso access (paywall fix)
--
-- Why: the policy "Authenticated users can read active questoes" was
--   SELECT TO authenticated USING (status = 'active')
-- with NO user_concurso_access join. So ANY signed-up user (even with
-- zero paid grants) could read every concurso's active questions —
-- including the answer key (`gabarito`) and `explicacao` — directly via
-- the REST API with the anon key + their JWT. That is the paid product
-- leaking, and it is inconsistent with admin_flashcards, whose
-- "Read flashcards from purchased concursos" policy correctly requires
-- a live user_concurso_access grant.
--
-- Fix: replace the open SELECT policy with the same access-gated shape
-- used by admin_flashcards. Counts on the landing still work — those go
-- through the SECURITY DEFINER get_content_counts RPC, not row reads.
-- Admins keep full access via the pre-existing "Admins manage questoes"
-- ALL policy (the has_role branch here is parity with admin_flashcards).

DROP POLICY IF EXISTS "Authenticated users can read active questoes" ON public.admin_questoes;

CREATE POLICY "Read questoes from purchased concursos"
ON public.admin_questoes
FOR SELECT
TO authenticated
USING (
  status = 'active'
  AND (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.user_concurso_access uca
      WHERE uca.user_id = (SELECT auth.uid())
        AND uca.concurso_id = admin_questoes.concurso_id
        AND (uca.expires_at IS NULL OR uca.expires_at > now())
    )
  )
);
