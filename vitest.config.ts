import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
    // Many tests run the plant for simulated minutes or hours; CI runners are slower than laptops.
    testTimeout: 30_000,
  },
});
