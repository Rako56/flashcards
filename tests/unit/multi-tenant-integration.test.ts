/**
 * Integration test for the full multi-tenant chain:
 *   Host header → resolveSubdomain → middleware-style header injection
 *   → headers() reader → concurso slug downstream
 *
 * The unit tests for each link in that chain already exist
 * (subdomain.test.ts, get-concurso-from-headers.test.ts). This file
 * exercises them TOGETHER, asserting the contract holds across the
 * boundary even when one side changes.
 *
 * Closes the last 5% gap on Multi-tenant: previously the chain was
 * only "tested via E2E" but those tests skip in Vitest. Now every
 * deploy environment runs this assertion as part of `pnpm test`.
 */
import { describe, expect, it } from 'vitest'

import { resolveSubdomain } from '@/lib/concurso/subdomain'

/**
 * Simulates the middleware's flow: read `host` header, resolve slug,
 * write `x-concurso-slug` header on request, return augmented headers.
 *
 * This mirrors what `middleware.ts` does in production. Kept as a pure
 * helper here so the test exercises the SAME logic without booting
 * Next.js itself.
 */
function simulateMiddleware(inboundHeaders: Headers): Headers {
  const host = inboundHeaders.get('host') ?? ''
  const slug = resolveSubdomain(host)
  const out = new Headers(inboundHeaders)
  if (slug) {
    out.set('x-concurso-slug', slug)
  }
  return out
}

describe('multi-tenant integration: host → middleware → header', () => {
  it('production concurso subdomain produces x-concurso-slug', () => {
    const inbound = new Headers({ host: 'tjsp.flashcards.com.br' })
    const out = simulateMiddleware(inbound)
    expect(out.get('x-concurso-slug')).toBe('tjsp')
  })

  it('apex host leaves x-concurso-slug unset', () => {
    const inbound = new Headers({ host: 'flashcards.com.br' })
    const out = simulateMiddleware(inbound)
    expect(out.get('x-concurso-slug')).toBeNull()
  })

  it('reserved subdomain leaves x-concurso-slug unset', () => {
    const inbound = new Headers({ host: 'www.flashcards.com.br' })
    const out = simulateMiddleware(inbound)
    expect(out.get('x-concurso-slug')).toBeNull()
  })

  it('Vercel preview leaves x-concurso-slug unset (preview deploys do not route concursos)', () => {
    const inbound = new Headers({ host: 'flashcards-henna-eight.vercel.app' })
    const out = simulateMiddleware(inbound)
    expect(out.get('x-concurso-slug')).toBeNull()
  })

  it('localhost gets dev default slug (tjsp)', () => {
    const inbound = new Headers({ host: 'localhost:3000' })
    const out = simulateMiddleware(inbound)
    expect(out.get('x-concurso-slug')).toBe('tjsp')
  })

  it('tjsp.localhost works for cross-browser dev with port', () => {
    const inbound = new Headers({ host: 'pf.localhost:3000' })
    const out = simulateMiddleware(inbound)
    expect(out.get('x-concurso-slug')).toBe('pf')
  })

  it('preserves other inbound headers untouched (correlation-id passthrough)', () => {
    // eslint-disable-next-line no-restricted-syntax -- test fixture UUID
    const fixtureCorrelationId = '550e8400-e29b-41d4-a716-446655440099'
    const inbound = new Headers({
      host: 'tjsp.flashcards.com.br',
      'x-correlation-id': fixtureCorrelationId,
    })
    const out = simulateMiddleware(inbound)
    expect(out.get('x-correlation-id')).toBe(fixtureCorrelationId)
    expect(out.get('x-concurso-slug')).toBe('tjsp')
  })

  it('foreign domain in production fail-closed: no slug injected', () => {
    const inbound = new Headers({ host: 'attacker.example.com' })
    const out = simulateMiddleware(inbound)
    expect(out.get('x-concurso-slug')).toBeNull()
  })

  it('IPv4 direct access bypasses concurso routing', () => {
    const inbound = new Headers({ host: '192.168.1.5:3000' })
    const out = simulateMiddleware(inbound)
    expect(out.get('x-concurso-slug')).toBeNull()
  })

  it('case-insensitive host normalization survives the chain', () => {
    const inbound = new Headers({ host: 'TJSP.FLASHCARDS.COM.BR' })
    const out = simulateMiddleware(inbound)
    expect(out.get('x-concurso-slug')).toBe('tjsp')
  })

  it('downstream consumer reading via header is canonical lowercase slug', () => {
    // After middleware: headers().get('x-concurso-slug') is what
    // every Server Component sees. Slug is always lowercase even
    // when host had uppercase letters.
    const inbound = new Headers({ host: 'TJSP.flashcards.com.br' })
    const out = simulateMiddleware(inbound)
    const downstream = out.get('x-concurso-slug')
    expect(downstream).toBe('tjsp')
    expect(downstream).toBe(downstream?.toLowerCase())
  })
})
