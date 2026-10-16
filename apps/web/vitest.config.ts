import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    // test-setup.ts: jest-dom + cleanup chung; test/setup.ts: mock Leaflet cho bản đồ khu/lô.
    setupFiles: ['./src/test-setup.ts', './src/test/setup.ts'],
  },
});
