'use client'

import { useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/browser'

/**
 * "Continuar com Google" button (AUTH-03).
 *
 * Calls `supabase.auth.signInWithOAuth({ provider: 'google' })` which
 * redirects the user to Google. Google bounces back to
 * `/auth/callback?code=...` which the existing callback route consumes
 * to set the session cookie.
 *
 * `redirectTo` is computed from `window.location.origin` at click time
 * so the OAuth flow returns to the SAME concurso subdomain the user
 * started from. This is critical for multi-tenant — if a user starts
 * on `tjsp.flashcards.com.br/login` we must NOT bounce them to apex.
 *
 * NOTE: Google provider must be enabled in Supabase Dashboard →
 * Authentication → Providers → Google, with the Client ID + Secret
 * filled in from Google Cloud Console. Without that, the redirect
 * lands on a Supabase error page. The code below is correct regardless.
 */
export function GoogleButton({ label = 'Continuar com Google' }: { label?: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleClick = () => {
    setError(null)
    startTransition(async () => {
      try {
        const supabase = createClient()
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        })
        if (oauthError) {
          setError('Não foi possível iniciar o login com Google. Tente novamente.')
        }
        // On success, the browser is redirected to Google — no further work here.
      } catch {
        setError('Não foi possível iniciar o login com Google. Tente novamente.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        disabled={isPending}
        className="w-full"
      >
        <GoogleIcon className="mr-2 h-4 w-4" />
        {isPending ? 'Redirecionando…' : label}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}
