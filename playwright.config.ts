import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:5187',
    browserName: 'chromium',
    channel: process.env.CI ? undefined : 'chrome',
    viewport: { width: 1520, height: 960 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5187 --strictPort',
    url: 'http://127.0.0.1:5187',
    reuseExistingServer: false,
    timeout: 30_000,
  },
})
