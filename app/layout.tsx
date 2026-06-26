import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Appdoers Hub',
  description: 'Appdoers internal CRM and client portal',
  robots: 'noindex, nofollow',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.png', type: 'image/png' },
    ],
    apple: '/favicon_round.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
