import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'jsdom',
          include: ['tests/unit/**/*.test.{ts,tsx}'],
        },
      },
      {
        test: {
          name: 'browser',
          include: ['tests/browser/**/*.test.{ts,tsx}'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
            // Desktop-sized default so media queries start in their wide state;
            // responsive tests resize the viewport explicitly.
            viewport: { width: 1280, height: 800 },
            screenshotFailures: false,
          },
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
    },
  },
});
