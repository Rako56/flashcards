// tests/msw/server.ts (Plan 1.3)
// Single MSW Node server reused across all test files. Tests import it to
// `server.use(http.get(...))` per-test, then afterEach in tests/setup.ts
// resets back to the base handlers defined in tests/msw/handlers.ts.
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
