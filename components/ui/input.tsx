import * as React from 'react'
import { cn } from '@/lib/utils/cn'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  portal?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, portal = false, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          portal ? 'portal-input' : 'hub-input',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
