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

## Automation Scripts

```bash
# General site automation (screenshots + report)
npm run automate

# Login automation for Plansight
LOGIN_USERNAME=your@email.com LOGIN_PASSWORD=yourpassword npm run automate:login
```

Login script defaults to `BASE_URL=https://test.plansight.com`. Override if needed:

```bash
BASE_URL=https://test.plansight.com LOGIN_USERNAME=your@email.com LOGIN_PASSWORD=yourpassword npm run automate:login
```

On success, the script saves:
- `automation-output/login-success.png` — post-login screenshot
- `automation-output/auth-state.json` — reusable browser session
- `automation-output/login-report.json` — run summary

## Project Structure

```
scripts/
  website-automation.js  # General automation script
  login-automation.js    # Plansight Auth0 login script
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
