'use server'

import { z } from 'zod'
import { headers } from 'next/headers'
import { run, Err } from '@/lib/portal/result'
import { requireAdmin, requireStaffBrand } from '@/lib/guards'
import { query, queryOne, withTransaction } from '@/lib/portal/db'
import { auth } from '@/lib/auth'
import { allowAccountCreation } from '@/lib/portal/creation-context'
import { generatePassword } from '@/lib/password'
import { sendEmail } from '@/lib/email/send'
import { audit } from '@/lib/audit'
import { revalidateBrand } from '@/lib/portal/revalidate'
import { getEditorialDefaults } from '@/lib/catalog'
import { zodFor } from '@/lib/content/schema'
import { SECTIONS, type SectionKey } from '@/lib/content/registry'
import type { Brand } from '@/types/portal'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? ''
const forcePasswordChange = () => process.env.FORCE_PASSWORD_CHANGE !== 'false'

const normalizeDomain = (d: string) =>
  d
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]

/** Hash a plaintext password with Better Auth's configured hasher. */
async function hashPassword(password: string): Promise<string> {
  const ctx = await auth.$context
  return ctx.password.hash(password)
}

/** Set a user's password (used for reissue). Uses the same path as changePassword. */
async function setUserPassword(userId: string, password: string): Promise<void> {
  const ctx = await auth.$context
  const hash = await hashPassword(password)
  await ctx.internalAdapter.updatePassword(userId, hash)
}

/** Revoke every session for a user (global sign-out) by deleting session rows. */
async function signOutEverywhere(userId: string): Promise<void> {
  await query(`delete from public.session where "userId" = $1`, [userId])
}

/**
 * Snapshot editorial defaults into a freshly-assigned brand's sections. Each
 * default is validated through the section schema; anything that fails is
 * skipped (never blocks assignment). Runs inside the assign transaction.
 */
async function seedSectionsFromCatalog(
  client: Parameters<Parameters<typeof withTransaction>[0]>[0],
  brandId: string,
  slug: string,
  actorId: string,
): Promise<void> {
  const defaults = getEditorialDefaults(slug)
  for (const key of Object.keys(defaults) as SectionKey[]) {
    if (!SECTIONS[key]) continue
    const schema = zodFor(key)
    const parsed = schema.safeParse(defaults[key])
    if (!parsed.success) continue
    const content = JSON.stringify(parsed.data)
    // Seed both draft and published so the public page shows editorial content
    // immediately; broker edits create a new draft afterwards.
    await client.query(
      `insert into public.broker_page_sections
         (brand_id, section_key, draft, published, status, version, updated_by, published_at)
       values ($1, $2, $3::jsonb, $3::jsonb, 'synced', 1, $4, now())
       on conflict (brand_id, section_key) do nothing`,
      [brandId, key, content, actorId],
    )
    await client.query(
      `insert into public.section_versions (brand_id, section_key, content, source, created_by)
       values ($1, $2, $3::jsonb, 'admin_edit', $4)`,
      [brandId, key, content, actorId],
    )
  }
}

const AssignInput = z.object({
  slug: z.string().min(1),
  name: z.string().min(1).max(120),
  website: z.string().url().nullable().optional(),
  email: z.string().email(),
  officialDomains: z.array(z.string().min(3)).min(1).max(10),
  overrideDomainMismatch: z.boolean().default(false),
})

/**
 * Assign a catalog broker to a portal user (Blueprint Section 12.3, adapted to
 * Neon + Better Auth). Creates/loads the auth user, seeds editorial content,
 * marks the brand claimed, and emails credentials. The temporary password is
 * only ever placed in the invitation email — never returned to the client.
 */
