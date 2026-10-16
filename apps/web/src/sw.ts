import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist, NetworkFirst, CacheFirst, StaleWhileRevalidate, ExpirationPlugin } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

// Service worker scope
declare const self: {
  __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  addEventListener: (type: string, listener: (event: Event) => void) => void;
};

const PWA_MOBILE_ROUTES = [
  '/admin/m',
  '/admin/m/quick-log',
  '/admin/m/attendance',
  '/admin/m/scan',
  '/admin/m/outbox',
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    {
      matcher: ({ url }: { url: URL }) => url.pathname.startsWith('/admin/m'),
      handler: new NetworkFirst({
        cacheName: 'pwa-mobile-pages',
        matchOptions: { ignoreSearch: true, ignoreVary: true },
        plugins: [
          new ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 ngày
          }),
        ],
      }),
    },
    {
      matcher: ({ request, url }: { request: Request; url: URL }) =>
        request.headers.get('RSC') === '1' && url.pathname.startsWith('/admin/m'),
      handler: new NetworkFirst({
        cacheName: 'pages-rsc',
        matchOptions: { ignoreSearch: true, ignoreVary: true },
        plugins: [
          new ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: 24 * 60 * 60,
          }),
        ],
      }),
    },
    {
      matcher: ({ url }: { url: URL }) =>
        url.pathname.startsWith('/_next/static/') &&
        url.pathname.endsWith('.js') &&
        !url.pathname.includes('webpack.hot-update'),
      handler: new CacheFirst({
        cacheName: 'next-static-js-assets',
        matchOptions: { ignoreSearch: true, ignoreVary: true },
        plugins: [
          new ExpirationPlugin({
            maxEntries: 120,
            maxAgeSeconds: 24 * 60 * 60,
          }),
        ],
      }),
    },
    {
      matcher: ({ url }: { url: URL }) =>
        url.pathname.startsWith('/_next/static/css/') || /\.(?:css|less)$/i.test(url.pathname),
      handler: new StaleWhileRevalidate({
        cacheName: 'static-style-assets',
        matchOptions: { ignoreSearch: true, ignoreVary: true },
        plugins: [
          new ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: 24 * 60 * 60,
          }),
        ],
      }),
    },
    {
      matcher: ({ url }: { url: URL }) =>
        url.pathname.startsWith('/icons/') ||
        url.pathname.startsWith('/_next/image') ||
        /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i.test(url.pathname),
      handler: new StaleWhileRevalidate({
        cacheName: 'static-image-assets',
        matchOptions: { ignoreSearch: true, ignoreVary: true },
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
        ],
      }),
    },
  ],
});

serwist.addEventListeners();

// Precache mobile shell pages upon service worker installation
self.addEventListener('install', (event: unknown) => {
  const installEvent = event as { waitUntil: (p: Promise<unknown>) => void };
  installEvent.waitUntil(
    (async () => {
      try {
        const pageCache = await caches.open('pwa-mobile-pages');
        await Promise.allSettled(
          PWA_MOBILE_ROUTES.map(async (route) => {
            try {
              const res = await fetch(route);
              if (res.ok) {
                await pageCache.put(route, res);
              }
            } catch {
              // ignore during early install
            }
          }),
        );
      } catch {
        // ignore
      }
    })(),
  );
});

// Background Sync
self.addEventListener('sync', (event: unknown) => {
  const syncEvent = event as { tag?: string; waitUntil: (p: Promise<unknown>) => void };
  if (syncEvent.tag === 'xfarm-sync-outbox') {
    syncEvent.waitUntil(
      (async () => {
        const swScope = self as unknown as {
          clients?: {
            matchAll: (opts: {
              type: string;
              includeUncontrolled: boolean;
            }) => Promise<{ postMessage: (msg: unknown) => void }[]>;
          };
        };
        if (swScope.clients) {
          const clients = await swScope.clients.matchAll({
            type: 'window',
            includeUncontrolled: true,
          });
          for (const client of clients) {
            client.postMessage({ type: 'SYNC_OUTBOX' });
          }
        }
      })(),
    );
  }
});
