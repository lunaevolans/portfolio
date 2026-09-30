import { test as base, expect } from '@playwright/test';

/** Stub the GitHub API so tests are deterministic and offline-safe. */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route('https://api.github.com/**', (route) => {
      const url = route.request().url();
      if (url.includes('/repos'))
        return route.fulfill({
          json: [
            {
              name: 'helios',
              description: 'event platform',
              html_url: 'https://github.com/x/helios',
              language: 'Go',
              stargazers_count: 42,
              forks_count: 3,
              pushed_at: new Date().toISOString(),
              size: 900,
              fork: false,
            },
            {
              name: 'quanta',
              description: 'forecasting',
              html_url: 'https://github.com/x/quanta',
              language: 'Python',
              stargazers_count: 7,
              forks_count: 1,
              pushed_at: new Date().toISOString(),
              size: 400,
              fork: false,
            },
          ],
        });
      if (url.includes('/events')) return route.fulfill({ json: [{ created_at: new Date().toISOString() }] });
      return route.fulfill({
        json: {
          login: 'lunaevolans',
          name: 'Luna',
          avatar_url: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
          html_url: 'https://github.com/lunaevolans',
          followers: 10,
          following: 1,
          public_repos: 2,
          created_at: '2017-01-01T00:00:00Z',
        },
      });
    });
    await use(page);
  },
});

export { expect };

/** Navigate and wait for the desktop island to hydrate (keybinds are live after this). */
export async function open(page: import('@playwright/test').Page, url: string) {
  await page.goto(url);
  await page.waitForFunction(() => document.documentElement.classList.contains('js-ready'));
}
