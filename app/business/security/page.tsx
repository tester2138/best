import type { Metadata } from 'next'
import { SecurityPage } from './security-page'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Account security · BestForex Portal',
  robots: { index: false, follow: false },
}

export default function BusinessSecurityPage() {
  return <SecurityPage surface="business" />
}
