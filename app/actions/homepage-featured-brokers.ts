'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { z } from 'zod'
import { audit } from '@/lib/audit'
import { requireAdmin } from '@/lib/guards'
import {
  HOMEPAGE_FEATURED_BROKERS_CACHE_TAG,
  isHomepageFeaturedBrokerSlug,
} from '@/lib/homepage-featured-brokers'
import { withTransaction } from '@/lib/portal/db'
import { Err, run } from '@/lib/portal/result'

const FeaturedBrokersInput = z.object({
  firstSlug: z.string().trim().min(1).max(100),
  secondSlug: z.string().trim().min(1).max(100),
})

export async function updateHomepageFeaturedBrokers(raw: unknown) {
  return run(async () => {
    const admin = await requireAdmin()
    const parsed = FeaturedBrokersInput.safeParse(raw)
    if (!parsed.success) {
      throw new Err('Choose two different broker brands.', 'validation', {
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      })
    }

    const { firstSlug, secondSlug } = parsed.data
    if (firstSlug === secondSlug) {
      throw new Err('Choose two different broker brands.', 'validation')
    }
    if (!isHomepageFeaturedBrokerSlug(firstSlug) || !isHomepageFeaturedBrokerSlug(secondSlug)) {
      throw new Err('Choose brokers from the directory.', 'validation')
    }

    await withTransaction(async (client) => {
      await client.query(`delete from public.homepage_featured_brokers`)
      await client.query(
        `insert into public.homepage_featured_brokers (slot, broker_slug, updated_by)
         values (1, $1, $3), (2, $2, $3)`,
        [firstSlug, secondSlug, admin.id],
      )
    })

    await audit(admin, null, 'admin.featured_brokers.update', 'homepage', {
      slugs: [firstSlug, secondSlug],
    })
    updateTag(HOMEPAGE_FEATURED_BROKERS_CACHE_TAG)
    revalidatePath('/')
    revalidatePath('/admin/featured-brokers')

    return { slugs: [firstSlug, secondSlug] }
  })
}
