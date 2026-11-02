import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Offer Planner',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
