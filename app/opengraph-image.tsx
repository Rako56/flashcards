import { ImageResponse } from 'next/og'

import { getConcursoFromHeaders } from '@/lib/concurso/get-from-headers'

/**
 * Default OG image for every page that doesn't override it.
 *
 * Next.js `opengraph-image` convention: this file is rendered at
 * /opengraph-image and the runtime auto-injects the meta tag into
 * every page under app/.
 *
 * Server-rendered ImageResponse — Edge-compatible. Reads the
 * x-concurso-slug header so each concurso subdomain gets its own
 * card without us shipping static PNGs per concurso.
 *
 * Size 1200x630 is the canonical OG dimension (LinkedIn, Twitter,
 * WhatsApp link cards, Google).
 */
export const runtime = 'edge'
export const alt = 'Flashcards — Marketplace de preparações para concursos'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpengraphImage() {
  const concurso = await getConcursoFromHeaders()

  const title = concurso?.title ?? 'flashcards.com.br'
  const subtitle = concurso
    ? `${concurso.banca ?? 'Concurso'}${concurso.estado ? ` · ${concurso.estado}` : ''}`
    : 'Marketplace de preparações curadas'
  const cargo = concurso?.cargo ?? 'para concursos públicos brasileiros'

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '80px',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#f8fafc',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignSelf: 'flex-start',
          padding: '8px 20px',
          borderRadius: '999px',
          background: '#dc2626',
          color: '#fff',
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        {subtitle}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          style={{
            fontSize: 88,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.05,
          }}
        >
          {title}
        </div>
        {cargo ? (
          <div
            style={{
              fontSize: 36,
              color: '#cbd5e1',
              fontWeight: 400,
            }}
          >
            {cargo}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          fontSize: 24,
          color: '#94a3b8',
        }}
      >
        <div style={{ fontWeight: 600, color: '#f8fafc' }}>flashcards.com.br</div>
        <div>Preparação curada · sem ruído</div>
      </div>
    </div>,
    {
      ...size,
    },
  )
}
