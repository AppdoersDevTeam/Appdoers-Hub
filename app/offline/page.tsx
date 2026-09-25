import Link from 'next/link'

export const metadata = {
  title: 'Offline | Appdoers Hub',
  robots: 'noindex, nofollow',
}

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#F8FAFC] px-6 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">You’re offline</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        Reconnect to the internet to use Appdoers Hub. Your data stays live on the server — nothing is
        edited offline.
      </p>
      <Link
        href="/app/dashboard"
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
      >
        Try again
      </Link>
    </main>
  )
}
