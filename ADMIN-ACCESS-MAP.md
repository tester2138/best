# Admin foundation: route, entity, and permission map

All `/admin` page reads and all privileged mutations validate the Better Auth session on the server. Neon has no RLS, so query scope is enforced by `lib/guards.ts` and SQL filters. `super_admin` is the existing `profiles.role = 'admin'` identity (including the `ADMIN_EMAILS` bootstrap); delegated staff roles are stored in `staff_access`, with optional broker IDs in `staff_brand_scopes`. Staff access requires Better Auth verified TOTP. Merchants remain in `/business` and `/portal`; their existing brand membership checks continue to scope writes by `brand_id`.

## Route → entity map

| Admin route | Backing records | Access |
| --- | --- | --- |
| `/admin` | brands, broker sections, moderation queue, offers, claims, contact submissions, posts | `dashboard:read` |
| `/admin/brands` and `/admin/brands/[id]` | brands, brand_members, profiles (contact email only), sections, invitations, audit_log | `brokers:read`; each detail and write checks broker scope |
| `/admin/moderation` | moderation_queue, brands, sections, offers, media_assets | `moderation:review`; each target checks broker scope |
| `/admin/leads` | claim_requests | `leads:read`; status changes need `leads:manage` |
| `/admin/enquiries` | contact_submissions | `leads:read`; status changes need `leads:manage` |
| `/admin/news` | posts | `editorial:read` |
| `/admin/staff` | profiles, staff_access, staff_brand_scopes, staff_invitations, sessions, user TOTP state | `staff:manage` (super admin only) |
| `/admin/audit` | audit_log, brands | `audit:read`; CSV export is super-admin only |
| `/admin/settings` | portal_settings | `settings:manage` (super admin only) |
| `/admin/bulk-import` | brands, broker_page_sections, section_versions | super admin only |
| `/business/security` | profiles, staff_access, public.user, public.twoFactor | signed-in super admin or active staff; required TOTP enrollment and recovery-code rotation |

Public contact submissions use `/api/contact` → `contact_submissions` → `/admin/enquiries`. Public claim submissions use `submitClaim` → brands + claim_requests → `/admin/leads`. Public broker rendering merges the static editorial catalog with `brands` and `media_assets`; public news reads `public.posts` (with the documented static fallback); public offer campaigns render from active, date-valid rows in `offers`; banner slots remain static house ads in `data/ads.ts` because no campaign/placement database exists. There are no working admin routes yet for ratings, authors, education, media, ads, placements, newsletter, pages, analytics, or standalone offers, so those are intentionally omitted from navigation rather than exposed as placeholders.

The dashboard counts live rows: draft/pending broker sections, new claims, brokers needing verification review (unverified or `brands.updated_at` older than 90 days), active/ending offers, open enquiries, and currently published posts. The stale-verification rule is a best-effort proxy because the current `brands` schema has no dedicated verification timestamp.

## Permission matrix

| Role | Dashboard | Brokers | Editorial | Moderation | Leads / enquiries | Settings | Staff | Audit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Super admin | Read | Read / manage | Read / write | Review | Read / manage | Manage | Manage | Read / export |
| Editor / publisher | Read | Read in broker scope | Read / write | Review in broker scope | — | — | — | Read |
| Commercial manager | Read | Read / manage in broker scope | — | — | Read / manage | — | — | Read |
| Support / reviewer | Read | Read in broker scope | — | Review in broker scope | Read / manage | — | — | Read |
| Analyst | Read | Read in broker scope | Read | — | — | — | — | Read |
| Merchant | — | Assigned brand only via `/business` / `/portal` | Own editable fields only | — | — | — | — | — |

Scores, rank, verification conclusions, public reviews and publication are not exposed as commercial-manager mutations. Staff role/scope updates and their high-impact lifecycle changes are audited; suspension and revocation delete all sessions for the target. TOTP secrets and backup codes are kept in Better Auth tables and never included in staff listing queries.
