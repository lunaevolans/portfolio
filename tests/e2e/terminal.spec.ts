import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

async function run(page: Page, cmd: string) {
  await page.keyboard.type(cmd, { delay: 5 });
  await page.keyboard.press('Enter');
}
const screen = (page: Page) => page.locator('.tty .xterm-rows');

test.describe('terminal mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?mode=tty');
    await expect(screen(page)).toContainText('luna@bazzite');
    await page.locator('.tty .xterm-helper-textarea').focus();
  });

  test('lists files and reads a project', async ({ page }) => {
    await run(page, 'ls');
    await expect(screen(page)).toContainText('projects/');
    await run(page, 'cat projects/helios.md | grep -i outcome');
    await expect(screen(page)).toContainText('## Outcome');
  });

  test('tab completion', async ({ page }) => {
    await page.keyboard.type('neof');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(screen(page)).toContainText('Hyprland (web port)');
  });

  test('theme command changes the palette', async ({ page }) => {
    await run(page, 'theme gruvbox');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'gruvbox');
  });

  test('gui returns to the desktop and open launches apps', async ({ page }) => {
    await run(page, 'open lab');
    await expect(page.locator('.tty')).toHaveCount(0);
    await expect(page.locator('.ws.active')).toHaveAttribute('data-ws', '4');
  });

  test('sudo is suitably judgemental', async ({ page }) => {
    await run(page, 'sudo ls');
    await expect(screen(page)).toContainText('not in the sudoers file');
  });
});
