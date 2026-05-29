-- F-009: snapshot the gabarito into the simulado at creation time.
--
-- Why: submitSimuladoAction re-reads admin_questoes.gabarito at SCORING
-- time (status='active'). If an admin archives or edits a question after
-- it was added to a user's simulado, the RLS active-only read drops it →
-- `expected` is undefined → the question scores as WRONG even if the user
-- answered correctly. A graded mock exam must be immune to later content
-- lifecycle changes.
--
-- Fix: store the correct answers at creation in `gabarito_snapshot`
-- (jsonb map of question_id -> { gabarito, anulada }). Scoring reads the
-- snapshot; the live query stays only as a fallback for simulados created
-- before this column existed.

ALTER TABLE public.simulados
  ADD COLUMN IF NOT EXISTS gabarito_snapshot jsonb;

COMMENT ON COLUMN public.simulados.gabarito_snapshot IS
  'Frozen answer key at creation: { questionId: { gabarito, anulada } }. Scoring uses this so later archival/edits of admin_questoes do not mis-score. F-009.';
