import { expect, open, test } from './fixtures';

const activeWs = (page: import('@playwright/test').Page) => page.locator('.ws.active');

test.describe('desktop', () => {
  test('boots straight to the tiled home workspace', async ({ page }) => {
    await open(page, '/');
    await expect(page.locator('.boot')).toBeHidden();
    const wins = activeWs(page).locator('.win');
    await expect(wins).toHaveCount(3);
    await expect(activeWs(page).getByRole('heading', { name: 'Luna Evolans' })).toBeVisible();
  });

  test('boot sequence can be skipped with a key', async ({ page }) => {
    await open(page, '/?boot');
    await expect(page.locator('.boot')).toBeVisible();
    await page.keyboard.press('Space');
    await expect(page.locator('.boot')).toHaveCount(0);
  });

  test('switches workspaces with keybinds and the bar', async ({ page }) => {
    await open(page, '/');
    await page.keyboard.press('Alt+Digit3');
    await expect(activeWs(page)).toHaveAttribute('data-ws', '3');
    await expect(activeWs(page).locator('[data-app="architecture"]')).toBeVisible();
    await page.getByRole('button', { name: /Workspace 2/ }).click();
    await expect(activeWs(page)).toHaveAttribute('data-ws', '2');
  });

  test('floats, fullscreens and closes windows', async ({ page }) => {
    await open(page, '/');
    const win = activeWs(page).locator('[data-app="skills"]');
    await win.getByRole('button', { name: 'Float window' }).click();
    await expect(win).toHaveClass(/floating/);
    await win.getByRole('button', { name: 'Fullscreen' }).click();
    await expect(win).toHaveClass(/fullscreen/);
    await win.getByRole('button', { name: /Close/ }).click();
    await expect(activeWs(page).locator('[data-app="skills"]')).toHaveCount(0);
  });

  test('launcher fuzzy-searches and opens a project', async ({ page }) => {
    await open(page, '/');
    await page.keyboard.press('Control+k');
    const input = page.getByRole('combobox', { name: 'Search' });
    await expect(input).toBeFocused();
    await input.fill('quanta');
    await page.keyboard.press('Enter');
    const detail = activeWs(page).locator('[data-app="project"]');
    await expect(detail.getByRole('heading', { name: 'Quanta Forecasting', level: 1 })).toBeVisible();
  });

  test('theme switch applies and persists', async ({ page }) => {
    await open(page, '/');
    await page.getByRole('button', { name: 'Theme' }).click();
    await page.getByRole('menuitemradio', { name: /Nord/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'nord');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'nord');
  });

  test('deep links open the right app', async ({ page }) => {
    await open(page, '/?app=lab');
    await expect(activeWs(page)).toHaveAttribute('data-ws', '4');
    await expect(activeWs(page).getByRole('heading', { name: /Demand forecast/ })).toBeVisible();
    await expect(activeWs(page).locator('.chart svg').first()).toBeVisible();
  });

  test('architecture node selection shows design decisions', async ({ page }) => {
    await open(page, '/?app=architecture');
    const node = page.getByRole('button', { name: /^API gateway/ });
    await node.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.arch-panel h3')).toHaveText('API gateway');
    await page.getByRole('tab', { name: 'Skill topology' }).click();
    await expect(page.getByRole('button', { name: /^PostgreSQL/ })).toBeVisible();
  });

  test('github panel renders live (stubbed) data', async ({ page }) => {
    await open(page, '/');
    await page.keyboard.press('Alt+Digit2');
    const gh = activeWs(page).locator('[data-app="github"]');
    await expect(gh.getByRole('link', { name: 'helios' })).toBeVisible();
    await expect(gh.getByText('Go 69.2%')).toBeVisible();
  });

  test('contact form validates input', async ({ page }) => {
    await open(page, '/?app=contact');
    const form = page.getByRole('form', { name: 'Contact form' });
    await form.getByRole('button', { name: /Send/ }).click();
    await expect(form.getByText('name: required')).toBeVisible();
    await expect(form.getByText('email: needs a valid address')).toBeVisible();
  });

  test('keybind cheatsheet toggles with ?', async ({ page }) => {
    await open(page, '/');
    await page.keyboard.press('Shift+Slash');
    await expect(page.getByRole('dialog', { name: /keybinds/ })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: /keybinds/ })).toHaveCount(0);
  });
});
