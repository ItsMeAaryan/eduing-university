import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  // Only /auth/register is a genuine public, indexable page — every other
  // route sits behind auth and has nothing for search engines to usefully
  // crawl (see robots.ts for the corresponding disallow rules).
  return [
    {
      url: 'https://university.eduing.in/auth/register',
      changeFrequency: 'monthly',
      priority: 1,
    },
  ]
}
