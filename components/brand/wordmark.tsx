/**
 * Flashcards wordmark — text-based lockup using the brand palette.
 *
 * Uses CSS vars (`--brand-primary`) so the per-concurso theming
 * applied by middleware/concurso-layout cascades down — same logo,
 * different accent per concurso (e.g., red for TJSP, navy for PF).
 *
 * Variants:
 *  - `sm` (12px): inline next to menu items
 *  - `md` (16px): default header lockup
 *  - `lg` (24px): hero / standalone marketing surfaces
 *
 * The little "card stack" glyph mirrors the favicon (app/icon.tsx)
 * so the visual identity stays coherent.
 *
 * Pure CSS — no SVG, no image, no font-loading penalty. Rafael can
 * swap this for a real logo once design lands without rewiring any
 * other component (everything imports from this file).
 */

import { cn } from '@/lib/utils'

type Size = 'sm' | 'md' | 'lg'

const SIZE_CLASSES: Record<Size, { text: string; glyph: string; gap: string }> = {
  sm: { text: 'text-xs', glyph: 'h-3 w-3', gap: 'gap-1.5' },
  md: { text: 'text-base', glyph: 'h-4 w-4', gap: 'gap-2' },
  lg: { text: 'text-2xl', glyph: 'h-5 w-5', gap: 'gap-2.5' },
}

export interface WordmarkProps {
  size?: Size
  /**
   * If true, render only the glyph (no wordmark text). Useful for
   * mobile/icon-only bars.
   */
  glyphOnly?: boolean
  /** Extra classes to compose with the lockup root. */
  className?: string
}

export function Wordmark({ size = 'md', glyphOnly = false, className }: WordmarkProps) {
  const cfg = SIZE_CLASSES[size]
  return (
    <span
      className={cn('inline-flex items-center font-semibold tracking-tight', cfg.gap, className)}
      aria-label="Flashcards"
    >
      <span
        className={cn('relative inline-block shrink-0 rounded-[3px] bg-brand-primary', cfg.glyph)}
        aria-hidden="true"
      >
        {/* Two stacked rounded squares suggest a flashcard deck. */}
        <span className="absolute inset-[18%] rounded-[2px] bg-brand-primary-foreground/40" />
        <span className="absolute inset-[28%] translate-y-[2px] rounded-[2px] bg-brand-primary-foreground" />
      </span>
      {glyphOnly ? null : <span className={cfg.text}>Flashcards</span>}
    </span>
  )
}
