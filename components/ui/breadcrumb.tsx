import Link from 'next/link'

import { buildBreadcrumbJsonLd, jsonLdToScript } from '@/lib/seo/jsonld'

export interface BreadcrumbItem {
  name: string
  /** Absolute URL or `null`/`undefined` for the current page. */
  href?: string
}

/**
 * `<Breadcrumb>` — paths shown on deep pages (settings, simulado/[id], etc.)
 *
 * Renders the visual trail AND emits matching schema.org JSON-LD so Google
 * picks up the breadcrumb chip in search results.
 *
 * Last item is current page (no link) by convention — pass `href` only on
 * the entries that should be navigable.
 */
export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  const itemsForLd = items.map((item) => ({
    name: item.name,
    ...(item.href ? { url: item.href } : {}),
  }))
  const jsonLd = buildBreadcrumbJsonLd(itemsForLd)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdToScript(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-foreground/60">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1
          return (
            <span key={`${String(idx)}-${item.name}`} className="flex items-center gap-2">
              {idx > 0 ? <span aria-hidden="true">/</span> : null}
              {isLast || !item.href ? (
                <span aria-current={isLast ? 'page' : undefined} className="text-foreground/80">
                  {item.name}
                </span>
              ) : (
                <Link href={item.href} className="hover:text-foreground hover:underline">
                  {item.name}
                </Link>
              )}
            </span>
          )
        })}
      </nav>
    </>
  )
}
