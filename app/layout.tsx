import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import type { ReactNode } from 'react'

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

export const metadata: Metadata = {
  title: 'Flashcards',
  description: 'Marketplace de preparações curadas para concursos públicos brasileiros.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
