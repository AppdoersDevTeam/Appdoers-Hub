import { cn } from '@/lib/utils/cn'

interface AppdoersLogoProps {
  variant?: 'icon' | 'full'
  className?: string
}

export function AppdoersLogo({ variant = 'icon', className }: AppdoersLogoProps) {
  if (variant === 'full') {
    return (
      <img
        src="/logo.png"
        alt="Appdoers Technology Solutions"
        className={cn('h-12 w-auto object-contain', className)}
      />
    )
  }

  return (
    <img
      src="/favicon.png"
      alt="Appdoers"
      className={cn('h-7 w-7 object-contain', className)}
    />
  )
}
