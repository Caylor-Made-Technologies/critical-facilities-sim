import { defineConfig } from '@playwright/test';

declare const process: { env: Record<string, string | undefined> };

// Browser checks for the built site (npm run e2e builds first).
// Phone + laptop, light + dark. Uses the Chromium that ships with this environment.
const phone = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const laptop = { viewport: { width: 1366, height: 768 } };

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'tests/e2e/.results',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  workers: 2,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4174/critical-facilities-sim/',
    screenshot: 'only-on-failure',
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
  projects: [
    { name: 'phone-light', use: { ...phone, colorScheme: 'light' } },
    { name: 'phone-dark', use: { ...phone, colorScheme: 'dark' } },
    { name: 'laptop-light', use: { ...laptop, colorScheme: 'light' } },
    { name: 'laptop-dark', use: { ...laptop, colorScheme: 'dark' } },
  ],
  webServer: {
    command: 'npx vite preview --port 4174 --strictPort',
    url: 'http://localhost:4174/critical-facilities-sim/',
    reuseExistingServer: !process.env.CI,
  },
});
