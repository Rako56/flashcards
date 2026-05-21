// tests/setup.ts (Plan 1.3)
// Vitest global setup — runs once before all test files.
//
//   - Imports jest-dom matchers (toBeInTheDocument, toHaveAttribute, etc.) for use
//     in component tests landing in Plans 2+ via React Testing Library.
//   - Boots the MSW Node server with `onUnhandledRequest: 'error'`. ANY test making
//     real outbound HTTP fails fast — no silent network in unit/integration tests
//     (mitigates threat T-1.3-03 in PLAN.md).
//   - Resets handlers + RTL DOM after each test so tests don't leak state.
//   - Closes the server after the entire suite.
//
// Test files add scenario-specific handlers via `server.use(...)`; the
// resetHandlers() in afterEach reverts to the base handlers in tests/msw/handlers.ts.
import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { server } from './msw/server'

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})
