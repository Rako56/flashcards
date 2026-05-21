// tests/msw/handlers.ts (Plan 1.3)
// Base MSW handlers — empty by default. Feature plans add their own handlers
// here as new external dependencies are introduced:
//
//   - Plan 3.x (auth): Supabase auth endpoints
//   - Plan 4.x (Asaas): Asaas REST + webhooks
//   - Plan 7.x (telemetry): Sentry tunnel
//
// The MSW server is configured with `onUnhandledRequest: 'error'` in
// tests/setup.ts, so any test making real HTTP requests fails fast. Tests that
// need to mock specific endpoints should call `server.use(http.get(...))` per
// test (handlers reset between tests).
import type { HttpHandler } from 'msw'

export const handlers: HttpHandler[] = []
