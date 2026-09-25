import type { NextConfig } from 'next'
import path from 'path'
import { withSerwist } from '@serwist/turbopack'

const reactPath = path.join(__dirname, 'node_modules/react')
const reactDomPath = path.join(__dirname, 'node_modules/react-dom')

const nextConfig: NextConfig = {
  serverExternalPackages: ['@react-pdf/renderer'],
  turbopack: {
    root: path.resolve(__dirname),
    resolveAlias: {
      react: './node_modules/react',
      'react-dom': './node_modules/react-dom',
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      react: reactPath,
      'react-dom': reactDomPath,
    }
    return config
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
}

export default withSerwist(nextConfig)
