import 'server-only'

import { after } from 'next/server'
import { SITE_URL } from '@/lib/site'

export const WEBSUB_HUB_URL = 'https://pubsubhubbub.appspot.com/'
export const NEWS_FEED_URL = `${SITE_URL}/news/feed.xml`

/** Schedule notification after the publishing response has completed. */
export function scheduleNewsFeedUpdate(): void {
  if (process.env.VERCEL_ENV !== 'production') return

  after(async () => {
    await notifyNewsFeedUpdated()
  })
}

/**
 * Notify Google WebSub that the canonical news feed changed.
 * Publication must never fail because the external hub is unavailable.
 */
export async function notifyNewsFeedUpdated(): Promise<boolean> {
  if (process.env.VERCEL_ENV !== 'production') return false

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5_000)

  try {
    const body = new URLSearchParams({
      'hub.mode': 'publish',
      'hub.url': NEWS_FEED_URL,
    })
    const response = await fetch(WEBSUB_HUB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: controller.signal,
      cache: 'no-store',
    })

    if (!response.ok) {
      console.error('[NewsWebSub] Hub rejected feed update', {
        status: response.status,
        topic: NEWS_FEED_URL,
      })
      return false
    }

    return true
  } catch (error) {
    console.error('[NewsWebSub] Feed update notification failed', {
      topic: NEWS_FEED_URL,
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  } finally {
    clearTimeout(timeout)
  }
}
