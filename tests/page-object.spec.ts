import { test, expect } from '@playwright/test';
import { PlaywrightHomePage } from '../pages/home.page';

test.describe('Page Object Model example', () => {
  test('navigates to docs using page object', async ({ page }) => {
    const homePage = new PlaywrightHomePage(page);

    await homePage.goto();
    await expect(homePage.getStartedLink).toBeVisible();

    await homePage.openDocs();
    await expect(page).toHaveURL(/docs/);
  });
});
