import { ForgotForm } from './forgot-form'

export const metadata = {
  title: 'Esqueci minha senha — Flashcards',
}

export const dynamic = 'force-dynamic'

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <ForgotForm />
    </main>
  )
}
