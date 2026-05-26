// vitest.config.ts (Plan 1.3)
// Vitest 3.2.4 with V8 coverage + per-path thresholds:
//   - Global floor: 50% lines/functions/branches/statements
//   - Per-path ceiling: 90% on lib/{srs,queue,asaas,access}/** (money + correctness critical)
//
// Per-path glob keys (`'lib/srs/**': { lines: 90, ... }`) are Vitest 3.x syntax.
// Verified against vitest 3.2.4 docs: https://vitest.dev/config/#coverage-thresholds
//
// MSW lives in tests/setup.ts via setupFiles. The setup file boots `server.listen({
// onUnhandledRequest: 'error' })` so any test making real HTTP fails fast.
//
// Plan 1.4 will add Playwright at e2e/ and a gate-break probe that proves the per-path
// thresholds actually fire on uncovered code (threat T-1.3-04).
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      'node_modules',
      '.next',
      'e2e/**',
      'tests/e2e/**',
      'playwright-report',
      'tests/lint-fixtures/**',
    ],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['lib/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
      exclude: [
        '**/*.d.ts',
        '**/types/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/__tests__/**',
        'tests/**',
        'app/**/page.tsx', // Pages are integration-tested via E2E
        'app/**/layout.tsx',
        'app/**/loading.tsx',
        'app/**/error.tsx',
        'app/**/not-found.tsx',
        'app/**/global-error.tsx',
        'app/**/opengraph-image.tsx', // Next.js convention — runtime renders ImageResponse; E2E covers
        'app/**/twitter-image.tsx',
        'app/**/icon.tsx',
        'app/**/apple-icon.tsx',
        'app/**/actions.ts', // Server Actions — integration-tested via E2E (need real DB + session)
        'app/**/*-form.tsx', // 'use client' forms paired with the actions above
        'app/providers.tsx', // 'use client' shadcn-style wrapper; integration-tested via E2E in Plan 1.4
        'lib/env.ts', // env() validator tested separately; module-cache mocking confuses V8 line counts
      ],
      thresholds: {
        // Global floor — applies to everything in coverage.include not matched by per-path glob
        lines: 50,
        functions: 50,
        branches: 50,
        statements: 50,

        // Per-directory ceiling — these are money / correctness critical.
        // Plan 5 (SRS + queue), Plan 4 (Asaas), Plan 3 (access) will replace placeholder
        // exports with real code. The 90% gate forces real tests on real code.
        'lib/srs/**': { lines: 90, functions: 90, branches: 90, statements: 90 },
        'lib/queue/**': { lines: 90, functions: 90, branches: 90, statements: 90 },
        'lib/asaas/**': { lines: 90, functions: 90, branches: 90, statements: 90 },
        'lib/access/**': { lines: 90, functions: 90, branches: 90, statements: 90 },
      },
    },
  },
})
