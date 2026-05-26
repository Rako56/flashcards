import { ImageResponse } from 'next/og'

/**
 * Apple touch icon (180x180). iOS uses this for pinned tabs and
 * "Add to Home Screen". Same composition as `icon.tsx` but scaled
 * up so the rounded-square cards render with proportional radii.
 */
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#2563eb',
        borderRadius: 36,
      }}
    >
      <div
        style={{
          display: 'flex',
          position: 'relative',
          width: 128,
          height: 128,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 22,
            width: 90,
            height: 104,
            background: 'rgba(255,255,255,0.4)',
            borderRadius: 16,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 24,
            left: 0,
            width: 90,
            height: 104,
            background: '#ffffff',
            borderRadius: 16,
          }}
        />
      </div>
    </div>,
    { ...size },
  )
}
