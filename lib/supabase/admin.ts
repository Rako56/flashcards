/**
 * Supabase Admin Client — service_role, server-only.
 *
 * THREE layers of protection ensure the service_role key NEVER reaches a
 * client bundle:
 *
 * 1. `import 'server-only'` at the top: Next.js raises a build-time error if
 *    a Client Component or `'use client'` module tries to import this file.
 * 2. Runtime check below: even if a hostile import somehow bypasses Next.js
 *    (custom bundler, dynamic require, etc.), the module throws on load when
 *    `window` is defined.
 * 3. The env var is NOT prefixed with `NEXT_PUBLIC_`, so it lives only on
 *    the server (Next.js strips non-prefixed envs from client bundles).
 *
 * Use cases: webhook handlers (Asaas), background jobs, admin RPCs that need
 * to bypass RLS. NEVER use this from inside Server Components that render
 * user-facing content — RLS is your friend, don't bypass it casually.
 */
import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database.types'

if (typeof window !== 'undefined') {
  throw new Error(
    'lib/supabase/admin.ts cannot be imported in a client context — service_role key would be exposed',
  )
}

export function createAdminClient() {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY']

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required for admin client')
  }
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin client')
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
