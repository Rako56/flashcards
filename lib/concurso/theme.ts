/**
 * Per-concurso theme tokens.
 *
 * Phase 2 v1: each concurso slug maps to a `--brand-primary` HSL triple
 * + accent. Stored in code for now (small set; trivial to lookup).
 * Phase 7 may move this to admin_concursos.theme_json so non-devs can
 * configure visuals without a deploy.
 *
 * HSL component format (no `hsl()` wrapper) so it pastes directly into
 * CSS custom property values that get wrapped in `hsl(var(--brand-...))`
 * by Tailwind utilities.
 */

export interface ConcursoTheme {
  primary: string // HSL components: "221 83% 53%"
  primaryForeground: string // "0 0% 100%"
  accent: string
  accentForeground: string
}

const FLASHCARDS_DEFAULT: ConcursoTheme = {
  primary: '221 83% 53%', // blue-600
  primaryForeground: '0 0% 100%',
  accent: '24 95% 53%', // orange-500
  accentForeground: '0 0% 100%',
}

const THEMES_BY_SLUG: Readonly<Record<string, ConcursoTheme>> = {
  // TJSP Escrevente — judicial / institutional / serious — navy + amber.
  // Key MUST be the concurso SLUG ('tjsp-escrevente'), not 'tjsp' — otherwise
  // getThemeBySlug never matches and TJSP silently falls back to the default
  // blue (which is why it looked identical to the apex). F-010 fix.
  'tjsp-escrevente': {
    primary: '217 91% 30%', // deeper navy blue
    primaryForeground: '0 0% 100%',
    accent: '38 92% 50%', // amber-500
    accentForeground: '0 0% 10%',
  },
  // PF (Polícia Federal) — green + tactical — placeholder for future concurso
  pf: {
    primary: '142 71% 28%', // deep green
    primaryForeground: '0 0% 100%',
    accent: '0 0% 20%', // near-black tactical
    accentForeground: '0 0% 100%',
  },
}

/**
 * Get the theme tokens for a concurso slug, falling back to the
 * Flashcards default palette if no override is registered.
 */
export function getThemeBySlug(slug: string | null | undefined): ConcursoTheme {
  if (!slug) return FLASHCARDS_DEFAULT
  return THEMES_BY_SLUG[slug] ?? FLASHCARDS_DEFAULT
}

/**
 * Render a theme as CSS custom property declarations. Suitable for
 * injecting into a <style> tag in a Server Component to override the
 * default :root vars without flash.
 */
export function themeToCssVars(theme: ConcursoTheme): string {
  return [
    `--brand-primary: ${theme.primary};`,
    `--brand-primary-foreground: ${theme.primaryForeground};`,
    `--brand-accent: ${theme.accent};`,
    `--brand-accent-foreground: ${theme.accentForeground};`,
  ].join(' ')
}
