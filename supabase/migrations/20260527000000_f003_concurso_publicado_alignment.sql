-- F-003: align concurso status vocabulary on 'publicado' (PT-BR)
--
-- Two blockers discovered during pre-sale UX audit (2026-05-27):
--
--   1. `Public read published concursos` policy was scoped to {authenticated}
--      only. Anon visitors couldn't read admin_concursos → middleware
--      injected slug, page resolved null concurso, STATE 1 (apex landing)
--      rendered on subdomain pages. Already patched live via apply_migration
--      on 2026-05-27; this file codifies it.
--
--   2. `grant_concurso_access` looked up concurso by `status = 'active'`,
--      but the DB row uses `status = 'publicado'` (PT-BR, matching the
--      column default 'rascunho'). When Asaas PAYMENT_CONFIRMED webhook
--      fires, the function raises 'no_data_found' → user pays but never
--      gets access. ZERO successful purchases possible until fixed.
--
-- Decision: unify on PT-BR vocabulary ('publicado' / 'rascunho' /
-- 'arquivado'), matching the column default. Admin TS code is updated
-- in the same PR. Existing rows already use these values.
--
-- Idempotent: drops policy + replaces function regardless of prior state.

-- 1) RLS: anon + authenticated can SELECT published concursos
DROP POLICY IF EXISTS "Public read published concursos" ON public.admin_concursos;

CREATE POLICY "Public read published concursos"
  ON public.admin_concursos
  FOR SELECT
  TO anon, authenticated
  USING (status = 'publicado');

-- 2) grant_concurso_access: lookup by status = 'publicado'
CREATE OR REPLACE FUNCTION public.grant_concurso_access(
  p_user_id uuid,
  p_concurso_slug text,
  p_plan text,
  p_duration_days integer DEFAULT 365,
  p_purchase_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_concurso_id uuid;
  v_existing_expires_at timestamptz;
  v_new_expires_at timestamptz;
  v_was_new boolean := false;
BEGIN
  -- Look up concurso by slug. Status must be 'publicado' (PT-BR, matches
  -- column default 'rascunho'). The legacy migration used 'active' which
  -- never matched any row — blocking all PAYMENT_CONFIRMED grants.
  SELECT id INTO v_concurso_id
  FROM public.admin_concursos
  WHERE slug = p_concurso_slug
    AND status = 'publicado'
  LIMIT 1;

  IF v_concurso_id IS NULL THEN
    RAISE EXCEPTION 'No published concurso found for slug %', p_concurso_slug
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Check existing access
  SELECT expires_at INTO v_existing_expires_at
  FROM public.user_concurso_access
  WHERE user_id = p_user_id
    AND concurso_id = v_concurso_id
  LIMIT 1;

  IF v_existing_expires_at IS NULL AND NOT EXISTS (
    SELECT 1 FROM public.user_concurso_access
    WHERE user_id = p_user_id AND concurso_id = v_concurso_id
  ) THEN
    v_was_new := true;
  END IF;

  -- Compute new expires_at: extend from the LATER of (now, existing_expires_at)
  v_new_expires_at := GREATEST(
    now(),
    COALESCE(v_existing_expires_at, now())
  ) + (p_duration_days || ' days')::interval;

  -- Upsert
  INSERT INTO public.user_concurso_access (user_id, concurso_id, plan, expires_at, purchase_id)
  VALUES (p_user_id, v_concurso_id, p_plan, v_new_expires_at, p_purchase_id)
  ON CONFLICT (user_id, concurso_id) DO UPDATE
    SET plan = EXCLUDED.plan,
        expires_at = EXCLUDED.expires_at,
        purchase_id = COALESCE(EXCLUDED.purchase_id, public.user_concurso_access.purchase_id),
        updated_at = now();

  -- Audit trail (LGPD art. 41)
  INSERT INTO public.legal_audit_log
    (event_type, data_subject_id, acting_role, legal_basis, metadata)
  VALUES (
    'concurso_access_granted',
    p_user_id,
    'service_role',
    'Contrato de assinatura (Plan ' || p_plan || ')',
    jsonb_build_object(
      'concurso_id', v_concurso_id,
      'concurso_slug', p_concurso_slug,
      'plan', p_plan,
      'duration_days', p_duration_days,
      'expires_at', v_new_expires_at,
      'was_new', v_was_new,
      'purchase_id', p_purchase_id
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'user_id', p_user_id,
    'concurso_id', v_concurso_id,
    'concurso_slug', p_concurso_slug,
    'plan', p_plan,
    'expires_at', v_new_expires_at,
    'was_new', v_was_new
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.grant_concurso_access(uuid, text, text, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_concurso_access(uuid, text, text, integer, uuid) TO service_role;

COMMENT ON FUNCTION public.grant_concurso_access(uuid, text, text, integer, uuid) IS
  'Idempotent grant/extend concurso access. Looks up by status = ''publicado''. Service-role only. F-003 2026-05-27.';
