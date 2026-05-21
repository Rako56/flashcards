import type { ReactNode } from 'react'

// P3 will add the actual auth UI shell (signup/login/reset).
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div data-surface="auth" className="flex min-h-screen items-center justify-center">
      {children}
    </div>
  )
}
