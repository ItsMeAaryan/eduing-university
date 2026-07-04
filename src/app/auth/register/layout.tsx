import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Register Your University',
  description: 'Join EDUING.in — the unified admissions platform for Indian universities. Register your institution to manage applications, seat allocation, exams, and analytics in one place.',
  // Unlike every other route in this app, this page is meant to be
  // publicly discoverable (universities finding it via search) rather
  // than gated behind auth, so it opts back into indexing.
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Register Your University | EDUING',
    description: 'Join EDUING.in — the unified admissions platform for Indian universities.',
    url: 'https://university.eduing.in/auth/register',
    siteName: 'EDUING',
    images: ['/bandwlogo.PNG'],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Register Your University | EDUING',
    description: 'Join EDUING.in — the unified admissions platform for Indian universities.',
    images: ['/bandwlogo.PNG'],
  },
  alternates: {
    canonical: 'https://university.eduing.in/auth/register',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
