# Website Test Automation with Playwright

End-to-end browser tests using [Playwright](https://playwright.dev/) for website test automation.

## Setup

```bash
npm install
npx playwright install --with-deps chromium
```

## Running Tests

```bash
# Run all tests headlessly
npm test

# Run with browser visible
npm run test:headed

# Open interactive UI mode
npm run test:ui

# View HTML report after a run
npm run test:report
```

## Configuration

- **Config file:** `playwright.config.ts`
- **Default base URL:** `https://playwright.dev` (override with `BASE_URL` env var)
- **Browser:** Chromium (headless by default)

```bash
BASE_URL=https://your-site.com npm test
```

## Project Structure

```
tests/
  homepage.spec.ts       # Tests against playwright.dev
  example-site.spec.ts   # Tests against example.com
  page-object.spec.ts    # Page Object Model pattern example
pages/
  home.page.ts           # Reusable page object for the homepage
playwright.config.ts     # Playwright configuration
```

## Writing Tests

Example test:

```typescript
import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Playwright/);
});
```

See the [Playwright documentation](https://playwright.dev/docs/intro) for locators, assertions, and advanced features.
