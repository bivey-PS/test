import { test, expect } from '@playwright/test';

test.describe('Example.com (external site)', () => {
  test.use({ baseURL: 'https://example.com' });

  test('displays the expected heading and paragraph', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Example Domain' })).toBeVisible();
    await expect(page.getByText('This domain is for use in documentation examples')).toBeVisible();
  });

  test('Learn more link points to iana.org', async ({ page }) => {
    await page.goto('/');

    const link = page.getByRole('link', { name: 'Learn more' });
    await expect(link).toHaveAttribute('href', 'https://iana.org/domains/example');
  });
});
