/**
 * Supabase Auth Middleware Helper.
 *
 * Called from the project root `middleware.ts` (which will be added in a
 * later plan) on every request. Refreshes the auth session and writes any
 * updated cookies back to the response.
 *
 * CRITICAL: uses `supabase.auth.getUser()` — NOT `getSession()`.
 *
 * - `getSession()` returns whatever is in the cookie without validating it
 *   against the Auth server. A stale cookie passes silently.
 * - `getUser()` makes a roundtrip to the Auth server to validate the JWT and
 *   refresh the access token if needed.
 *
 * The legacy `sparkle-study-scape` codebase used `getSession()` in middleware
 * and had a bug class where users with expired tokens stayed "logged in" until
 * a fresh server action failed. Don't repeat it.
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { requireEnv } from '@/lib/supabase/env'
import type { Database } from '@/types/database.types'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const isProduction = process.env.NODE_ENV === 'production'

  const supabase = createServerClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
      cookieOptions: {
        ...(isProduction ? { domain: '.flashcards.com.br' } : {}),
        sameSite: 'lax',
        secure: isProduction,
        path: '/',
      },
    },
  )

  // Validate the session against the Auth server. Do NOT replace with getSession().
  await supabase.auth.getUser()

  return response
}
