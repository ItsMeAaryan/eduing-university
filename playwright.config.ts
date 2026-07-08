import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright e2e test configuration.
 *
 * Tests run against a locally-running dev server (npm run dev).
 * For CI, set PLAYWRIGHT_BASE_URL to your staging/preview URL.
 *
 * Run:
 *   npx playwright test           # headless
 *   npx playwright test --ui      # interactive UI mode
 *   npx playwright show-report    # view HTML report after a run
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  ],

  // Start dev server automatically if not running in CI
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 60_000,
      },
})
