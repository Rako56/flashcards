/**
 * JSON-LD structured data builders.
 *
 * Outputs schema.org `Organization` + per-concurso `Course` markup
 * that Google indexes for rich result eligibility. Each builder
 * returns a serializable object the page injects via
 * `<script type="application/ld+json">`.
 *
 * No external dependencies — types are inline to keep this lib
 * tiny and tree-shakable.
 */

export interface JsonLdContext {
  '@context': 'https://schema.org'
  '@type': string
}

export interface OrganizationJsonLd extends JsonLdContext {
  '@type': 'Organization'
  name: string
  url: string
  logo?: string
  sameAs?: string[]
  description?: string
}

export interface CourseJsonLd extends JsonLdContext {
  '@type': 'Course'
  name: string
  description: string
  provider: { '@type': 'Organization'; name: string; sameAs: string }
  inLanguage: string
  educationalLevel?: string
  about?: string
}

export interface BreadcrumbJsonLd extends JsonLdContext {
  '@type': 'BreadcrumbList'
  itemListElement: {
    '@type': 'ListItem'
    position: number
    name: string
    item?: string
  }[]
}

const BRAND_NAME = 'Flashcards'
const BRAND_URL = 'https://flashcards.com.br'

export function buildOrganizationJsonLd(): OrganizationJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND_NAME,
    url: BRAND_URL,
    description:
      'Marketplace de preparações curadas para concursos públicos brasileiros, com flashcards inteligentes e simulados.',
    sameAs: [],
  }
}

export interface ConcursoJsonLdInput {
  title: string
  slug: string
  banca?: string | null
  estado?: string | null
  cargo?: string | null
  descricao?: string | null
}

export function buildCourseJsonLd(concurso: ConcursoJsonLdInput): CourseJsonLd {
  const cargo = concurso.cargo ? ` — ${concurso.cargo}` : ''
  const banca = concurso.banca ? ` (banca ${concurso.banca})` : ''
  const fallbackDesc = `Preparação curada para ${concurso.title}${banca}${cargo}. Flashcards inteligentes, caderno de erros e simulados.`
  const trimmed = concurso.descricao?.trim()
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: concurso.title,
    description: trimmed && trimmed.length > 0 ? trimmed : fallbackDesc,
    provider: {
      '@type': 'Organization',
      name: BRAND_NAME,
      sameAs: BRAND_URL,
    },
    inLanguage: 'pt-BR',
    ...(concurso.estado ? { about: concurso.estado } : {}),
  }
}

export function buildBreadcrumbJsonLd(items: { name: string; url?: string }[]): BreadcrumbJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  }
}

/**
 * Render helper — caller passes the JSON-LD object and gets back
 * the inline script string. Lets pages call `<script
 * dangerouslySetInnerHTML={{ __html: jsonLdToScript(data) }} />`.
 */
export function jsonLdToScript(data: object): string {
  return JSON.stringify(data, null, 0)
}
