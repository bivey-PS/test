import { test, expect } from '@playwright/test';

test.describe('Playwright documentation site', () => {
  test('homepage loads with correct title', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/Playwright/);
    await expect(page.getByRole('link', { name: 'Get started' })).toBeVisible();
  });

  test('can navigate to the docs section', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: 'Docs' }).first().click();

    await expect(page).toHaveURL(/docs/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('search input is accessible', async ({ page }) => {
    await page.goto('/docs/intro');

    const searchButton = page.getByRole('button', { name: /search/i });
    await expect(searchButton).toBeVisible();
  });
});
