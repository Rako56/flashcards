/**
 * Tests for lib/observability/correlation.ts
 */
import { describe, expect, it } from 'vitest'

import {
  CORRELATION_HEADER_NAME,
  getCorrelationId,
  readCorrelationIdFromHeaders,
  withCorrelationHeader,
} from '@/lib/observability/correlation'

describe('lib/observability/correlation', () => {
  describe('getCorrelationId', () => {
    it('trusts a valid inbound UUID header', () => {
      // eslint-disable-next-line no-restricted-syntax -- test fixture UUID
      const inbound = '550e8400-e29b-41d4-a716-446655440000'
      const request = new Request('https://example.com/x', {
        headers: { [CORRELATION_HEADER_NAME]: inbound },
      })
      expect(getCorrelationId(request)).toBe(inbound)
    })

    it('mints a new UUID when no header is present', () => {
      const request = new Request('https://example.com/x')
      const id = getCorrelationId(request)
      expect(id).toMatch(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
      )
    })

    it('mints a new UUID when inbound header is malformed', () => {
      const request = new Request('https://example.com/x', {
        headers: { [CORRELATION_HEADER_NAME]: 'not-a-uuid' },
      })
      const id = getCorrelationId(request)
      expect(id).not.toBe('not-a-uuid')
      expect(id).toMatch(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
      )
    })

    it('generates distinct UUIDs across calls (no globals leaking)', () => {
      const request = new Request('https://example.com/x')
      const a = getCorrelationId(request)
      const b = getCorrelationId(request)
      expect(a).not.toBe(b)
    })
  })

  describe('withCorrelationHeader', () => {
    it('sets the x-correlation-id header on the response', () => {
      // eslint-disable-next-line no-restricted-syntax -- test fixture UUID
      const correlationId = 'deadbeef-dead-beef-dead-beefdeadbeef'
      const response = withCorrelationHeader(Response.json({ ok: true }), correlationId)
      expect(response.headers.get(CORRELATION_HEADER_NAME)).toBe(correlationId)
    })

    it('returns the same response instance (mutation, not replacement)', () => {
      const response = Response.json({ ok: true })
      // eslint-disable-next-line no-restricted-syntax -- test fixture UUID
      const returned = withCorrelationHeader(response, 'deadbeef-dead-beef-dead-beefdeadbeef')
      expect(returned).toBe(response)
    })
  })

  describe('readCorrelationIdFromHeaders', () => {
    it('returns the id when header has a valid UUID', () => {
      // eslint-disable-next-line no-restricted-syntax -- test fixture UUID
      const id = '550e8400-e29b-41d4-a716-446655440001'
      const headersAccess = {
        get: (name: string) => (name === CORRELATION_HEADER_NAME ? id : null),
      }
      expect(readCorrelationIdFromHeaders(headersAccess)).toBe(id)
    })

    it('returns null when header is absent', () => {
      const headersAccess = { get: () => null }
      expect(readCorrelationIdFromHeaders(headersAccess)).toBeNull()
    })

    it('returns null when header is present but malformed', () => {
      const headersAccess = {
        get: (name: string) => (name === CORRELATION_HEADER_NAME ? 'not-a-uuid' : null),
      }
      expect(readCorrelationIdFromHeaders(headersAccess)).toBeNull()
    })

    it('matches the case-permissive UUID regex used by getCorrelationId', () => {
      // Same regex permissiveness — uppercase hex is allowed.
      // eslint-disable-next-line no-restricted-syntax -- test fixture UUID
      const id = 'DEADBEEF-DEAD-BEEF-DEAD-BEEFDEADBEEF'
      const headersAccess = {
        get: (name: string) => (name === CORRELATION_HEADER_NAME ? id : null),
      }
      expect(readCorrelationIdFromHeaders(headersAccess)).toBe(id)
    })
  })
})
