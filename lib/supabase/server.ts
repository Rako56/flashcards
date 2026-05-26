/**
 * Supabase Server Client — for Server Components, Server Actions, Route Handlers.
 *
 * Per-request client that reads/writes auth cookies via Next.js `next/headers`.
 * Uses the modern `@supabase/ssr` `getAll/setAll` cookie pattern (the deprecated
 * `cookies.get/set/remove` shape is gone).
 *
 * Cookies are scoped to `.flashcards.com.br` in production so the user stays
 * authenticated across `<concurso>.flashcards.com.br` subdomains. In dev,
 * `domain` is undefined (browser defaults to the dev host).
 *
 * Server Components cannot write cookies (Next.js limitation), so `setAll`
 * swallows write errors when called from an RSC context. Server Actions and
 * Route Handlers CAN write cookies and the wrapping middleware refreshes
 * sessions on every request anyway.
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { requireEnv } from '@/lib/supabase/env'
import type { Database } from '@/types/database.types'

export async function createClient() {
  const cookieStore = await cookies()
  const isProduction = process.env.NODE_ENV === 'production'

  return createServerClient<Database>(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // RSC context — middleware will refresh the session on next request.
          }
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
}
