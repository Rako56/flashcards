/**
 * Tests for lib/seo/jsonld.ts — pure builders.
 */
import { describe, expect, it } from 'vitest'

import {
  buildBreadcrumbJsonLd,
  buildCourseJsonLd,
  buildOrganizationJsonLd,
  jsonLdToScript,
} from '@/lib/seo/jsonld'

describe('buildOrganizationJsonLd', () => {
  it('returns valid Organization schema', () => {
    const result = buildOrganizationJsonLd()
    expect(result['@context']).toBe('https://schema.org')
    expect(result['@type']).toBe('Organization')
    expect(result.name).toBe('Flashcards')
    expect(result.url).toContain('flashcards.com.br')
  })
})

describe('buildCourseJsonLd', () => {
  it('builds Course with concurso title', () => {
    const result = buildCourseJsonLd({
      title: 'TJSP Escrevente',
      slug: 'tjsp',
      banca: 'VUNESP',
      estado: 'SP',
      cargo: 'Escrevente Técnico',
      descricao: 'Concurso público estadual',
    })
    expect(result.name).toBe('TJSP Escrevente')
    expect(result.description).toBe('Concurso público estadual')
    expect(result.inLanguage).toBe('pt-BR')
    expect(result.about).toBe('SP')
  })

  it('falls back to generated description when none provided', () => {
    const result = buildCourseJsonLd({
      title: 'PF Agente',
      slug: 'pf',
      banca: 'CESPE',
      estado: 'BR',
      cargo: 'Agente',
      descricao: null,
    })
    expect(result.description).toContain('PF Agente')
    expect(result.description).toContain('CESPE')
    expect(result.description).toContain('Agente')
  })

  it('falls back when description is whitespace only', () => {
    const result = buildCourseJsonLd({
      title: 'TJSP',
      slug: 'tjsp',
      descricao: '   ',
    })
    expect(result.description).toContain('TJSP')
  })

  it('omits about when estado is missing', () => {
    const result = buildCourseJsonLd({ title: 'X', slug: 'x' })
    expect(result.about).toBeUndefined()
  })

  it('provider is the brand Organization', () => {
    const result = buildCourseJsonLd({ title: 'X', slug: 'x' })
    expect(result.provider['@type']).toBe('Organization')
    expect(result.provider.name).toBe('Flashcards')
    expect(result.provider.sameAs).toContain('flashcards.com.br')
  })
})

describe('buildBreadcrumbJsonLd', () => {
  it('builds positional ItemList from input', () => {
    const result = buildBreadcrumbJsonLd([
      { name: 'Home', url: 'https://flashcards.com.br' },
      { name: 'TJSP', url: 'https://tjsp.flashcards.com.br' },
      { name: 'Estudar' },
    ])
    expect(result.itemListElement).toHaveLength(3)
    expect(result.itemListElement[0]?.position).toBe(1)
    expect(result.itemListElement[2]?.position).toBe(3)
    expect(result.itemListElement[2]?.item).toBeUndefined()
  })
})

describe('jsonLdToScript', () => {
  it('serializes to compact JSON', () => {
    const result = jsonLdToScript({ '@type': 'Organization', name: 'X' })
    expect(result).toBe('{"@type":"Organization","name":"X"}')
  })
})
