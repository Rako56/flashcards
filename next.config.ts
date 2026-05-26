import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // typedRoutes default for Next 15.5 — opt-in per route; will enable globally in Plan 1.4
}

// Plan 1.10 — wrap with Sentry's build-time integration:
// - Uploads source maps to Sentry on production builds so stack traces
//   resolve to original TypeScript instead of minified JS
// - Tunnels Sentry events through `/monitoring` to bypass ad blockers
//   (browser-side errors otherwise often blocked by uBlock/Brave)
// - Hides source maps from the public build output (only Sentry has them)
//
// Auth token comes from SENTRY_AUTH_TOKEN env (set in GitHub Secrets +
// Vercel env vars). In local dev with no token, source map upload is
// silently skipped — code still works, just no symbolication.
export default withSentryConfig(nextConfig, {
  // Sentry org + project slugs from the project creation step.
  org: 'flashcards-3y',
  project: 'flashcards',

  // Suppress build-time warnings about missing source maps in dev.
  silent: !process.env['CI'],

  // Hide the .map files from production bundles — only Sentry has them.
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Tunnel route to bypass ad blockers (Sentry events POSTed to our
  // domain at /monitoring → proxied through to Sentry by the SDK).
  tunnelRoute: '/monitoring',

  // Skip source map upload when token is absent (local dev).
  disableLogger: true,
})
