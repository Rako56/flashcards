import type { Metadata } from 'next'
import { Fraunces, Inter } from 'next/font/google'
import { headers } from 'next/headers'
import type { ReactNode } from 'react'

import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { getThemeBySlug, themeToCssVars } from '@/lib/concurso/theme'

import { Providers } from './providers'
import './globals.css'

// Inter via `next/font` — self-hosted, subset to latin (covers PT-BR),
// CSS variable `--font-sans` consumed by Tailwind theme.fontFamily.sans.
// No external request, no FOUC, no layout shift.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

// Fraunces — display serif for marketing surfaces. Used only on hero/H1
// of public pages (apex landing, per-concurso landings). Weighted toward
// semibold/bold; `opsz` axis makes large titles look intentional rather
// than "default Times-on-steroids". Latin subset covers PT-BR diacritics.
// Tailwind alias: `font-display` via theme.fontFamily.display.
// `weight: 'variable'` é necessário pra poder declarar `axes`. Quando
// declaramos uma lista de weights estáticos (['500','600','700']), o
// Next.js gera arquivos pré-rasterizados e proíbe axes — daí o build
// quebrava com "Axes can only be defined for variable fonts when the
// weight property is nonexistent or set to `variable`".
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: 'variable',
  style: ['normal'],
  axes: ['opsz'],
})

export const metadata: Metadata = {
  title: 'Flashcards',
  description: 'Marketplace de preparações curadas para concursos públicos brasileiros.',
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Read the concurso slug injected by middleware.ts. Used to override
  // brand CSS variables inline below — no FOUC because the override is
  // rendered server-side before any paint.
  const headerStore = await headers()
  const slug = headerStore.get('x-concurso-slug')
  const theme = getThemeBySlug(slug)
  const cssVars = themeToCssVars(theme)

  return (
    <html lang="pt-BR" className={`${inter.variable} ${fraunces.variable}`}>
      <head>
        {/*
         * Per-concurso theme override. Injecting a :root style block
         * here (server-side) wins over the globals.css defaults without
         * any hydration flicker. The block is small and gzip-friendly
         * (one rule per concurso visit).
         */}
        <style dangerouslySetInnerHTML={{ __html: `:root { ${cssVars} }` }} />
      </head>
      <body className="flex min-h-screen flex-col font-sans">
        <Providers>
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  )
}
