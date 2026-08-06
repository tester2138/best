'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BrokerProsConsProps {
  pros: string[]
  cons: string[]
  className?: string
}

export function BrokerProsCons({ pros = [], cons = [], className }: BrokerProsConsProps) {
  if (pros.length === 0 && cons.length === 0) {
    return null
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle>Pros & Cons</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Pros */}
          {pros.length > 0 && (
            <div>
              <h4 className="font-semibold text-success flex items-center gap-2 mb-3">
                <Check className="w-5 h-5" />
                Pros
              </h4>
              <ul className="space-y-2.5">
                {pros.map((pro, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{pro}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Cons */}
          {cons.length > 0 && (
            <div>
              <h4 className="font-semibold text-destructive flex items-center gap-2 mb-3">
                <X className="w-5 h-5" />
                Cons
              </h4>
              <ul className="space-y-2.5">
                {cons.map((con, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <X className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
