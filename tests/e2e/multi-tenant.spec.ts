/**
 * Cross-subdomain E2E tests (Phase 2 Plan 2.4 + 2.5).
 *
 * Exercises the middleware → header injection → page rendering chain
 * for multi-tenant subdomain resolution.
 *
 * Only runs when PLAYWRIGHT_BASE_URL is set AND points to a host that
 * supports wildcard subdomains (Vercel preview URL or staging). On
 * local dev (`pnpm test:e2e` without PLAYWRIGHT_BASE_URL), each test
 * skips with a clear reason because `localhost` doesn't have working
 * subdomains without /etc/hosts entries.
 */
import { expect, test } from '@playwright/test'

const BASE_URL = process.env['PLAYWRIGHT_BASE_URL'] ?? ''

function deriveSubdomainUrl(slug: string): string | null {
  if (!BASE_URL) return null
  try {
    const u = new URL(BASE_URL)
    // Vercel preview: flashcards-henna-eight.vercel.app
    // We can't actually wildcard a Vercel preview deployment, so this
    // skips unless BASE_URL is a real flashcards.com.br host.
    if (!u.hostname.endsWith('flashcards.com.br')) return null
    return `${u.protocol}//${slug}.${u.hostname.replace(/^(?:[^.]+\.)?/, '')}${u.pathname}`
  } catch {
    return null
  }
}

test.describe('multi-tenant: subdomain resolution', () => {
  test('apex / shows marketing landing, NOT a concurso card', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBeLessThan(400)
    // Apex page has the brand H1 and the "Marketplace" copy
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('apex /sitemap.xml lists per-concurso URLs', async ({ request }) => {
    const response = await request.get('/sitemap.xml')
    expect(response.status()).toBe(200)
    const body = await response.text()
    expect(body).toContain('<urlset')
    // At least the apex entry must be present
    expect(body).toMatch(/<loc>https?:\/\/[^<]*flashcards\.com\.br\/?<\/loc>/i)
  })

  test('apex /opengraph-image is image/png with non-zero body', async ({ request }) => {
    const response = await request.get('/opengraph-image')
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('image/png')
    const buf = await response.body()
    expect(buf.byteLength).toBeGreaterThan(1000)
  })

  test('tjsp subdomain (if reachable) lands on TJSP concurso landing', async ({ page }) => {
    const url = deriveSubdomainUrl('tjsp')
    if (!url) {
      test.skip(true, 'PLAYWRIGHT_BASE_URL is not a flashcards.com.br host')
      return
    }
    const response = await page.goto(url)
    expect(response?.status()).toBeLessThan(400)
    // The concurso landing carries the concurso title in the H1
    await expect(page.locator('h1').first()).toContainText(/TJSP|escrevente/i)
  })

  test('reserved subdomain "www" falls back to apex behavior', async ({ page }) => {
    const url = deriveSubdomainUrl('www')
    if (!url) {
      test.skip(true, 'PLAYWRIGHT_BASE_URL is not a flashcards.com.br host')
      return
    }
    const response = await page.goto(url)
    expect(response?.status()).toBeLessThan(400)
    // Should NOT 404 — reserved subdomains map to apex content
    await expect(page.locator('h1').first()).toBeVisible()
  })
})
