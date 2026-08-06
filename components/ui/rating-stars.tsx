'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RatingStarsProps {
  rating: number
  maxRating?: number
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
  showLabel?: boolean
  label?: string
  className?: string
}

const sizeMap = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4.5 h-4.5',
  lg: 'w-5 h-5'
}

const textSizeMap = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg'
}

export function RatingStars({
  rating = 0,
  maxRating = 5,
  size = 'md',
  showValue = true,
  showLabel = false,
  label,
  className
}: RatingStarsProps) {
  const safeRating = rating ?? 0
  const fullStars = Math.floor(safeRating)
  const partialFill = (safeRating - fullStars) * 100
  const emptyStars = maxRating - Math.ceil(safeRating)

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div className="flex items-center gap-0.5">
        {/* Full stars */}
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star
            key={`full-${i}`}
            className={cn(sizeMap[size], 'fill-success text-success')}
          />
        ))}
        
        {/* Partial star */}
        {partialFill > 0 && partialFill < 100 && (
          <div className="relative">
            <Star className={cn(sizeMap[size], 'text-border')} />
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${partialFill}%` }}
            >
              <Star className={cn(sizeMap[size], 'fill-success text-success')} />
            </div>
          </div>
        )}
        
        {/* Empty stars */}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star
            key={`empty-${i}`}
            className={cn(sizeMap[size], 'text-border')}
          />
        ))}
      </div>
      
      {showValue && (
        <span className={cn('font-semibold text-foreground', textSizeMap[size])}>
          {safeRating.toFixed(1)}
        </span>
      )}
      
      {showLabel && label && (
        <span className={cn('text-muted-foreground', size === 'sm' ? 'text-xs' : 'text-sm')}>
          {label}
        </span>
      )}
    </div>
  )
}
