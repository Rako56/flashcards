import { AuthForm } from '@/app/auth/auth-form'
import { signupAction } from '@/app/auth/actions'

export const metadata = {
  title: 'Criar conta — Flashcards',
}

export default function SignupPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <AuthForm
        action={signupAction}
        mode="signup"
        altHref="/login"
        altLabel="Já tem conta? Entrar"
      />
    </main>
  )
}
