/**
 * Guards for `lib/supabase/admin.ts`:
 *
 * Tests defense layers 1 (server-only import) and 2 (runtime window check).
 * Layer 3 (NEXT_PUBLIC_ prefix absence) is enforced by Next.js env loader and
 * by `lib/env.ts` Zod schema — covered in env.test.ts.
 *
 * `server-only` is mocked as no-op so the file can be imported in vitest's
 * jsdom environment. The mock only affects the test runtime — Next.js's
 * webpack-build-time enforcement of `server-only` is unchanged.
 */
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

vi.mock('server-only', () => ({}))

describe('lib/supabase/admin.ts', () => {
  describe("Layer 1: 'server-only' import present at the top of the file", () => {
    it("starts with import 'server-only'", () => {
      const source = readFileSync(resolve(__dirname, '../../lib/supabase/admin.ts'), 'utf-8')
      // Allow file-level comment block before the import, then the import statement.
      const firstImportLine = source.split('\n').find((line) => line.trim().startsWith('import'))
      expect(firstImportLine).toBe("import 'server-only'")
    })
  })

  describe('Layer 2: runtime window check throws on browser-like context', () => {
    const originalWindow = globalThis.window

    beforeEach(() => {
      // Reset module registry so the top-level throw re-evaluates each test.
      vi.resetModules()
    })

    afterEach(() => {
      // Restore window (may have been deleted in tests below).
      if (originalWindow !== undefined) {
        globalThis.window = originalWindow
      }
    })

    it('throws when window is defined (simulated client context)', async () => {
      // jsdom env already defines window. Re-importing should throw.
      // We use dynamic import wrapped in a function so vi.resetModules() takes effect.
      await expect(() => import('@/lib/supabase/admin')).rejects.toThrow(
        /cannot be imported in a client context/,
      )
    })

    it('does NOT throw when window is undefined (server context)', async () => {
      // Stash + delete window before re-import.
      // @ts-expect-error — deleting window from globalThis in test context.
      delete globalThis.window
      // Provide env vars so createAdminClient won't throw on missing config when called.
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'fake-service-role-key-for-test-only-1234567890')

      const adminModule = await import('@/lib/supabase/admin')
      expect(adminModule.createAdminClient).toBeTypeOf('function')

      vi.unstubAllEnvs()
    })
  })

  describe('createAdminClient: env var requirement', () => {
    beforeEach(() => {
      vi.resetModules()
      // @ts-expect-error — server context for this block.
      delete globalThis.window
    })

    afterEach(() => {
      vi.unstubAllEnvs()
    })

    it('throws when NEXT_PUBLIC_SUPABASE_URL is missing', async () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'fake-key-12345678901234567890')

      const { createAdminClient } = await import('@/lib/supabase/admin')
      expect(() => createAdminClient()).toThrow(/NEXT_PUBLIC_SUPABASE_URL is required/)
    })

    it('throws when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')

      const { createAdminClient } = await import('@/lib/supabase/admin')
      expect(() => createAdminClient()).toThrow(/SUPABASE_SERVICE_ROLE_KEY is required/)
    })

    it('returns a client object when both env vars are present', async () => {
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
      vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'fake-key-12345678901234567890')

      const { createAdminClient } = await import('@/lib/supabase/admin')
      const client = createAdminClient()
      // Smoke check — the returned object has the canonical supabase-js methods.
      expect(client).toHaveProperty('from')
      expect(client).toHaveProperty('auth')
      expect(client).toHaveProperty('storage')
    })
  })
})
