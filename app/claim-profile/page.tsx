import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { queryOne } from '@/lib/portal/db'
import { ClaimForm } from './claim-form'

export const metadata: Metadata = {
  title: 'Claim your broker profile · BestForex.io',
  description:
    'Request management access to your broker profile on BestForex.io to keep your details, offers, and media up to date.',
  robots: { index: false, follow: false },
}

export default async function ClaimProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; name?: string }>
}) {
  const { slug, name } = await searchParams

  // No slug means the visitor arrived without a target broker — send them to
  // the general contact route which handles broad partnership enquiries.
  if (!slug) redirect('/contact-us?intent=claim')

  // Resolve a friendly name from the brands table when we already track it.
  const brand = await queryOne<{ name: string; is_claimed: boolean }>(
    `select name, is_claimed from public.brands where slug = $1`,
    [slug],
  )

  // Already managed — no need to claim again.
  if (brand?.is_claimed) redirect(`/brokers/${slug}`)

  const brokerName = brand?.name ?? name ?? slug

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-lg flex-col justify-center px-4 py-16">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          Claim {brokerName}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
          Verify you represent this broker and we&apos;ll set up management access so you can
          maintain the profile, publish offers, and upload media.
        </p>
      </div>
      <ClaimForm slug={slug} brokerName={brokerName} />
    </main>
  )
}
