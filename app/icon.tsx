import { ImageResponse } from 'next/og'

/**
 * Dynamic favicon (32x32). Next.js auto-injects the appropriate
 * `<link rel="icon">` so this file IS the favicon at /icon.
 *
 * Design: stacked-card glyph in brand-primary blue (matches the
 * brand-primary CSS var default). Two offset rounded squares
 * suggesting a flashcard deck. Pure SVG-via-ImageResponse so the
 * render is Edge-compatible and pixel-crisp at the tiny size.
 *
 * Rafael can replace this file with a custom design later without
 * touching anything else — the route convention picks it up.
 */
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#2563eb', // blue-600 — matches --brand-primary HSL default
        borderRadius: 6,
      }}
    >
      <div
        style={{
          display: 'flex',
          position: 'relative',
          width: 22,
          height: 22,
        }}
      >
        {/* Back card */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 4,
            width: 16,
            height: 18,
            background: 'rgba(255,255,255,0.4)',
            borderRadius: 3,
          }}
        />
        {/* Front card */}
        <div
          style={{
            position: 'absolute',
            top: 4,
            left: 0,
            width: 16,
            height: 18,
            background: '#ffffff',
            borderRadius: 3,
          }}
        />
      </div>
    </div>,
    { ...size },
  )
}
