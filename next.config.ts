import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // typedRoutes default for Next 15.5 — opt-in per route; will enable globally in Plan 1.4
}

export default nextConfig
