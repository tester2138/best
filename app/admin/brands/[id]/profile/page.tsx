import { notFound } from 'next/navigation'
import Link from 'next/link'
import { brokers as editorialBrokers } from '@/data/brokers'
import { directoryCompanies as editorialDirectory } from '@/data/directory'
import { applyOverrides } from '@/lib/admin-overrides'
import { getPublicBrokerBaseBySlug, getPublicCompanyBaseBySlug } from '@/lib/public-brokers'
import { hasGlobalStaffScope, requireStaffPage, requireStaffBrandPage } from '@/lib/guards'
import { roleHasPermission } from '@/lib/staff-permissions'
import { queryOne } from '@/lib/portal/db'
import { ProfileEditor, type PlacementState } from './profile-client'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface BrandsRow {
  id: string
  slug: string
  name: string
  verification_status: 'verified' | 'unverified'
  is_sponsored: boolean
  is_featured: boolean
  is_duplicate: boolean
  needs_manual_review: boolean
  display_rank: number | null
  brand_category: string | null
  brand_status: string | null
  regulator_tier: string | null
  internal_priority: string | null
  internal_notes: string | null
}

export default async function AdminBrokerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // The route accepts either a brands-row UUID or a catalog slug (for the
  // ~1,700 catalog-only brokers with no portal record yet).
  const brandRow = UUID_RE.test(id)
    ? await queryOne<BrandsRow>(`select * from public.brands where id = $1`, [id])
    : await queryOne<BrandsRow>(`select * from public.brands where slug = $1`, [id])

  const slug = (brandRow?.slug ?? id).toLowerCase()

  const directoryHit = editorialDirectory.find((c) => c.slug.toLowerCase() === slug)
  const brokerHit = directoryHit ? undefined : editorialBrokers.find((b) => b.slug.toLowerCase() === slug)
  const catalogCompany: Record<string, unknown> | undefined = directoryHit ?? brokerHit
  if (!brandRow && !catalogCompany) notFound()

  // Scope: brand-scoped staff need the brand in their scope; catalog-only
  // brokers require global scope.
  if (brandRow) await requireStaffBrandPage(brandRow.id, 'brokers:read')
  else {
    const actor = await requireStaffPage('brokers:read')
    if (!(await hasGlobalStaffScope(actor))) notFound()
  }
  const actor = await requireStaffPage('brokers:read')
  const canManageProfile = roleHasPermission(actor.role, 'editorial:write')
  const canManagePlacement = roleHasPermission(actor.role, 'brokers:manage')

  const [publicBase, overrideRow] = await Promise.all([
    directoryHit
      ? getPublicCompanyBaseBySlug(slug)
      : getPublicBrokerBaseBySlug(slug),
    queryOne<{ overrides: Record<string, unknown>; updated_at: string }>(
      `select overrides, updated_at from public.admin_profile_overrides where slug = $1`,
      [slug],
    ),
  ])

  const base = (publicBase ?? catalogCompany ?? {}) as Record<string, unknown>
  const values = applyOverrides(base, overrideRow?.overrides) as Record<string, unknown>

  const placement: PlacementState | null = brandRow
    ? {
        name: brandRow.name,
        verification_status: brandRow.verification_status,
        is_sponsored: brandRow.is_sponsored,
        is_featured: brandRow.is_featured,
        is_duplicate: brandRow.is_duplicate,
        needs_manual_review: brandRow.needs_manual_review,
        display_rank: brandRow.display_rank,
        brand_category: brandRow.brand_category,
        brand_status: brandRow.brand_status,
        regulator_tier: brandRow.regulator_tier,
        internal_priority: brandRow.internal_priority,
        internal_notes: brandRow.internal_notes,
      }
    : null

  const displayName = (values.name as string) ?? brandRow?.name ?? slug

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/brands" className="hover:text-foreground">
          Broker directory
        </Link>
        <span>/</span>
        <span className="text-foreground">{displayName}</span>
        {brandRow ? (
          <Link
            href={`/admin/brands/${brandRow.id}`}
            className="ml-auto text-primary hover:underline"
          >
            Portal management
          </Link>
        ) : null}
        <Link href={`/brokers/${slug}`} className="text-primary hover:underline" target="_blank">
          View public page
        </Link>
      </div>

      <ProfileEditor
        key={slug}
        slug={slug}
        displayName={displayName}
        hasPortalRecord={Boolean(brandRow)}
        base={base}
        values={values}
        overridesUpdatedAt={overrideRow?.updated_at ?? null}
        placement={placement}
        canManageProfile={canManageProfile}
        canManagePlacement={canManagePlacement}
      />
    </div>
  )
}
