-- F-001 (Plan 1.7 audit): set immutable search_path on
-- public.refund_requests_set_updated_at to neutralize search_path
-- injection vector (Supabase advisor function_search_path_mutable).
--
-- Pure security hardening — zero behavioral impact. Trigger function
-- body unchanged; only the search_path GUC is now fixed at
-- (public, pg_temp) so a malicious caller cannot prepend a hostile
-- schema and have functions resolve to a shim.
--
-- Applied to remote via MCP apply_migration on 2026-05-26.
-- Verified: get_advisors security shows function_search_path_mutable
-- finding count went from 1 → 0 after apply.

ALTER FUNCTION public.refund_requests_set_updated_at()
  SET search_path = public, pg_temp;
