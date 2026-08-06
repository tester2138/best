import { redirect } from 'next/navigation'

export default function AddBrokerPage() {
  redirect('/contact-us?intent=claim')
}
