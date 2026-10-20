import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'XFarm Công nhân',
    short_name: 'XFarm Mobile',
    description: 'Ứng dụng PWA dành cho công nhân nông trại XFarm',
    start_url: '/admin/m',
    display: 'standalone',
    background_color: '#f4f6f5',
    theme_color: '#059669', // Theme xanh emerald (khớp token accent và pwa test)
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
