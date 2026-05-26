/**
 * Tests for components/brand/wordmark.tsx
 *
 * Wordmark is the canonical lockup — any change to its shape or
 * size variants should ripple to every consumer (header, footer,
 * marketing landing). Lock the contract here.
 */
import { describe, expect, it } from 'vitest'

import { render } from '@testing-library/react'

import { Wordmark } from '@/components/brand/wordmark'

describe('components/brand/wordmark', () => {
  it('renders the "Flashcards" text by default', () => {
    const { container } = render(<Wordmark />)
    expect(container.textContent).toContain('Flashcards')
  })

  it('omits the text when glyphOnly=true', () => {
    const { container } = render(<Wordmark glyphOnly />)
    expect(container.textContent).not.toContain('Flashcards')
  })

  it('exposes aria-label="Flashcards" for screen readers', () => {
    const { container } = render(<Wordmark glyphOnly />)
    const root = container.querySelector('[aria-label="Flashcards"]')
    expect(root).not.toBeNull()
  })

  it('applies size variants (sm/md/lg) to text class', () => {
    const sm = render(<Wordmark size="sm" />)
    const md = render(<Wordmark size="md" />)
    const lg = render(<Wordmark size="lg" />)

    expect(sm.container.innerHTML).toContain('text-xs')
    expect(md.container.innerHTML).toContain('text-base')
    expect(lg.container.innerHTML).toContain('text-2xl')
  })

  it('forwards className to the lockup root', () => {
    const { container } = render(<Wordmark className="custom-class" />)
    const root = container.firstElementChild as HTMLElement | null
    expect(root?.className).toContain('custom-class')
  })

  it('marks the glyph as decorative (aria-hidden)', () => {
    const { container } = render(<Wordmark />)
    const glyph = container.querySelector('[aria-hidden="true"]')
    expect(glyph).not.toBeNull()
  })
})
