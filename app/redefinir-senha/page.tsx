import { ResetForm } from './reset-form'

export const metadata = {
  title: 'Redefinir senha — Flashcards',
}

export const dynamic = 'force-dynamic'

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <ResetForm />
    </main>
  )
}
