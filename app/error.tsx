'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, RotateCcw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[v0] Route error boundary:', error)
  }, [error])

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-primary">Something went wrong</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl text-balance">
        An unexpected error occurred
      </h1>
      <p className="mt-4 max-w-md text-lg text-muted-foreground leading-relaxed text-pretty">
        We hit a problem loading this page. You can try again, or head back to safe ground.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button size="lg" className="w-full gap-2 sm:w-auto" onClick={() => reset()}>
          <RotateCcw className="h-5 w-5" />
          Try Again
        </Button>
        <Link href="/">
          <Button size="lg" variant="outline" className="w-full gap-2 sm:w-auto">
            <Home className="h-5 w-5" />
            Go to Homepage
          </Button>
        </Link>
      </div>
    </main>
  )
}
