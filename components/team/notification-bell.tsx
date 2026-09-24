'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
  type NotificationRow,
} from '@/lib/actions/notifications'
import { formatRelativeTime } from '@/lib/utils/format'

export function NotificationBell({ notifications }: { notifications: NotificationRow[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const unread = notifications.filter((item) => !item.read_at)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread.length > 0 && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-blue-600" />
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <p className="text-xs font-medium text-slate-600">Notifications</p>
            {unread.length > 0 && (
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await markAllNotificationsReadAction()
                    router.refresh()
                  })
                }
                className="text-xs text-blue-600 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="px-3 py-6 text-sm text-slate-500">No notifications yet.</li>
            ) : (
              notifications.map((item) => (
                <li key={item.id} className={item.read_at ? 'bg-white' : 'bg-blue-50/60'}>
                  <Link
                    href={item.href || '/app/dashboard'}
                    onClick={() => {
                      setOpen(false)
                      if (!item.read_at) {
                        startTransition(async () => {
                          await markNotificationReadAction(item.id)
                          router.refresh()
                        })
                      }
                    }}
                    className="block px-3 py-2.5 hover:bg-slate-50"
                  >
                    <p className="text-sm font-medium text-slate-900">{item.title}</p>
                    {item.body && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{item.body}</p>}
                    <p className="mt-1 text-xs text-slate-400">{formatRelativeTime(item.created_at)}</p>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
