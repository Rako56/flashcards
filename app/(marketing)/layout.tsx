import type { ReactNode } from 'react'

// P2 will add marketing chrome (navbar, footer, hero variations).
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <div data-surface="marketing">{children}</div>
}
