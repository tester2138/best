import 'server-only'
import { query } from '@/lib/portal/db'

/**
 * Audit helper and action verbs (Blueprint Section 9.6).
 * Neon adaptation: writes go through the shared pg pool instead of the
 * Supabase service client. Auditing must never throw into the caller's
 * happy path, so insert failures are swallowed after logging.
 */

export type AuditAction =
  | 'brand.assign'
  | 'brand.access.pause'
  | 'brand.access.resume'
  | 'brand.lock'
  | 'brand.unlock'
  | 'brand.domains.update'
  | 'invite.resend'
  | 'invite.revoke'
  | 'member.remove'
  | 'auth.password.set'
  | 'auth.password.reset.request'
  | 'section.save'
  | 'section.publish'
  | 'section.discard'
  | 'section.rollback'
  | 'moderation.approve'
  | 'moderation.reject'
  | 'offer.create'
  | 'offer.update'
  | 'offer.submit'
  | 'offer.pause'
  | 'offer.resume'
  | 'offer.archive'
  | 'media.upload'
  | 'media.approve'
  | 'media.reject'
  | 'media.delete'
  | 'settings.update'
  | 'claim.received'
  | 'claim.status'
  | 'news.publish'
  | 'admin.section.edit'
  | 'enquiry.status'
  | 'staff.invite'
  | 'staff.access.update'
  | 'staff.active'
  | 'staff.suspended'
  | 'staff.revoked'
  | 'staff.mfa.enrolled'

export async function audit(
  actor: { id: string | null; email: string | null },
  brandId: string | null,
  action: AuditAction,
  target?: string,
  meta: Record<string, unknown> = {},
): Promise<void> {
  try {
    await query(
      `insert into public.audit_log (actor_id, actor_email, brand_id, action, target, meta)
       values ($1, $2, $3, $4, $5, $6::jsonb)`,
      [actor.id, actor.email, brandId, action, target ?? null, JSON.stringify(meta)],
    )
  } catch (err) {
    console.error('[v0] audit insert failed:', err)
  }
}
