import { randomBytes } from 'crypto'
import { hashIntakeToken } from '@/lib/intake/token'

export const hashReviewToken = hashIntakeToken

export function makeReviewToken() {
  return `rev_${randomBytes(24).toString('hex')}`
}

export function reviewPublicPath(token: string) {
  return `/review/${token}`
}

export function reviewPublicUrl(token: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/+$/, '')
  return base ? `${base}${reviewPublicPath(token)}` : reviewPublicPath(token)
}
