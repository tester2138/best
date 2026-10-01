import type { Metadata } from 'next'
import { SecurityPage } from '@/app/business/security/security-page'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Admin account security · BestForex.io',
  robots: { index: false, follow: false },
}

export default function AdminSecurityPage() {
  return <SecurityPage surface="admin" />
}
