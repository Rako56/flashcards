/**
 * Asaas webhook signature verification.
 *
 * Asaas uses a shared-secret model: the dashboard lets you configure a
 * token that they include in every webhook as the `asaas-access-token`
 * header. We compare it to `ASAAS_WEBHOOK_TOKEN` env on receipt.
 *
 * Three policy layers:
 *
 * 1. **Production fail-closed**: when `NODE_ENV=production` AND the
 *    env token is empty, REJECT all webhooks. Prevents accidental
 *    "open webhook" deployment if the env var was forgotten.
 *
 * 2. **Dev/test fail-open**: when the env token is empty AND we are
 *    NOT in production, accept any inbound (sandbox dev mode — no
 *    real money flows there).
 *
 * 3. **Timing-safe compare**: when both tokens are set, compare via
 *    `crypto.timingSafeEqual` to neutralize string-length / prefix
 *    timing attacks. `===` leaks byte-by-byte timing info, which a
 *    motivated attacker can amplify to brute-force valid tokens.
 *
 * Returns `{ ok: true }` to proceed; `{ ok: false, reason }` to reject.
 * Callers convert reject to HTTP 401 (signature) or 503 (env missing).
 */
import { timingSafeEqual } from 'node:crypto'

export type SignatureCheckResult =
  | { ok: true }
  | { ok: false; reason: 'missing-env-prod' | 'signature-mismatch' }

export interface SignatureCheckInput {
  /** Value of the `asaas-access-token` header from the incoming request. */
  headerToken: string | null
  /** Value of `ASAAS_WEBHOOK_TOKEN` env. */
  envToken: string | undefined
  /** `process.env.NODE_ENV` — pass explicitly so tests can simulate. */
  nodeEnv: string | undefined
}

export function verifyAsaasSignature(input: SignatureCheckInput): SignatureCheckResult {
  const envTokenTrimmed = input.envToken?.trim() ?? ''
  const isProd = input.nodeEnv === 'production'

  // Layer 1: production must have env token. Fail closed.
  if (isProd && envTokenTrimmed.length === 0) {
    return { ok: false, reason: 'missing-env-prod' }
  }

  // Layer 2: dev/test fallback — no env token = accept.
  if (envTokenTrimmed.length === 0) {
    return { ok: true }
  }

  // Layer 3: env token present — header must match (timing-safe).
  const headerTrimmed = input.headerToken?.trim() ?? ''
  if (headerTrimmed.length === 0) {
    return { ok: false, reason: 'signature-mismatch' }
  }

  // timingSafeEqual requires equal-length buffers. Buffers of different
  // lengths short-circuit to false without leaking which length is wrong.
  const a = Buffer.from(headerTrimmed, 'utf8')
  const b = Buffer.from(envTokenTrimmed, 'utf8')
  if (a.length !== b.length) {
    return { ok: false, reason: 'signature-mismatch' }
  }
  const equal = timingSafeEqual(a, b)
  return equal ? { ok: true } : { ok: false, reason: 'signature-mismatch' }
}
