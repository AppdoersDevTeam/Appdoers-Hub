import type { NextConfig } from 'next'
import path from 'path'

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
  async redirects() {
    return [
      { source: '/app/invoices', destination: '/app/dashboard', permanent: false },
      { source: '/app/invoices/:id', destination: '/app/dashboard', permanent: false },
      { source: '/app/files', destination: '/app/dashboard', permanent: false },
      { source: '/app/proposals/:id', destination: '/app/proposals', permanent: false },
      { source: '/app/contracts/:id', destination: '/app/contracts', permanent: false },
      { source: '/portal/invoices', destination: '/portal/projects', permanent: false },
      { source: '/portal/files', destination: '/portal/projects', permanent: false },
      { source: '/portal/contracts/:id', destination: '/portal/contracts', permanent: false },
    ]
  },
}

export default nextConfig
