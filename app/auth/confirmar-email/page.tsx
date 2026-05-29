import { NOINDEX_METADATA } from '@/lib/seo/noindex'

import { ResendForm } from './resend-form'

export const metadata = {
  title: 'Confirmar e-mail — Flashcards',
  ...NOINDEX_METADATA,
}

export const dynamic = 'force-dynamic'

export default function ResendConfirmationPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <ResendForm />
    </main>
  )
}
