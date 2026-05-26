/**
 * E2E smoke tests (Plan 1.13) — exercise the live preview deploy end-to-end.
 *
 * Run with `pnpm test:e2e` locally (spawns dev server) or via CI with
 * PLAYWRIGHT_BASE_URL pointing at the Vercel preview URL.
 *
 * Each test should be independent and idempotent — no DB writes, no
 * dependence on a logged-in user. The point is "is the deployment alive
 * and serving canonical routes" not "does feature X work" (those go in
 * feature-specific specs later).
 */
import { expect, test } from '@playwright/test'

test.describe('smoke: deployment liveness', () => {
  test('GET / responds with 200 and includes brand', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBeLessThan(400)
    // Brand text appears in either the marketing landing OR the concurso
    // landing — both render "Flashcards" in the header.
    await expect(page.locator('body')).toContainText(/Flashcards|flashcards/i)
  })

  test('GET /api/healthz returns JSON with documented shape', async ({ request }) => {
    const response = await request.get('/api/healthz')
    // We accept 200 (full green) or 500 (degraded but reachable) — the
    // smoke is checking the route exists, NOT that downstream Supabase
    // is healthy (that's a separate alerting concern).
    expect([200, 500]).toContain(response.status())
    const body = await response.json()
    expect(body).toHaveProperty('correlationId')
    expect(body).toHaveProperty('timestamp')
    expect(body).toHaveProperty('checks')
  })

  test('GET /login renders the form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel(/e-?mail/i)).toBeVisible()
    await expect(page.getByLabel(/senha/i)).toBeVisible()
  })

  test('GET /signup renders the form', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.getByLabel(/e-?mail/i)).toBeVisible()
    await expect(page.getByLabel(/senha/i)).toBeVisible()
  })

  test('GET /termos returns the legal page', async ({ page }) => {
    const response = await page.goto('/termos')
    expect(response?.status()).toBeLessThan(400)
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })

  test('GET /privacidade returns the legal page', async ({ page }) => {
    const response = await page.goto('/privacidade')
    expect(response?.status()).toBeLessThan(400)
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })

  test('GET /sitemap.xml returns valid XML', async ({ request }) => {
    const response = await request.get('/sitemap.xml')
    expect(response.status()).toBe(200)
    const body = await response.text()
    expect(body).toContain('<?xml')
    expect(body).toContain('<urlset')
  })

  test('GET /robots.txt returns the policy', async ({ request }) => {
    const response = await request.get('/robots.txt')
    expect(response.status()).toBe(200)
    const body = await response.text()
    expect(body).toContain('User-Agent')
  })

  test('protected route /study redirects to /login when anonymous', async ({ page }) => {
    const response = await page.goto('/study', { waitUntil: 'domcontentloaded' })
    // We may land on /login OR on / (depends on whether a concurso was
    // resolved). Either way, we must NOT see the study session UI.
    expect(response?.status()).toBeLessThan(500)
    const url = page.url()
    expect(url).toMatch(/\/(login|$)/)
  })

  test('protected route /erros redirects to /login when anonymous', async ({ page }) => {
    const response = await page.goto('/erros', { waitUntil: 'domcontentloaded' })
    expect(response?.status()).toBeLessThan(500)
    const url = page.url()
    expect(url).toMatch(/\/(login|$)/)
  })

  test('protected route /simulado redirects when anonymous', async ({ page }) => {
    const response = await page.goto('/simulado', { waitUntil: 'domcontentloaded' })
    expect(response?.status()).toBeLessThan(500)
    const url = page.url()
    expect(url).toMatch(/\/(login|$)/)
  })

  test('OG image route returns image/png', async ({ request }) => {
    const response = await request.get('/opengraph-image')
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('image/png')
  })
})
