-- Plan 1.8-A: webhook_events table + process_webhook_event function
--
-- Purpose: provide an idempotent envelope for processing webhook
-- deliveries from external services (initial use case: Asaas payments
-- webhooks). External providers retry on transient failures or
-- network blips, so the same event can hit our endpoint multiple
-- times. Without an idempotency log, we risk granting access twice,
-- double-counting purchases, or duplicating refund records.
--
-- Design:
-- - `event_id` is the natural primary key. Providers guarantee
--   uniqueness per delivery (Asaas: event UUID; future providers
--   may have their own scheme — we accept any text up to 255 chars).
-- - `event_type` is denormalized for fast filtering / metrics
--   (e.g., "PAYMENT_CONFIRMED", "PAYMENT_REFUNDED").
-- - `payload` stores the raw JSON for replay/debugging.
-- - `received_at` is when our endpoint saw the event.
-- - `processed_at` is when business logic finished (NULL if still
--   pending; can be backfilled on success). Helps detect stuck or
--   half-applied events.
-- - `processed_status` is small enum-like text: 'pending', 'success',
--   'failed', 'skipped_duplicate'. Plain TEXT (not Postgres ENUM)
--   so future statuses don't require ALTER TYPE.
--
-- RLS: service-role only. Webhook events are NEVER user-facing —
-- they're operational data. The Asaas webhook endpoint will use the
-- admin client (service_role) to insert and query this table.
--
-- The companion function `process_webhook_event` returns a small
-- record indicating whether the event was a fresh insert
-- (`was_new = true`) or a duplicate replay (`was_new = false`).
-- Callers use that flag to decide whether to run business logic or
-- short-circuit.
--
-- Applied to remote via MCP apply_migration on 2026-05-26.
-- Smoke test passed: idempotency confirmed (first call returns
-- was_new=true, second call returns was_new=false on same event_id).

CREATE TABLE IF NOT EXISTS public.webhook_events (
  event_id text PRIMARY KEY,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz NULL,
  processed_status text NOT NULL DEFAULT 'pending',
  processing_error text NULL,
  CONSTRAINT webhook_events_processed_status_check
    CHECK (processed_status IN ('pending', 'success', 'failed', 'skipped_duplicate'))
);

CREATE INDEX IF NOT EXISTS webhook_events_event_type_received_at_idx
  ON public.webhook_events (event_type, received_at DESC);

CREATE INDEX IF NOT EXISTS webhook_events_pending_idx
  ON public.webhook_events (received_at)
  WHERE processed_status = 'pending';

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- No policies = no access for anon or authenticated roles. Only
-- service_role (which bypasses RLS) can SELECT/INSERT/UPDATE/DELETE.

COMMENT ON TABLE public.webhook_events IS
  'Idempotency log for external webhook deliveries (initial use: Asaas). Service-role only. Plan 1.8-A 2026-05-26.';

-- ------------------------------------------------------------------
-- process_webhook_event: idempotent insert
-- ------------------------------------------------------------------
-- Returns (was_new boolean, returned_event_id text). The caller
-- branches:
--   IF was_new THEN run business logic; UPDATE row to mark processed
--   ELSE skip silently (event already handled)
--
-- The function uses INSERT ... ON CONFLICT DO NOTHING. Concurrent
-- webhook deliveries of the same event will see exactly one
-- "was_new = true" return.
--
-- NOTE: the OUT column is named `returned_event_id` (not `event_id`)
-- to avoid a 42702 ambiguity error where PL/pgSQL cannot disambiguate
-- the OUT column from the INSERT target column of the same name.

CREATE OR REPLACE FUNCTION public.process_webhook_event(
  p_event_id text,
  p_event_type text,
  p_payload jsonb
)
RETURNS TABLE (was_new boolean, returned_event_id text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.webhook_events (event_id, event_type, payload)
  VALUES (p_event_id, p_event_type, p_payload)
  ON CONFLICT (event_id) DO NOTHING;

  IF FOUND THEN
    RETURN QUERY SELECT true, p_event_id;
  ELSE
    UPDATE public.webhook_events
    SET processed_status = 'skipped_duplicate'
    WHERE webhook_events.event_id = p_event_id
      AND webhook_events.processed_status NOT IN ('success', 'failed');
    RETURN QUERY SELECT false, p_event_id;
  END IF;
END;
$$;

-- Lock down: only service_role can execute. We explicitly REVOKE from
-- PUBLIC so anon and authenticated cannot call it via PostgREST RPC.
-- This is the opposite default of SECURITY DEFINER functions without
-- explicit grants (which the audit flagged in Plan 1.7).
REVOKE EXECUTE ON FUNCTION public.process_webhook_event(text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_webhook_event(text, text, jsonb) TO service_role;

COMMENT ON FUNCTION public.process_webhook_event(text, text, jsonb) IS
  'Idempotent webhook envelope. Returns (was_new, returned_event_id). Service-role only. Plan 1.8-A 2026-05-26.';
