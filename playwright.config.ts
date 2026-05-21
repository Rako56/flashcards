// playwright.config.ts (Plan 1.4)
//
// E2E test config — Playwright 1.60.0 + Chromium only (firefox/webkit deferred to Phase 7 DESIGN-07).
//
// Two run modes:
//   - LOCAL: no PLAYWRIGHT_BASE_URL set → spawns `pnpm dev` on :3000 via `webServer`.
//   - CI: PLAYWRIGHT_BASE_URL set to the Vercel preview deploy URL → no webServer, points at
//     the live preview deploy. Smoke specs land in Plan 01-13; this config compiles green
//     against an empty tests/e2e/ today.
//
// Shape verbatim from .planning/phases/01-foundation/01-RESEARCH.md Example 5.
// Bracket access on process.env is required by tsconfig `noPropertyAccessFromIndexSignature`.
// Optional props are spread conditionally because `exactOptionalPropertyTypes: true`
// rejects `key: undefined` even when the prop type is `T | undefined`.
import { defineConfig, devices } from '@playwright/test'
import type { PlaywrightTestConfig } from '@playwright/test'

const PORT = 3000
const PLAYWRIGHT_BASE_URL = process.env['PLAYWRIGHT_BASE_URL']
const IS_CI = !!process.env['CI']
const baseURL = PLAYWRIGHT_BASE_URL ?? `http://localhost:${String(PORT)}`

const config: PlaywrightTestConfig = {
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: IS_CI,
  retries: IS_CI ? 2 : 0,
  // `workers` is omitted (not set to undefined) so exactOptionalPropertyTypes is happy.
  ...(IS_CI ? { workers: 1 } : {}),
  reporter: IS_CI ? [['github'], ['html']] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // mobile + safari deferred to Phase 7 (DESIGN-07)
  ],
  // Local-dev webServer; omitted (not undefined) when PLAYWRIGHT_BASE_URL is set
  // (e.g. CI running against a Vercel preview deploy).
  ...(PLAYWRIGHT_BASE_URL
    ? {}
    : {
        webServer: {
          command: 'pnpm dev',
          url: baseURL,
          reuseExistingServer: !IS_CI,
          timeout: 120_000,
        },
      }),
}

export default defineConfig(config)
