import type { ReactNode } from 'react'

// P8 will add requireAdmin() guard here.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div data-surface="admin">{children}</div>
}
