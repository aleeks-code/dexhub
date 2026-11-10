import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: 'standalone',
  transpilePackages: ['@dexhub/ui', '@dexhub/sdk', '@dexhub/notes', '@dexhub/tasks', '@dexhub/worklog', '@dexhub/pizza', '@dexhub/debts', '@dexhub/loans'],
  experimental: {
    optimizePackageImports: ['@dexhub/ui', 'lucide-react'],
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
