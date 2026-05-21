import type { ReactNode } from 'react'

// P3 will add auth guard + PrepPaywall hook here.
export default function AppLayout({ children }: { children: ReactNode }) {
  return <div data-surface="app">{children}</div>
}
