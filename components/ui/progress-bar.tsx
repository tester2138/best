'use client'

import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  max?: number
  label?: string
  showValue?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'success' | 'warning' | 'muted'
  className?: string
}

const sizeMap = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3'
}

const variantMap = {
  default: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  muted: 'bg-muted-foreground'
}

export function ProgressBar({
  value = 0,
  max = 5,
  label,
  showValue = true,
  size = 'md',
  variant = 'success',
  className
}: ProgressBarProps) {
  const safeValue = value ?? 0
  const percentage = Math.min((safeValue / max) * 100, 100)
  
  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && (
            <span className="text-sm text-muted-foreground">{label}</span>
          )}
          {showValue && (
            <span className="text-sm font-medium text-foreground">
              {safeValue.toFixed(1)}/{max}
            </span>
          )}
        </div>
      )}
      <div className={cn('w-full bg-secondary rounded-full overflow-hidden', sizeMap[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-500 ease-out', variantMap[variant])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
