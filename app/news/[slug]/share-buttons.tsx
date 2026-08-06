'use client'

import { Button } from '@/components/ui/button'
import { SITE_URL } from '@/lib/site'

interface ShareButtonsProps {
  title: string
  slug: string
}

export function ShareButtons({ title, slug }: ShareButtonsProps) {
  const url = `${SITE_URL}/news/${slug}`

  function copyLink() {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(url)
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" size="sm" asChild>
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Share on Twitter
        </a>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Share on LinkedIn
        </a>
      </Button>
      <Button variant="outline" size="sm" onClick={copyLink}>
        Copy Link
      </Button>
    </div>
  )
}
