import { AuthForm } from '@/app/auth/auth-form'
import { loginAction } from '@/app/auth/actions'

export const metadata = {
  title: 'Entrar — Flashcards',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      {error ? (
        <div className="w-full max-w-md rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error === 'missing-code'
            ? 'Link de confirmação inválido. Tente fazer login.'
            : error === 'invalid-code'
              ? 'Link de confirmação expirado. Tente fazer login ou solicite um novo.'
              : 'Erro ao entrar. Tente novamente.'}
        </div>
      ) : null}
      <AuthForm
        action={loginAction}
        mode="login"
        altHref="/signup"
        altLabel="Ainda não tem conta? Criar conta"
      />
    </main>
  )
}
