/**
 * Tests for lib/concurso/get-from-headers.ts
 *
 * Mocks next/headers and @/lib/concurso/get-by-slug. Covers:
 * - no header → null
 * - header set + matched concurso → row
 * - header set + unknown slug → null (passthrough from getConcursoBySlug)
 * - requireConcursoFromHeaders throws when no concurso
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
})

const mockConcurso = {
  id: 'concurso-1',
  slug: 'tjsp',
  title: 'TJSP Escrevente',
  status: 'active',
  banca: 'VUNESP',
  orgao: 'TJSP',
  area: null,
  cargo: 'Escrevente',
  estado: 'SP',
  data_prova: null,
  descricao: null,
  edital_url: null,
  cover_url: null,
  prioridade: 1,
  tags: null,
}

describe('getConcursoFromHeaders', () => {
  it('returns null when x-concurso-slug header is missing', async () => {
    vi.doMock('next/headers', () => ({
      headers: () =>
        Promise.resolve({
          get: () => null,
        }),
    }))
    vi.doMock('@/lib/concurso/get-by-slug', () => ({
      getConcursoBySlug: () => Promise.reject(new Error('should not be called')),
    }))
    const { getConcursoFromHeaders } = await import('@/lib/concurso/get-from-headers')
    expect(await getConcursoFromHeaders()).toBeNull()
  })

  it('resolves concurso when header is set', async () => {
    vi.doMock('next/headers', () => ({
      headers: () =>
        Promise.resolve({
          get: (name: string) => (name === 'x-concurso-slug' ? 'tjsp' : null),
        }),
    }))
    vi.doMock('@/lib/concurso/get-by-slug', () => ({
      getConcursoBySlug: () => Promise.resolve(mockConcurso),
    }))
    const { getConcursoFromHeaders } = await import('@/lib/concurso/get-from-headers')
    const result = await getConcursoFromHeaders()
    expect(result?.slug).toBe('tjsp')
  })

  it('returns null when slug is unknown (passthrough)', async () => {
    vi.doMock('next/headers', () => ({
      headers: () =>
        Promise.resolve({
          get: (name: string) => (name === 'x-concurso-slug' ? 'nonexistent' : null),
        }),
    }))
    vi.doMock('@/lib/concurso/get-by-slug', () => ({
      getConcursoBySlug: () => Promise.resolve(null),
    }))
    const { getConcursoFromHeaders } = await import('@/lib/concurso/get-from-headers')
    expect(await getConcursoFromHeaders()).toBeNull()
  })
})

describe('requireConcursoFromHeaders', () => {
  it('returns concurso when resolved', async () => {
    vi.doMock('next/headers', () => ({
      headers: () =>
        Promise.resolve({
          get: (name: string) => (name === 'x-concurso-slug' ? 'tjsp' : null),
        }),
    }))
    vi.doMock('@/lib/concurso/get-by-slug', () => ({
      getConcursoBySlug: () => Promise.resolve(mockConcurso),
    }))
    const { requireConcursoFromHeaders } = await import('@/lib/concurso/get-from-headers')
    const result = await requireConcursoFromHeaders()
    expect(result.slug).toBe('tjsp')
  })

  it('throws when no concurso resolves', async () => {
    vi.doMock('next/headers', () => ({
      headers: () =>
        Promise.resolve({
          get: () => null,
        }),
    }))
    vi.doMock('@/lib/concurso/get-by-slug', () => ({
      getConcursoBySlug: () => Promise.resolve(null),
    }))
    const { requireConcursoFromHeaders } = await import('@/lib/concurso/get-from-headers')
    await expect(requireConcursoFromHeaders()).rejects.toThrow(/No concurso resolved/)
  })
})
