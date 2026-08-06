import * as React from 'react'
import { cn } from '@/lib/utils'

interface OutLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /**
   * T46: Whether this link carries a tracking/affiliate parameter.
   * When true, `rel` is set to "nofollow sponsored noopener".
   * When false (plain editorial outlink), `rel` is "noopener noreferrer".
   */
  sponsored?: boolean
  href: string
  children: React.ReactNode
}

/**
 * OutLink — shared component for every outbound link.
 *
 * T46: Enforces correct rel attributes for affiliate and editorial outbound links.
 * - Affiliate/sponsored links:  rel="nofollow sponsored noopener"
 * - Editorial/source links:     rel="noopener noreferrer"
 *
 * Always opens in a new tab. Route every affiliate href (containing ref=bestforex
 * or partner tracking params) through this component.
 */
export function OutLink({
  href,
  sponsored = false,
  className,
  children,
  ...props
}: OutLinkProps) {
  const rel = sponsored
    ? 'nofollow sponsored noopener'
    : 'noopener noreferrer'

  return (
    <a
      href={href}
      rel={rel}
      target="_blank"
      className={cn(className)}
      {...props}
    >
      {children}
    </a>
  )
}
