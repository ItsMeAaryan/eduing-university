import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'EDUING – University Portal',
    short_name: 'EDUING Uni',
    description: 'Manage your institution on EDUING.in',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0A0A0F',
    theme_color: '#3D2499',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
