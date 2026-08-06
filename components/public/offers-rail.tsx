import type { Offer } from '@/types/portal'

/**
 * Public promotional offers rail (Blueprint Section 17.3).
 * Renders active, in-window offers for a claimed brand as a card rail after the
 * key-facts block. Each CTA routes through the tracked /out/[slug] redirect so
 * clicks are logged. When there are no offers the component renders nothing —
 * no empty container, preserving zero CLS.
 */
export function OffersRail({ slug, offers }: { slug: string; offers: Offer[] }) {
  if (!offers || offers.length === 0) return null

  return (
    <section aria-labelledby="offers-heading" className="bg-secondary/20 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 id="offers-heading" className="mb-4 text-lg font-semibold text-foreground">
          Current offers
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((offer) => (
            <article
              key={offer.id}
              className="flex flex-col rounded-xl border border-border bg-card p-5"
            >
              <h3 className="text-base font-semibold text-foreground text-pretty">{offer.title}</h3>
              {offer.subtitle && (
                <p className="mt-1 text-sm font-medium text-primary">{offer.subtitle}</p>
              )}
              {offer.description && (
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {offer.description}
                </p>
              )}

              {offer.terms && (
                <details className="mt-3 group">
                  <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                    Full terms
                  </summary>
                  <p className="mt-2 whitespace-pre-line text-xs text-muted-foreground leading-relaxed">
                    {offer.terms}
                  </p>
                </details>
              )}

              <div className="mt-4 flex flex-1 flex-col justify-end gap-2">
                <a
                  href={`/out/${slug}?offer=${offer.id}`}
                  target="_blank"
                  rel="nofollow sponsored noopener"
                  className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {offer.cta_label || 'Claim offer'}
                </a>
                <p className="text-center text-[11px] text-muted-foreground">
                  Terms apply. 18+. Trade responsibly.
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
