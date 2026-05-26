-- Plan 4.1: grant_concurso_access function
--
-- Called by the Asaas webhook handler when a PAYMENT_CONFIRMED event
-- arrives. Atomically:
--   1. Resolves concurso row by slug
--   2. Upserts user_concurso_access — extends expires_at if existing
--      active grant; creates row if first purchase
--   3. Records the grant in legal_audit_log (LGPD article 41)
--
-- Idempotency: caller already wrapped this in process_webhook_event
-- (Plan 1.8-A). If a webhook is delivered twice, the outer envelope
-- short-circuits before reaching here.
--
-- Applied to remote via MCP apply_migration on 2026-05-26.

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
  SELECT id INTO v_concurso_id
  FROM public.admin_concursos
  WHERE slug = p_concurso_slug
    AND status = 'active'
  LIMIT 1;

  IF v_concurso_id IS NULL THEN
    RAISE EXCEPTION 'No active concurso found for slug %', p_concurso_slug
      USING ERRCODE = 'no_data_found';
  END IF;

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

  v_new_expires_at := GREATEST(
    now(),
    COALESCE(v_existing_expires_at, now())
  ) + (p_duration_days || ' days')::interval;

  INSERT INTO public.user_concurso_access (user_id, concurso_id, plan, expires_at, purchase_id)
  VALUES (p_user_id, v_concurso_id, p_plan, v_new_expires_at, p_purchase_id)
  ON CONFLICT (user_id, concurso_id) DO UPDATE
    SET plan = EXCLUDED.plan,
        expires_at = EXCLUDED.expires_at,
        purchase_id = COALESCE(EXCLUDED.purchase_id, public.user_concurso_access.purchase_id),
        updated_at = now();

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
  'Idempotent grant/extend concurso access. Service-role only. Plan 4.1 2026-05-26.';
