/**
 * `getCurrentUser()` — returns the validated Supabase user for the
 * current request, or `null` if anonymous.
 *
 * Uses `supabase.auth.getUser()` (NOT `getSession()`) which validates
 * the JWT against the Auth server every call. This is the SAME pattern
 * `lib/supabase/middleware.ts` uses for session refresh — keep them
 * aligned to avoid the stale-cookie bug class from the legacy app.
 *
 * Wrapped in React `cache()` so multiple components on the same page
 * share one Auth roundtrip per request (request-scoped memoization).
 *
 * Returns `null` rather than throwing on missing-session so callers
 * can branch into login redirect cleanly. Network errors still throw.
 */
import { cache } from 'react'
import type { User } from '@supabase/supabase-js'

import { createClient } from '@/lib/supabase/server'

export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error) {
    // "Auth session missing" is the normal anonymous state — not an
    // error to surface. Real network errors have other messages.
    if (error.message.toLowerCase().includes('auth session missing')) {
      return null
    }
    throw new Error(`getCurrentUser failed: ${error.message}`)
  }
  return data.user
})
