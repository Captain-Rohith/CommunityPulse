// next.config.ts

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/home',
        permanent: true, // Set to false if it's a temporary redirect
      },
    ]
  },
}

export default nextConfig