export async function assignBrand(raw: unknown) {
  return run(async () => {
    const admin = await requireAdmin()
    const p = AssignInput.safeParse(raw)
    if (!p.success)
      throw new Err('Check the form', 'validation', {
        issues: p.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      })
    const input = p.data
    const email = input.email.toLowerCase()
    const domains = [...new Set(input.officialDomains.map(normalizeDomain))]
    const mailDomain = email.split('@')[1] ?? ''
    const matches = domains.some((d) => mailDomain === d || mailDomain.endsWith('.' + d))
    if (!matches && !input.overrideDomainMismatch)
      throw new Err('Email domain does not match the official domains', 'validation', {
        issues: [{ path: 'email', message: 'domain_mismatch' }],
      })

    // 1. Upsert the brand from the catalog entry.
    const brand = await queryOne<Brand>(
      `insert into public.brands (slug, name, website)
       values ($1, $2, $3)
       on conflict (slug) do update set name = excluded.name
       returning *`,
      [input.slug, input.name, input.website ?? null],
    )
    if (!brand) throw new Err('Could not create the brand record')

    // 2. Phase 1: one member per brand.
    const existingMembers = await queryOne<{ n: string }>(
      `select count(*)::text as n from public.brand_members where brand_id = $1`,
      [brand.id],
    )
    if (Number(existingMembers?.n ?? '0') > 0)
      throw new Err('This brand already has a portal user. Revoke it first.', 'validation')

    // 3. Find or create the auth user.
    const existingProfile = await queryOne<{ id: string }>(
      `select id from public.profiles where email = $1`,
      [email],
    )
    const existingUser = !!existingProfile
    let userId = existingProfile?.id
    let defaultPassword: string | null = null

    if (!existingUser) {
      defaultPassword = generatePassword(20)
      // allowAccountCreation flips the sign-up gate for this call only; the
      // user.create hook then provisions the profile + must_change_password.
      const created = await allowAccountCreation(async () =>
        auth.api.signUpEmail({
          body: { email, password: defaultPassword as string, name: input.name },
          headers: await headers(),
        }),
      )
      userId = created.user?.id
      if (!userId) throw new Err('Could not create the user')
      if (forcePasswordChange())
        await query(`update public.profiles set must_change_password = true where id = $1`, [
          userId,
        ])
    }

    // 4. Membership, invitation, brand flags, content seed — one transaction.
    const settings = await queryOne<{ invitation_ttl_days: number }>(
      `select invitation_ttl_days from public.portal_settings where id = true`,
    )
    const ttlDays = settings?.invitation_ttl_days ?? 7
    const expiresAt = new Date(Date.now() + ttlDays * 86400000).toISOString()

    await withTransaction(async (client) => {
      await client.query(
        `insert into public.brand_members (brand_id, user_id, role)
         values ($1, $2, 'owner')
         on conflict (brand_id, user_id) do update set role = 'owner'`,
        [brand.id, userId],
      )
      await client.query(
        `insert into public.invitations (brand_id, email, invited_by, expires_at)
         values ($1, $2, $3, $4)`,
        [brand.id, email, admin.id, expiresAt],
      )
      await client.query(
        `update public.brands
            set is_claimed = true,
                claimed_at = coalesce(claimed_at, now()),
                official_domains = $2,
                portal_access = 'active'
          where id = $1`,
        [brand.id, domains],
      )
      await seedSectionsFromCatalog(client, brand.id, input.slug, admin.id)
    })

    await audit(admin, brand.id, 'brand.assign', email, {
      existingUser,
      domainOverridden: !matches,
    })

    // 5. Email.
    if (existingUser) {
      await sendEmail('brand-added', email, { brandName: brand.name })
    } else {
      await sendEmail('broker-invitation', email, {
        brandName: brand.name,
        email,
        password: defaultPassword as string,
        expiresDays: ttlDays,
        loginUrl: SITE_URL + '/business/login',
      })
    }

    revalidateBrand(brand.slug)
    return { brandId: brand.id, existingUser }
  })
}

/**
 * Rotate a fresh temporary password and re-email the invitation
 * (Blueprint Section 12.5). Cap of 10 resends.
 */
export async function resendInvitation(invitationId: string) {
  return run(async () => {
    const inv = await queryOne<{
      id: string
      brand_id: string
      email: string
      resend_count: number
      brand_name: string
    }>(
      `select i.id, i.brand_id, i.email, i.resend_count, b.name as brand_name
         from public.invitations i
         join public.brands b on b.id = i.brand_id
        where i.id = $1`,
      [invitationId],
    )
    if (!inv) throw new Err('Invitation not found', 'not_found')
    const admin = await requireStaffBrand(inv.brand_id, 'brokers:manage')
    if (inv.resend_count >= 10) throw new Err('Resend limit reached', 'validation')

    const member = await queryOne<{ user_id: string }>(
      `select user_id from public.brand_members where brand_id = $1 limit 1`,
      [inv.brand_id],
    )
    if (!member) throw new Err('No user to re-invite', 'not_found')

    const password = generatePassword(20)
    await setUserPassword(member.user_id, password)
    if (forcePasswordChange())
      await query(`update public.profiles set must_change_password = true where id = $1`, [
        member.user_id,
      ])

    const settings = await queryOne<{ invitation_ttl_days: number }>(
      `select invitation_ttl_days from public.portal_settings where id = true`,
    )
    const ttlDays = settings?.invitation_ttl_days ?? 7
    await query(
      `update public.invitations
          set resend_count = resend_count + 1,
              last_sent_at = now(),
              status = 'sent',
              expires_at = $2
        where id = $1`,
      [inv.id, new Date(Date.now() + ttlDays * 86400000).toISOString()],
    )
    await audit(admin, inv.brand_id, 'invite.resend', inv.email, {})
    await sendEmail('broker-invitation', inv.email, {
      brandName: inv.brand_name,
      email: inv.email,
      password,
      expiresDays: ttlDays,
      loginUrl: SITE_URL + '/business/login',
    })
    return { ok: true }
  })
}

/**
 * Remove a member's access, sign them out everywhere, and unclaim the brand
 * when no members remain (Blueprint Section 12.5).
 */
