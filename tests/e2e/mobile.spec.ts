import { expect, open, test } from './fixtures';

test.describe('mobile shell', () => {
  test('shows the launcher and opens apps as sheets', async ({ page }) => {
    await open(page, '/');
    await expect(page.getByRole('heading', { name: 'Luna Evolans' })).toBeVisible();
    await page.getByRole('button', { name: 'projects', exact: true }).tap();
    const sheet = page.getByRole('dialog', { name: 'Projects' });
    await expect(sheet).toBeVisible();
    await sheet.getByRole('button', { name: /^Helios Event Platform/ }).tap();
    await expect(page.getByRole('dialog', { name: 'Helios Event Platform' })).toBeVisible();
    await page.getByRole('button', { name: 'Back' }).tap();
    await expect(page.getByRole('dialog', { name: 'Projects' })).toBeVisible();
  });

  test('has no horizontal overflow', async ({ page }) => {
    await open(page, '/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
