-- F-005: align user_concurso_access schema with grant_concurso_access()
--
-- Discovered 2026-05-27 during post-merge audit of F-003. The function
-- grant_concurso_access (called by Asaas PAYMENT_CONFIRMED webhook)
-- inserts into three columns that don't exist on the table:
--   - plan          (subscription plan label, e.g. 'anual')
--   - purchase_id   (FK to public.purchases.id for audit)
--   - updated_at    (touched on every grant extension)
--
-- Result: even after F-003 (status alignment), every PAYMENT_CONFIRMED
-- webhook would still fail with:
--   "column 'plan' of relation 'user_concurso_access' does not exist"
--
-- The schema-vs-code drift was hidden because user_concurso_access has
-- exactly ONE manually-inserted row in production (granted via admin UI
-- before this fn shipped). No webhook had ever actually run end-to-end.
--
-- Fix: add the three columns. Backfill on the existing row so it stays
-- valid. Install a BEFORE UPDATE trigger to maintain updated_at
-- automatically (so the fn's `SET updated_at = now()` continues to work
-- if a future change drops the explicit assignment).

-- 1) New columns (NOT NULL with defaults so the existing row backfills cleanly)
ALTER TABLE public.user_concurso_access
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'anual',
  ADD COLUMN IF NOT EXISTS purchase_id uuid REFERENCES public.purchases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 2) Backfill updated_at on the existing row from granted_at so it
--    reflects the actual mutation moment, not migration time.
UPDATE public.user_concurso_access
SET updated_at = granted_at
WHERE updated_at >= now() - interval '1 minute';

-- 3) Trigger to keep updated_at fresh on every UPDATE (defense in
--    depth — the fn already SETs it, but a future migration shouldn't
--    have to remember).
CREATE OR REPLACE FUNCTION public.touch_user_concurso_access_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_concurso_access_touch_updated_at
  ON public.user_concurso_access;

CREATE TRIGGER user_concurso_access_touch_updated_at
  BEFORE UPDATE ON public.user_concurso_access
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_user_concurso_access_updated_at();

-- 4) Helpful index for /admin/users page lookup
CREATE INDEX IF NOT EXISTS user_concurso_access_purchase_id_idx
  ON public.user_concurso_access (purchase_id)
  WHERE purchase_id IS NOT NULL;

COMMENT ON COLUMN public.user_concurso_access.plan IS
  'Subscription plan label, default ''anual''. Set by grant_concurso_access from webhook. F-005 2026-05-27.';
COMMENT ON COLUMN public.user_concurso_access.purchase_id IS
  'FK to purchases.id — links the access grant to the Asaas payment that created it. NULL for legacy/admin grants. F-005 2026-05-27.';
COMMENT ON COLUMN public.user_concurso_access.updated_at IS
  'Auto-maintained by trigger touch_user_concurso_access_updated_at. F-005 2026-05-27.';
