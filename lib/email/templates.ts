/**
 * Email layout + the nine transactional templates (Blueprint Section 19.2).
 * Transcribed verbatim. Only the transport (Brevo) differs from the blueprint.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.bestforex.io'

const layout = (title: string, body: string) => `
<div style="background:#F5F5F7;padding:32px 12px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:16px;padding:36px 32px;">
    <p style="font-size:12px;letter-spacing:1.4px;color:#86868B;margin:0 0 20px;">BESTFOREX.IO</p>
    <h1 style="font-size:21px;font-weight:600;color:#191C20;margin:0 0 14px;">${title}</h1>
    ${body}
    <p style="font-size:12px;color:#86868B;border-top:1px solid #E8E8ED;margin:28px 0 0;padding-top:14px;">
      Sent by BestForex.io. Questions: reply to this email.</p>
  </div>
</div>`

const p = (t: string) =>
  `<p style="font-size:14px;line-height:1.6;color:#2A2D31;margin:0 0 12px;">${t}</p>`

const button = (href: string, label: string) =>
  `<p style="margin:20px 0;"><a href="${href}" style="background:#191C20;color:#FFFFFF;
   border-radius:999px;padding:12px 26px;font-size:14px;font-weight:600;
   text-decoration:none;display:inline-block;">${label}</a></p>`

const code = (t: string) =>
  `<p style="font-family:Menlo,Consolas,monospace;font-size:15px;
   background:#F5F5F7;border-radius:10px;padding:12px 16px;letter-spacing:0.5px;">${t}</p>`

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

export const TEMPLATES = {
  'broker-invitation': (d: {
    brandName: string
    email: string
    password: string
    expiresDays: number
    loginUrl: string
  }) => ({
    subject: `Manage ${d.brandName} on BestForex.io: your access details`,
    html: layout(
      `Your ${d.brandName} profile is ready to manage`,
      p(`BestForex.io has activated profile management for <strong>${d.brandName}</strong>.
         Sign in with the credentials below to edit your public profile,
         publish offers, and track performance.`) +
        p(`<strong>Email</strong>`) +
        code(d.email) +
        p(`<strong>Temporary password</strong>`) +
        code(d.password) +
        button(d.loginUrl, 'Sign in to the Broker Portal') +
        p(`You will be asked to set your own password on first sign-in.
         This invitation link expires in ${d.expiresDays} days;
         your account does not.`),
    ),
  }),
  'staff-invitation': (d: {
    fullName: string
    email: string
    password: string
    expiresDays: number
    loginUrl: string
  }) => ({
    subject: 'Your BestForex.io staff account',
    html: layout(
      'Staff account created',
      p(`Hello ${escapeHtml(d.fullName)}, your staff access is ready. Sign in with the temporary credentials below.`) +
        p('<strong>Email</strong>') + code(escapeHtml(d.email)) +
        p('<strong>Temporary password</strong>') + code(escapeHtml(d.password)) +
        button(escapeHtml(d.loginUrl), 'Sign in to the Admin Console') +
        p(`You must change this password before staff access is enabled. This invitation expires in ${d.expiresDays} days.`),
    ),
  }),
  'brand-added': (d: { brandName: string }) => ({
    subject: `${d.brandName} was added to your BestForex.io account`,
    html: layout(
      'New brand on your account',
      p(`Your existing Business Portal login can now manage <strong>${d.brandName}</strong>.
         Use the brand switcher in the panel header.`) +
        button(SITE_URL + '/business', 'Open the Business Portal'),
    ),
  }),
  'password-reset': (d: { link: string }) => ({
    subject: 'Reset your BestForex.io portal password',
    html: layout(
      'Password reset',
      p('Use the button below within 60 minutes. If you did not request this, ignore this email.') +
        button(d.link, 'Set a new password'),
    ),
  }),
  'password-changed': () => ({
    subject: 'Your BestForex.io portal password was changed',
    html: layout(
      'Password changed',
      p('If this was not you, reply to this email immediately and we will lock the account.'),
    ),
  }),
  'moderation-approved': (d: { what: string; brandName: string }) => ({
    subject: `Approved: ${d.what} is now live`,
    html: layout(
      'Change approved',
      p(`Your update to <strong>${d.what}</strong> for ${d.brandName} passed review and is live.`),
    ),
  }),
  'moderation-rejected': (d: { what: string; note: string }) => ({
    subject: `Action needed: ${d.what} was not approved`,
    html: layout(
      'Change not approved',
      p(`Reviewer note:`) + code(d.note) + p('Edit the content in the portal and publish again.'),
    ),
  }),
  'access-paused': (d: { brandName: string }) => ({
    subject: `Portal access paused for ${d.brandName}`,
    html: layout(
      'Access paused',
      p(`Editing for <strong>${d.brandName}</strong> is paused. Your published profile stays live.
         Contact BestForex.io to resume access.`),
    ),
  }),
  'claim-received': (d: {
    brandName: string
    slug: string
    fullName: string
    workEmail: string
    message: string
  }) => ({
    subject: `New claim request: ${d.brandName}`,
    html: layout(
      'Claim request',
      p(`<strong>${d.fullName}</strong> (${d.workEmail}) wants to claim
         /brokers/${d.slug}.`) +
        (d.message ? code(d.message) : '') +
        button(SITE_URL + '/admin/leads', 'Review in the Admin Panel'),
    ),
  }),
  'moderation-pending': (d: { brandName: string }) => ({
    subject: `Review queue: new items from ${d.brandName}`,
    html: layout(
      'Items waiting for review',
      p(`New items from <strong>${d.brandName}</strong> are waiting for review.`) +
        button(SITE_URL + '/admin/moderation', 'Open the queue'),
    ),
  }),
  'renewal-digest': (d: { rows: { name: string; renewal_date: string }[] }) => ({
    subject: `Renewals due within 7 days: ${d.rows.length} brand(s)`,
    html: layout('Upcoming renewals', d.rows.map((r) => p(`${r.name}: ${r.renewal_date}`)).join('')),
  }),
} as const

export type TemplateName = keyof typeof TEMPLATES
