import { AuthForm } from '@/app/auth/auth-form'
import { signupAction } from '@/app/auth/actions'

export const metadata = {
  title: 'Criar conta — Flashcards',
  description:
    'Crie sua conta no Flashcards e estude para concursos com flashcards de repetição espaçada, simulados e caderno de erros — conteúdo curado, sem IA.',
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
