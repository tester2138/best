import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, Search, Newspaper } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Page Not Found',
  description: 'The page you are looking for could not be found.',
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-primary">404 Error</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl text-balance">
        We couldn&apos;t find that page
      </h1>
      <p className="mt-4 max-w-md text-lg text-muted-foreground leading-relaxed text-pretty">
        The page may have moved or no longer exists. Try one of these instead:
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/">
          <Button size="lg" className="w-full gap-2 sm:w-auto">
            <Home className="h-5 w-5" />
            Go to Homepage
          </Button>
        </Link>
        <Link href="/brokers">
          <Button size="lg" variant="outline" className="w-full gap-2 sm:w-auto">
            <Search className="h-5 w-5" />
            Browse Brokers
          </Button>
        </Link>
        <Link href="/news">
          <Button size="lg" variant="outline" className="w-full gap-2 sm:w-auto">
            <Newspaper className="h-5 w-5" />
            Read News
          </Button>
        </Link>
      </div>
    </main>
  )
}
