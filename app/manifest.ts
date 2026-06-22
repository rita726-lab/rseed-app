import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RSEED - ありがとう経済圏',
    short_name: 'RSEED',
    description: '感謝が価値になる。RITATASEED（RSEED）アプリ',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7fbf4',
    theme_color: '#3a7d44',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
