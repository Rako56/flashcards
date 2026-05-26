'use server'

/**
 * Auth Server Actions — signup, login, logout.
 *
 * All paths return a typed result shape:
 *
 *   { ok: true } | { ok: false, error: string, fieldErrors?: { ... } }
 *
 * The client-side form (use `useFormState` or `useActionState` in React
 * 19+) renders the error message to the user. We return Portuguese
 * messages because the user-facing copy is PT-BR.
 *
 * Server-side validation via Zod (mirrors any client-side schema). Even
 * if the client bypasses validation, the action rejects bad input.
 */
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { childLogger } from '@/lib/observability/logger'
import { captureWithCorrelation } from '@/lib/observability/sentry'
import { createClient } from '@/lib/supabase/server'

const EmailSchema = z
  .string({ required_error: 'Informe o e-mail.' })
  .trim()
  .min(1, 'Informe o e-mail.')
  .email('E-mail inválido.')

// Password rules per FOUND-10 / OPS-07 / Sentry security: ≥10 chars.
// HIBP is enforced by Supabase Auth itself (we enabled it in Plan 1.6
// PATCH /config/auth `password_hibp_enabled: true`).
const PasswordSchema = z
  .string({ required_error: 'Informe a senha.' })
  .min(10, 'A senha precisa ter pelo menos 10 caracteres.')

const SignupSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
})

const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Informe a senha.'),
})

export type AuthActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string; fieldErrors?: Partial<Record<'email' | 'password', string>> }

/**
 * Signup with email + senha. Supabase sends a confirmation email; the
 * user clicks the link, which lands on /auth/callback?code=... and
 * sets the session cookie.
 *
 * Returns a `pending-confirmation` flag so the UI can show "verifique
 * seu email" copy.
 */
export async function signupAction(_: unknown, formData: FormData): Promise<AuthActionResult> {
  const correlationId = crypto.randomUUID()
  const log = childLogger({ correlationId, action: 'signup' })

  const parsed = SignupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return mapZodError(parsed.error)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    log.warn({ err: error.message }, 'signup failed')
    return { ok: false, error: friendlyAuthError(error.message) }
  }

  // Supabase returns user even if email confirmation is pending. Treat
  // "no session" as "verifique seu email" success.
  if (!data.session) {
    log.info({ userId: data.user?.id }, 'signup ok — email confirmation pending')
    return {
      ok: true,
      message: 'Conta criada. Enviamos um e-mail de confirmação — clique no link para ativar.',
    }
  }

  // If somehow signup returned a session (autoconfirm enabled), bounce.
  log.info({ userId: data.user?.id }, 'signup ok with active session — autoconfirm path')
  redirect('/')
}

/**
 * Login. On success, Supabase sets the auth cookies and we redirect to
 * /. On failure, return the localized error.
 */
export async function loginAction(_: unknown, formData: FormData): Promise<AuthActionResult> {
  const correlationId = crypto.randomUUID()
  const log = childLogger({ correlationId, action: 'login' })

  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return mapZodError(parsed.error)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    log.warn({ err: error.message }, 'login failed')
    captureWithCorrelation(error, correlationId, { action: 'login' })
    return { ok: false, error: friendlyAuthError(error.message) }
  }

  log.info('login ok')
  redirect('/')
}

/**
 * Logout. Invalidates the session server-side AND clears cookies. The
 * `signOut()` call rotates the refresh token so a leaked cookie can't
 * be replayed.
 */
export async function logoutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapZodError(err: z.ZodError): AuthActionResult {
  const fieldErrors: { email?: string; password?: string } = {}
  for (const issue of err.issues) {
    const field = issue.path[0]
    if (field === 'email' || field === 'password') {
      fieldErrors[field] = issue.message
    }
  }
  return { ok: false, error: 'Verifique os dados informados.', fieldErrors }
}

function friendlyAuthError(message: string): string {
  // Translate the most common Supabase Auth error messages to PT-BR.
  // Default to the raw message if no known pattern matches (better than
  // hiding info that might help the user).
  const lower = message.toLowerCase()
  if (lower.includes('invalid login') || lower.includes('invalid_credentials')) {
    return 'E-mail ou senha inválidos.'
  }
  if (lower.includes('user already registered') || lower.includes('already exists')) {
    return 'Esse e-mail já está cadastrado. Tente fazer login.'
  }
  if (lower.includes('email not confirmed')) {
    return 'Confirme o e-mail antes de fazer login. Reenvie o link em /auth/confirmar-email se não recebeu.'
  }
  if (lower.includes('password') && lower.includes('weak')) {
    return 'Senha muito fraca. Use uma combinação mais segura (não vazada em incidentes públicos).'
  }
  if (lower.includes('rate limit')) {
    return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
  }
  return message
}
