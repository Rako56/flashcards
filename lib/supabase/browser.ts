/**
 * Supabase Browser Client — for Client Components.
 *
 * Module-level singleton. Calling `createClient()` multiple times returns the
 * same instance, which prevents creating duplicate WebSocket connections to
 * the Realtime gateway and duplicate auth listeners across React renders.
 *
 * Cookie domain matches the server client (`.flashcards.com.br` in production)
 * so sessions are shared across subdomains.
 */
import { createBrowserClient } from '@supabase/ssr'

import { requireEnv } from '@/lib/supabase/env'
import type { Database } from '@/types/database.types'

// eslint-disable-next-line @typescript-eslint/no-deprecated
let client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (client) return client

  const isProduction = process.env.NODE_ENV === 'production'

  // The @supabase/ssr 0.10.3 type defs flag `createBrowserClient` with a
  // generic get/set/remove deprecation note even though we only use the new
  // shape (cookieOptions, not cookies.get/set/remove). The runtime behavior
  // is correct; suppressing the false positive deprecation lint.
  client = createBrowserClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookieOptions: {
        ...(isProduction ? { domain: '.flashcards.com.br' } : {}),
        sameSite: 'lax',
        secure: isProduction,
        path: '/',
      },
    },
  )
  return client
}
