-- Plan 1.8-C: LGPD compliance scaffolding
--
-- Three tables + one function. Designed for LGPD obligations
-- (art. 41 — record-keeping; art. 18 — data subject rights including
-- deletion) and OPS-06 acceptance criteria.
--
-- Applied to remote via MCP apply_migration on 2026-05-26.
-- Smoke checks via execute_sql:
--   - audit_log exists with 1 RLS policy (SELECT user own)
--   - legal_audit_log exists with 0 RLS policies (service-role only)
--   - lgpd_deletion_requests exists with 2 RLS policies (SELECT + INSERT own)
--   - delete_user_cascade function exists (SECURITY DEFINER, service-role only)
--
-- DESIGN DECISIONS:
--
-- 1) Two separate audit tables. `audit_log` is operational/debug —
--    high volume, user-readable for own actions, retained per
--    standard retention. `legal_audit_log` is LGPD article 41
--    record-of-processing — append-only, service-role-only,
--    retained per LGPD obligations (5+ years typically). Splitting
--    keeps the high-volume noise out of the legal table that must
--    be auditable to regulators.
--
-- 2) Soft-delete cascade (not hard delete). LGPD allows reasonable
--    delay to fulfill deletion (typically up to 15 days). We mark
--    the deletion request, run a soft-delete that anonymizes the
--    user_profile + revokes access + logs to legal_audit_log,
--    then a periodic worker can hard-delete history after the
--    retention window if legally required. Hard delete is risky
--    (FK cascades destroying related data we may need to retain
--    for accounting/tax). Soft-delete + anonymization is the
--    industry standard for LGPD-compliant SaaS.
--
-- 3) `delete_user_cascade` is service-role-only via REVOKE/GRANT.
--    Called by the future LGPD deletion endpoint (OPS-06) after the
--    user confirms via email + magic link.

-- ============================================================
-- audit_log: operational audit
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NULL,
  resource_id text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address inet NULL,
  user_agent text NULL,
  correlation_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_user_id_created_at_idx
  ON public.audit_log (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS audit_log_action_created_at_idx
  ON public.audit_log (action, created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_log_user_select_own
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

COMMENT ON TABLE public.audit_log IS
  'Operational audit log — high volume, user can read own actions. Plan 1.8-C 2026-05-26.';

-- ============================================================
-- legal_audit_log: LGPD article 41 record-of-processing
-- ============================================================

CREATE TABLE IF NOT EXISTS public.legal_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  data_subject_id uuid NULL,
  acting_role text NOT NULL,
  acting_user_id uuid NULL,
  legal_basis text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS legal_audit_log_data_subject_idx
  ON public.legal_audit_log (data_subject_id, recorded_at DESC)
  WHERE data_subject_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS legal_audit_log_event_type_idx
  ON public.legal_audit_log (event_type, recorded_at DESC);

ALTER TABLE public.legal_audit_log ENABLE ROW LEVEL SECURITY;

-- NO policies — service_role writes/reads only via RLS bypass.

COMMENT ON TABLE public.legal_audit_log IS
  'LGPD art. 41 record-of-processing log. Service-role only. Plan 1.8-C 2026-05-26.';

-- ============================================================
-- lgpd_deletion_requests: queue for OPS-06 deletion endpoint
-- ============================================================

CREATE TABLE IF NOT EXISTS public.lgpd_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NULL,
  status text NOT NULL DEFAULT 'pending',
  confirmation_token uuid NULL,
  confirmed_at timestamptz NULL,
  completed_at timestamptz NULL,
  processing_notes text NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lgpd_deletion_requests_status_check
    CHECK (status IN ('pending', 'awaiting_confirmation', 'confirmed', 'processing', 'completed', 'cancelled'))
);

CREATE UNIQUE INDEX IF NOT EXISTS lgpd_deletion_requests_user_active_idx
  ON public.lgpd_deletion_requests (user_id)
  WHERE status NOT IN ('completed', 'cancelled');

CREATE INDEX IF NOT EXISTS lgpd_deletion_requests_status_idx
  ON public.lgpd_deletion_requests (status, requested_at);

ALTER TABLE public.lgpd_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY lgpd_deletion_user_select_own
  ON public.lgpd_deletion_requests FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY lgpd_deletion_user_insert_own
  ON public.lgpd_deletion_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND status = 'pending'
  );

COMMENT ON TABLE public.lgpd_deletion_requests IS
  'Queue for LGPD art. 18 deletion requests. User can read/insert own; service-role processes. Plan 1.8-C 2026-05-26.';

-- ============================================================
-- delete_user_cascade: soft-delete a user with audit trail
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_user_cascade(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_request_id uuid;
  v_anonymized_profile boolean := false;
  v_revoked_access integer := 0;
BEGIN
  SELECT id INTO v_request_id
  FROM public.lgpd_deletion_requests
  WHERE user_id = p_user_id
    AND status = 'confirmed'
  LIMIT 1;

  IF v_request_id IS NULL THEN
    RAISE EXCEPTION 'No confirmed deletion request found for user %', p_user_id
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  UPDATE public.lgpd_deletion_requests
  SET status = 'processing'
  WHERE id = v_request_id;

  UPDATE public.user_profiles
  SET full_name = '[deleted]',
      avatar_url = NULL
  WHERE id = p_user_id;
  GET DIAGNOSTICS v_anonymized_profile = ROW_COUNT;

  UPDATE public.user_concurso_access
  SET expires_at = now()
  WHERE user_id = p_user_id
    AND (expires_at IS NULL OR expires_at > now());
  GET DIAGNOSTICS v_revoked_access = ROW_COUNT;

  UPDATE public.lgpd_deletion_requests
  SET status = 'completed',
      completed_at = now()
  WHERE id = v_request_id;

  INSERT INTO public.legal_audit_log
    (event_type, data_subject_id, acting_role, legal_basis, metadata)
  VALUES (
    'lgpd_deletion_executed',
    p_user_id,
    'service_role',
    'LGPD art. 18, VI',
    jsonb_build_object(
      'request_id', v_request_id,
      'anonymized_profile', v_anonymized_profile,
      'revoked_access_count', v_revoked_access,
      'executed_at', now()
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'request_id', v_request_id,
    'anonymized_profile', v_anonymized_profile,
    'revoked_access_count', v_revoked_access
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_user_cascade(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_cascade(uuid) TO service_role;

COMMENT ON FUNCTION public.delete_user_cascade(uuid) IS
  'Soft-delete a user with audit trail. LGPD art. 18 compliance. Service-role only. Plan 1.8-C 2026-05-26.';
