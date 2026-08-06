/**
 * lib/site-config.ts — backward-compatibility re-export shim.
 *
 * T08: canonical host moved to lib/site.ts (https://www.bestforex.io).
 * All existing `import { SITE_URL } from '@/lib/site-config'` calls continue
 * to work without change. New code should import directly from '@/lib/site'.
 */
export {
  SITE_URL,
  SITE_NAME,
  SITE_DESCRIPTION,
  SITE_LOGO,
  SITE_OG_IMAGE,
  SITE_SOCIALS,
  SITE_SOCIALS_VERIFIED,
  absoluteUrl,
} from '@/lib/site'
