import 'server-only'
import { revalidatePath, revalidateTag } from 'next/cache'

/**
 * Revalidate every public surface that renders a brand's merged content so a
 * publish / access change / revoke is reflected immediately (Blueprint
 * Sections 12, 15.2 & 22). The public broker detail route is
 * /brokers/[brokerSlug]. The `broker:<slug>` tag busts the cached
 * getClaimedData() fetch (lib/claimed.ts); the path revalidations refresh the
 * detail page and the listing surfaces that show the claimed badge.
 */
export function revalidateBrand(slug: string): void {
  if (!slug) return
  revalidateTag(`broker:${slug}`, 'max')
  revalidateTag('broker-directory', 'max')
  revalidatePath(`/brokers/${slug}`)
  revalidatePath('/brokers')
  revalidatePath('/')
}
