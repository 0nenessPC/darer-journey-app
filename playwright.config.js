// @ts-check
import { defineConfig } from '@playwright/test';
import { config } from 'dotenv';
config();

export default defineConfig({
  testDir: './test',
  timeout: 600_000,          // 10 min per test (AI calls are slow)
  expect: { timeout: 15_000 },
  fullyParallel: false,      // One browser at a time
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    viewport: { width: 420, height: 860 },  // Mobile viewport
    headless: true,
  },
  projects: [
    {
      name: 'e2e',
      testMatch: /darer-full-onboarding\.spec\.js/,
    },
    {
      name: 'ai',
      testMatch: /ai-.*\.spec\.js/,
      use: {
        viewport: { width: 420, height: 860 },
        headless: true,
      },
      timeout: 120_000,  // AI analysis adds latency
    },
  ],
});
