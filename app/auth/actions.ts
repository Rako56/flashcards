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
  // The fallback wraps the raw message so the user has actionable info,
  // not a generic "algo deu errado".
  const lower = message.toLowerCase()
  if (lower.includes('invalid login') || lower.includes('invalid_credentials')) {
    return 'E-mail ou senha inválidos. Verifique e tente novamente.'
  }
  if (lower.includes('user already registered') || lower.includes('already exists')) {
    return 'Esse e-mail já está cadastrado. Tente fazer login ou recuperar a senha.'
  }
  if (lower.includes('email not confirmed')) {
    return 'Confirme o e-mail antes de fazer login. Reenvie o link em /auth/confirmar-email se não recebeu.'
  }
  if (lower.includes('password') && lower.includes('weak')) {
    return 'Essa senha aparece em vazamentos públicos. Use outra com pelo menos 10 caracteres.'
  }
  if (lower.includes('password') && (lower.includes('short') || lower.includes('length'))) {
    return 'A senha precisa ter pelo menos 10 caracteres.'
  }
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Muitas tentativas em sequência. Aguarde alguns minutos e tente novamente.'
  }
  if (lower.includes('user not found')) {
    return 'Não encontramos uma conta com esse e-mail.'
  }
  if (lower.includes('link is invalid') || lower.includes('token') || lower.includes('expired')) {
    return 'O link expirou. Solicite um novo em /esqueci-senha ou /auth/confirmar-email.'
  }
  if (lower.includes('network') || lower.includes('fetch failed') || lower.includes('timeout')) {
    return 'Falha de conexão. Verifique sua internet e tente novamente.'
  }
  // Last-resort fallback — show the raw message but with a friendly
  // prefix so the user knows the system tried to communicate something
  // useful, not a black-box 500.
  return `Não foi possível concluir: ${message}`
}
