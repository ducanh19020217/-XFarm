import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist, NetworkFirst, ExpirationPlugin } from 'serwist';

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

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url }: { url: URL }) => url.pathname.startsWith('/admin/m'),
      handler: new NetworkFirst({
        cacheName: 'pwa-mobile-pages',
        plugins: [
          new ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 ngày
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();

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
