/**
 * Tests for lib/concurso/theme.ts
 */
import { describe, expect, it } from 'vitest'

import { getThemeBySlug, themeToCssVars } from '@/lib/concurso/theme'

describe('getThemeBySlug', () => {
  it('returns the navy theme for the real TJSP slug "tjsp-escrevente"', () => {
    const theme = getThemeBySlug('tjsp-escrevente')
    expect(theme.primary).toBe('217 91% 30%')
    expect(theme.accent).toBe('38 92% 50%')
  })

  it('falls back to default for bare "tjsp" (NOT the concurso slug — F-010 guard)', () => {
    const theme = getThemeBySlug('tjsp')
    expect(theme.primary).toBe('221 83% 53%')
  })

  it('returns the pf theme for slug "pf"', () => {
    const theme = getThemeBySlug('pf')
    expect(theme.primary).toBe('142 71% 28%')
  })

  it('falls back to the Flashcards default for unknown slug', () => {
    const theme = getThemeBySlug('unknown-concurso-xyz')
    expect(theme.primary).toBe('221 83% 53%')
    expect(theme.accent).toBe('24 95% 53%')
  })

  it('falls back to the Flashcards default for null', () => {
    const theme = getThemeBySlug(null)
    expect(theme.primary).toBe('221 83% 53%')
  })

  it('falls back to the Flashcards default for undefined', () => {
    const theme = getThemeBySlug(undefined)
    expect(theme.primary).toBe('221 83% 53%')
  })
})

describe('themeToCssVars', () => {
  it('renders all 4 brand variables in one line', () => {
    const css = themeToCssVars({
      primary: '0 0% 0%',
      primaryForeground: '0 0% 100%',
      accent: '60 100% 50%',
      accentForeground: '0 0% 10%',
    })
    expect(css).toContain('--brand-primary: 0 0% 0%;')
    expect(css).toContain('--brand-primary-foreground: 0 0% 100%;')
    expect(css).toContain('--brand-accent: 60 100% 50%;')
    expect(css).toContain('--brand-accent-foreground: 0 0% 10%;')
  })

  it('returns a single-line string (safe to inject into a <style> tag without newlines)', () => {
    const css = themeToCssVars(getThemeBySlug('tjsp'))
    expect(css).not.toContain('\n')
  })
})
