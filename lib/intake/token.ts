import { createHash, randomBytes } from 'crypto'

export function hashIntakeToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function makeIntakeToken() {
  return `int_${randomBytes(24).toString('hex')}`
}

export function intakePublicPath(token: string) {
  return `/intake/${token}`
}

export function intakePublicUrl(token: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/+$/, '')
  return base ? `${base}${intakePublicPath(token)}` : intakePublicPath(token)
}
