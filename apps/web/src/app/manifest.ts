import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DexHub — Spazio Personale',
    short_name: 'DexHub',
    description: 'Il tuo hub personale per cartellino CCNL, finanze, note e to-do.',
    start_url: '/home',
    display: 'standalone',
    background_color: '#080c14',
    theme_color: '#14b8a6',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/apple-icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
