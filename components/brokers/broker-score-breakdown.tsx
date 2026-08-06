'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProgressBar } from '@/components/ui/progress-bar'
import { Shield, TrendingUp, Monitor, BookOpen, Headphones, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BrokerScores } from '@/lib/types'

interface BrokerScoreBreakdownProps {
  scores: BrokerScores
  className?: string
}

const scoreLabels = [
  { key: 'trustSafety', label: 'Trust & Safety', icon: Shield, description: 'Regulation, fund safety, track record' },
  { key: 'tradingConditions', label: 'Trading Conditions', icon: TrendingUp, description: 'Spreads, execution, leverage' },
  { key: 'platforms', label: 'Platforms & Tools', icon: Monitor, description: 'Platform quality, charting, features' },
  { key: 'researchEducation', label: 'Research & Education', icon: BookOpen, description: 'Analysis, webinars, learning materials' },
  { key: 'customerService', label: 'Customer Service', icon: Headphones, description: 'Support quality, responsiveness' },
  { key: 'mobileTrading', label: 'Mobile Trading', icon: Smartphone, description: 'Mobile app quality, features' }
] as const

function getScoreColor(score: number): 'success' | 'warning' | 'muted' {
  if (score >= 4.5) return 'success'
  if (score >= 3.5) return 'warning'
  return 'muted'
}

export function BrokerScoreBreakdown({ scores, className }: BrokerScoreBreakdownProps) {
  if (!scores) return null
  
  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Score Breakdown</span>
          <span className="text-2xl font-bold text-success tabular-nums">{(scores.overall ?? 0).toFixed(1)}/5</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {scoreLabels.map(({ key, label, icon: Icon, description }) => {
          const score = scores[key] ?? 0
          return (
            <div key={key}>
              <div className="flex items-center gap-2 mb-1.5">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{label}</span>
              </div>
              <ProgressBar 
                value={score} 
                max={5} 
                showValue 
                variant={getScoreColor(score)} 
                size="md"
              />
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
