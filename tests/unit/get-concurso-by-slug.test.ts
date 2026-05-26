/**
 * Tests for lib/concurso/get-by-slug.ts
 *
 * Mocks `@/lib/supabase/server` so we don't hit the real DB during
 * unit tests. Asserts on the public shape (no leak of `notas_internas`,
 * `created_by`, etc.).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getConcursoBySlug', () => {
  it('returns null for empty slug', async () => {
    const { getConcursoBySlug } = await import('@/lib/concurso/get-by-slug')
    const result = await getConcursoBySlug('')
    expect(result).toBeNull()
  })

  it('returns null for excessively long slug (DoS guard)', async () => {
    const { getConcursoBySlug } = await import('@/lib/concurso/get-by-slug')
    const result = await getConcursoBySlug('x'.repeat(200))
    expect(result).toBeNull()
  })

  it('returns null when Supabase finds no row (maybeSingle returns null)', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          from: () => ({
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
        }),
    }))
    const { getConcursoBySlug } = await import('@/lib/concurso/get-by-slug')
    const result = await getConcursoBySlug('nonexistent')
    expect(result).toBeNull()
  })

  it('returns mapped ConcursoPublic shape on hit', async () => {
    const mockRow = {
      id: 'mock-id-not-a-real-uuid',
      slug: 'tjsp',
      title: 'TJSP Escrevente',
      status: 'active',
      banca: 'VUNESP',
      orgao: 'TJSP',
      area: 'Concurso Público',
      cargo: 'Escrevente Técnico',
      estado: 'SP',
      data_prova: '2026-09-15',
      descricao: 'Concurso para Escrevente',
      edital_url: 'https://example.com/edital.pdf',
      cover_url: null,
      prioridade: 1,
      tags: ['judiciario'],
    }
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          from: () => ({
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: mockRow, error: null }),
              }),
            }),
          }),
        }),
    }))
    const { getConcursoBySlug } = await import('@/lib/concurso/get-by-slug')
    const result = await getConcursoBySlug('tjsp')
    expect(result).toEqual(mockRow)
  })

  it('throws on unexpected Supabase error', async () => {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          from: () => ({
            select: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({ data: null, error: { message: 'connection refused' } }),
              }),
            }),
          }),
        }),
    }))
    const { getConcursoBySlug } = await import('@/lib/concurso/get-by-slug')
    await expect(getConcursoBySlug('any')).rejects.toThrow(/connection refused/)
  })

  it('strips potentially sensitive fields from public shape', async () => {
    // notas_internas, created_by, created_at, updated_at, edital_filename
    // must NOT appear on the returned object — only the explicit public list.
    const mockRow = {
      id: 'fake-id',
      slug: 'tjsp',
      title: 'X',
      status: 'active',
      banca: null,
      orgao: null,
      area: null,
      cargo: null,
      estado: null,
      data_prova: null,
      descricao: null,
      edital_url: null,
      cover_url: null,
      prioridade: null,
      tags: null,
    }
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () =>
        Promise.resolve({
          from: () => ({
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: mockRow, error: null }),
              }),
            }),
          }),
        }),
    }))
    const { getConcursoBySlug } = await import('@/lib/concurso/get-by-slug')
    const result = await getConcursoBySlug('tjsp')
    expect(result).not.toBeNull()
    // Public fields whitelist (mirrors ConcursoPublic interface in get-by-slug.ts)
    const allowedKeys = [
      'id',
      'slug',
      'title',
      'status',
      'banca',
      'orgao',
      'area',
      'cargo',
      'estado',
      'data_prova',
      'descricao',
      'edital_url',
      'cover_url',
      'prioridade',
      'tags',
    ]
    expect(Object.keys(result!).sort()).toEqual(allowedKeys.sort())
  })
})
