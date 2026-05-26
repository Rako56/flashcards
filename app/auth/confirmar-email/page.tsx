import { ResendForm } from './resend-form'

export const metadata = {
  title: 'Confirmar e-mail — Flashcards',
}

export const dynamic = 'force-dynamic'

export default function ResendConfirmationPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <ResendForm />
    </main>
  )
}
