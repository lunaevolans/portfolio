import AxeBuilder from '@axe-core/playwright';
import { themeIds } from '../../src/lib/themes';
import { expect, test } from './fixtures';

for (const theme of themeIds) {
  test(`desktop has no axe violations in ${theme}`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('luna.theme', t), theme);
    await page.goto('/');
    await expect(page.locator('.ws.active .win')).toHaveCount(3);
    await page.waitForTimeout(900); // let entrance animations settle
    const results = await new AxeBuilder({ page }).include('.ws.active').include('.topbar').withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });
}

for (const path of ['/projects/', '/blog/', '/blog/boring-event-driven/', '/resume/', '/colophon/']) {
  test(`static page ${path} has no axe violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });
}
