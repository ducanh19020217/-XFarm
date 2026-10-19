import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    maxWorkers: process.env.VITEST_MAX_WORKERS
      ? Number(process.env.VITEST_MAX_WORKERS) || process.env.VITEST_MAX_WORKERS
      : 2,
    minWorkers: 1,
  },
});
