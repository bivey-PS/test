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
LOGIN_PASSWORD=yourpassword MFA_CODE=123456 npm run automate:login

# Login with video recording saved to automation-output/login-recording.mp4
RECORD_VIDEO=1 LOGIN_USERNAME=... LOGIN_PASSWORD=... MFA_CODE=... npm run automate:login

# Headed UI demo (always saves automation-output/login-ui-demo.mp4)
npm run automate:login:ui

# PS-9250 Minimum Gate smoke automation (S1.2, S2.1, S2.2, S3.1)
MFA_CODE=123456 npm run automate:ps9250:minimum-gate
```

PS-9250 defaults to broker user `ps.automation.broker.ca.admin@plansight.com` on `BASE_URL=https://test.plansight.com`. Credentials are built into the PS-9250 config; override with `LOGIN_USERNAME` / `LOGIN_PASSWORD` if needed. Provide `MFA_CODE` on first login or when the saved session expires.

```bash
BASE_URL=https://test.plansight.com EMPLOYER_NAME="Ace Testing" MFA_CODE=123456 npm run automate:ps9250:minimum-gate
```

The PS-9250 Minimum Gate suite verifies:
- **S1.2** Valid broker login → lands in app
- **S2.1** Group List loads
- **S2.2** Open an existing group → loads without error
- **S3.1** Start new RFP → Basics tab opens
- **S3.2** RFP Basics → Save & Continue
- **S3.3** Choose Benefit Types → Medical, Vision, Dental (Marketing) → Save & Continue
- **S3.3.1** Community Rated Plans → Save & Continue
- **S3.4** Documents for Carrier Quoting → Save & Continue
- **S3.5** Medical Plan Details → Save & go to Distribution
- **S3.6** Who Gets the RFP? → ellipsis menu → Medical → Quotes tab highlighted (`#gridInit/medical`) with **Vision** and **Dental** subnav tabs
- **S3.7** Back to employer profile link → employer profile loads
- **S3.8** Request for Proposals → row for `{employer} {YYYY-MM-DD}*`

Reports are written to:
- `automation-output/ps-9250-minimum-gate-report.json`
- `automation-output/ps-9250-minimum-gate-report.md`

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
- Verifies these **Benefits** rows in the **Plan Group** column:
  - Reconstructive Surgery
  - Experimental Treatment
  - ICU Benefit
  - Anti-Nausea Meds
  - Transportation
  - Ambulance
  - Loging (also accepts Lodging)
- Writes a benefits verification report with per-row FOUND / NOT FOUND status:
  - `automation-output/benefits-verification-report.json`
  - `automation-output/benefits-verification-report.md`
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
  lib/plansight-credentials.js # Shared broker login defaults (b.ivey@plansight.com)
  lib/plansight-login.js # Shared login + dashboard verification helpers
  ps-9250/               # PS-9250 Minimum Gate automation suite
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
