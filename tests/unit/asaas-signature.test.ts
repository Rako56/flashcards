/**
 * Tests for lib/asaas/signature.ts
 *
 * Money-critical: this is the gate between Asaas and our access-grant
 * RPC. A timing leak or accidental open-mode in prod = revenue at
 * risk. Tests cover all three policy layers + the timing-safe path.
 */
import { describe, expect, it } from 'vitest'

import { verifyAsaasSignature } from '@/lib/asaas/signature'

describe('lib/asaas/signature', () => {
  describe('production fail-closed', () => {
    it('rejects when env token is undefined in production', () => {
      const verdict = verifyAsaasSignature({
        headerToken: 'anything',
        envToken: undefined,
        nodeEnv: 'production',
      })
      expect(verdict.ok).toBe(false)
      if (!verdict.ok) expect(verdict.reason).toBe('missing-env-prod')
    })

    it('rejects when env token is empty string in production', () => {
      const verdict = verifyAsaasSignature({
        headerToken: 'tok',
        envToken: '',
        nodeEnv: 'production',
      })
      expect(verdict.ok).toBe(false)
      if (!verdict.ok) expect(verdict.reason).toBe('missing-env-prod')
    })

    it('rejects when env token is whitespace-only in production', () => {
      const verdict = verifyAsaasSignature({
        headerToken: 'tok',
        envToken: '   ',
        nodeEnv: 'production',
      })
      expect(verdict.ok).toBe(false)
      if (!verdict.ok) expect(verdict.reason).toBe('missing-env-prod')
    })
  })

  describe('dev/test fail-open', () => {
    it('accepts ANY header when no env token in development', () => {
      const verdict = verifyAsaasSignature({
        headerToken: 'whatever',
        envToken: undefined,
        nodeEnv: 'development',
      })
      expect(verdict.ok).toBe(true)
    })

    it('accepts when nodeEnv is undefined (e.g. local pnpm dev)', () => {
      const verdict = verifyAsaasSignature({
        headerToken: null,
        envToken: undefined,
        nodeEnv: undefined,
      })
      expect(verdict.ok).toBe(true)
    })

    it('accepts when env token is empty string in test', () => {
      const verdict = verifyAsaasSignature({
        headerToken: null,
        envToken: '',
        nodeEnv: 'test',
      })
      expect(verdict.ok).toBe(true)
    })
  })

  describe('timing-safe compare', () => {
    it('accepts exact match', () => {
      const verdict = verifyAsaasSignature({
        headerToken: 'secret123',
        envToken: 'secret123',
        nodeEnv: 'production',
      })
      expect(verdict.ok).toBe(true)
    })

    it('rejects mismatch with same length', () => {
      const verdict = verifyAsaasSignature({
        headerToken: 'secret123',
        envToken: 'secret124',
        nodeEnv: 'production',
      })
      expect(verdict.ok).toBe(false)
      if (!verdict.ok) expect(verdict.reason).toBe('signature-mismatch')
    })

    it('rejects mismatch with different lengths (no timing leak)', () => {
      const verdict = verifyAsaasSignature({
        headerToken: 'short',
        envToken: 'much-longer-secret',
        nodeEnv: 'production',
      })
      expect(verdict.ok).toBe(false)
      if (!verdict.ok) expect(verdict.reason).toBe('signature-mismatch')
    })

    it('rejects when env is set but header is missing', () => {
      const verdict = verifyAsaasSignature({
        headerToken: null,
        envToken: 'secret123',
        nodeEnv: 'production',
      })
      expect(verdict.ok).toBe(false)
      if (!verdict.ok) expect(verdict.reason).toBe('signature-mismatch')
    })

    it('rejects when env is set but header is empty string', () => {
      const verdict = verifyAsaasSignature({
        headerToken: '',
        envToken: 'secret123',
        nodeEnv: 'production',
      })
      expect(verdict.ok).toBe(false)
      if (!verdict.ok) expect(verdict.reason).toBe('signature-mismatch')
    })

    it('trims whitespace before comparing (header)', () => {
      // Some proxies add leading/trailing whitespace. We trim before
      // the timingSafeEqual so this isn't classified as length-mismatch.
      const verdict = verifyAsaasSignature({
        headerToken: '  secret123  ',
        envToken: 'secret123',
        nodeEnv: 'production',
      })
      expect(verdict.ok).toBe(true)
    })

    it('handles multibyte chars without throwing (UTF-8 token)', () => {
      const verdict = verifyAsaasSignature({
        headerToken: 'café-α',
        envToken: 'café-α',
        nodeEnv: 'production',
      })
      expect(verdict.ok).toBe(true)
    })

    it('rejects multibyte mismatch correctly', () => {
      const verdict = verifyAsaasSignature({
        headerToken: 'café-α',
        envToken: 'café-β',
        nodeEnv: 'production',
      })
      expect(verdict.ok).toBe(false)
      if (!verdict.ok) expect(verdict.reason).toBe('signature-mismatch')
    })
  })
})