export async function revokeMember(raw: unknown) {
  return run(async () => {
    const input = z.object({ brandId: z.string().uuid(), userId: z.string().min(1) }).parse(raw)
    const admin = await requireStaffBrand(input.brandId, 'brokers:manage')
    const brand = await queryOne<Brand>(`select * from public.brands where id = $1`, [
      input.brandId,
    ])
    if (!brand) throw new Err('Brand not found', 'not_found')

    await query(`delete from public.brand_members where brand_id = $1 and user_id = $2`, [
      input.brandId,
      input.userId,
    ])
    await signOutEverywhere(input.userId)

    const remaining = await queryOne<{ n: string }>(
      `select count(*)::text as n from public.brand_members where brand_id = $1`,
      [input.brandId],
    )
    if (Number(remaining?.n ?? '0') === 0) {
      await query(
        `update public.brands set is_claimed = false, portal_access = 'paused' where id = $1`,
        [input.brandId],
      )
    }
    await query(
      `update public.invitations set status = 'revoked'
        where brand_id = $1 and email = (select email from public.profiles where id = $2)`,
      [input.brandId, input.userId],
    )
    await audit(admin, input.brandId, 'member.remove', input.userId, {})
    revalidateBrand(brand.slug)
    return { ok: true }
  })
}

/** Pause / resume portal writes for a brand (Blueprint Section 12.5). */
export async function setAccess(raw: unknown) {
  return run(async () => {
    const input = z.object({ brandId: z.string().uuid(), access: z.enum(['active', 'paused']) }).parse(raw)
    const admin = await requireStaffBrand(input.brandId, 'brokers:manage')
    const brand = await queryOne<Brand>(`select * from public.brands where id = $1`, [
      input.brandId,
    ])
    if (!brand) throw new Err('Brand not found', 'not_found')
    await query(`update public.brands set portal_access = $2 where id = $1`, [
      input.brandId,
      input.access,
    ])
    await audit(
      admin,
      input.brandId,
      input.access === 'paused' ? 'brand.access.pause' : 'brand.access.resume',
    )
    revalidateBrand(brand.slug)
    if (input.access === 'paused') {
      const member = await queryOne<{ email: string }>(
        `select p.email from public.brand_members m
           join public.profiles p on p.id = m.user_id
          where m.brand_id = $1 limit 1`,
        [input.brandId],
      )
      if (member) await sendEmail('access-paused', member.email, { brandName: brand.name })
    }
    return { ok: true }
  })
}

/** Hard lock (abuse kill switch) — blocks writes, no public change. */
export async function setLock(raw: unknown) {
  return run(async () => {
    const input = z.object({ brandId: z.string().uuid(), locked: z.boolean() }).parse(raw)
    const admin = await requireStaffBrand(input.brandId, 'brokers:manage')
    await query(`update public.brands set portal_locked = $2 where id = $1`, [
      input.brandId,
      input.locked,
    ])
    await audit(admin, input.brandId, input.locked ? 'brand.lock' : 'brand.unlock')
    return { ok: true }
  })
}

/** Edit the official domains chip list (audited before/after). */
export async function updateDomains(raw: unknown) {
  return run(async () => {
    const input = z.object({
      brandId: z.string().uuid(),
      domains: z.array(z.string().trim().min(3).max(253)).max(10),
    }).parse(raw)
    const admin = await requireStaffBrand(input.brandId, 'brokers:manage')
    const before = await queryOne<{ official_domains: string[] }>(
      `select official_domains from public.brands where id = $1`,
      [input.brandId],
    )
    const domains = [...new Set(input.domains.map(normalizeDomain).filter(Boolean))].slice(0, 10)
    if (domains.length === 0) throw new Err('At least one domain is required', 'validation')
    await query(`update public.brands set official_domains = $2 where id = $1`, [
      input.brandId,
      domains,
    ])
    await audit(admin, input.brandId, 'brand.domains.update', undefined, {
      before: before?.official_domains ?? [],
      after: domains,
    })
    return { ok: true }
  })
}

const SettingsInput = z.object({
  moderation_mode: z.enum(['off', 'hybrid', 'all']),
  max_active_offers: z.number().int().min(1).max(10),
  invitation_ttl_days: z.number().int().min(1).max(30),
  banned_terms: z.array(z.string().min(1)).max(100),
})

/** Update the portal_settings singleton (Blueprint Section 12.5). */
export async function updateSettings(raw: unknown) {
  return run(async () => {
    const admin = await requireAdmin()
    const p = SettingsInput.safeParse(raw)
    if (!p.success)
      throw new Err('Check the form', 'validation', {
        issues: p.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      })
    const s = p.data
    await query(
      `update public.portal_settings
          set moderation_mode = $1,
              max_active_offers = $2,
              invitation_ttl_days = $3,
              banned_terms = $4
        where id = true`,
      [s.moderation_mode, s.max_active_offers, s.invitation_ttl_days, s.banned_terms],
    )
    await audit(admin, null, 'settings.update', undefined, s)
    return { ok: true }
  })
}
