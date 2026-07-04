import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/auth/register'],
        // Everything else is an authenticated staff/admin dashboard (or,
        // for /auth/login, a gate with no unique content) — none of it has
        // anything for search engines to usefully index.
        disallow: ['/dashboard', '/applications', '/seats', '/exams', '/analytics', '/profile', '/settings', '/programs', '/auth/login'],
      },
    ],
    sitemap: 'https://university.eduing.in/sitemap.xml',
  }
}
