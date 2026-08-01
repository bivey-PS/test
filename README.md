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
LOGIN_USERNAME=your@email.com LOGIN_PASSWORD=yourpassword MFA_CODE=123456 npm run automate:login

# Login with video recording saved to automation-output/login-recording.mp4
RECORD_VIDEO=1 LOGIN_USERNAME=... LOGIN_PASSWORD=... MFA_CODE=... npm run automate:login

# Headed UI demo (always saves automation-output/login-ui-demo.mp4)
npm run automate:login:ui
```

Login script defaults to `BASE_URL=https://test.plansight.com`. Override if needed:

```bash
BASE_URL=https://test.plansight.com LOGIN_USERNAME=your@email.com LOGIN_PASSWORD=yourpassword MFA_CODE=123456 npm run automate:login
```

After login, the automation also:
- Verifies the dashboard loads (`Welcome` message, RFP stat tabs, filter bar)
- Clicks the **Active RFPs** tab
- Clicks **Employers** in the left sidebar (`.sidebar-collapse`)
- Waits for the employers table to populate, then clicks **Ace Testing** in the Employer column
- Opens **Shadybrook Lumber** from the Request for Proposals section on the employer page
- Clicks the **Quotes** tab on the Shadybrook Lumber RFP page
- Clicks the **Cancer** benefit tab within Quotes
- Verifies the **All Employers**, **Ace Testing**, and **Shadybrook Lumber** pages load
- Saves a dashboard screenshot

On success, the script saves:
- `automation-output/login-success.png` — post-login screenshot
- `automation-output/dashboard.png` — dashboard screenshot
- `automation-output/employers.png` — employers list screenshot
- `automation-output/ace-testing-employer.png` — Ace Testing employer detail screenshot
- `automation-output/shadybrook-lumber-rfp.png` — Shadybrook Lumber RFP screenshot
- `automation-output/shadybrook-quotes.png` — Shadybrook Lumber Quotes tab screenshot
- `automation-output/shadybrook-cancer-quotes.png` — Shadybrook Lumber Cancer quotes screenshot
- `automation-output/auth-state.json` — reusable browser session
- `automation-output/login-report.json` — run summary
- `automation-output/login-recording.mp4` — when `RECORD_VIDEO=1`
- `automation-output/login-ui-demo.mp4` — from `npm run automate:login:ui`

## Project Structure

```
scripts/
  lib/plansight-login.js # Shared login + dashboard verification helpers
  website-automation.js  # General automation script
  login-automation.js    # Plansight Auth0 login script
  login-automation-ui.js # Headed UI demo with MP4 recording
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
