const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'https://test.plansight.com';
const LOGIN_USERNAME = process.env.LOGIN_USERNAME || process.env.LOGIN_EMAIL;
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD;
const MFA_CODE = process.env.MFA_CODE;
const OUTPUT_DIR = path.join(__dirname, '..', 'automation-output');
const AUTH_STATE_PATH = path.join(OUTPUT_DIR, 'auth-state.json');
const PAUSE_MS = 1500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isLoggedIn(url) {
  return url.hostname.includes('plansight.com') && !url.hostname.includes('devauth');
}

async function runLoginUiDemo() {
  if (!LOGIN_USERNAME || !LOGIN_PASSWORD) {
    console.error('Set LOGIN_USERNAME and LOGIN_PASSWORD to run the UI demo.');
    process.exit(1);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300,
  });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  try {
    console.log(`Opening ${BASE_URL}`);
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await sleep(PAUSE_MS);

    console.log('Entering email');
    await page.locator('#username').fill(LOGIN_USERNAME);
    await sleep(PAUSE_MS);
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.waitForURL(/\/u\/login\/password/, { timeout: 15000 });
    await sleep(PAUSE_MS);

    console.log('Entering password');
    await page.locator('#password').fill(LOGIN_PASSWORD);
    await sleep(PAUSE_MS);
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.waitForURL(/mfa-sms-challenge|test\.plansight\.com/, { timeout: 15000 });
    await sleep(PAUSE_MS);

    if (page.url().includes('/u/mfa-sms-challenge')) {
      console.log('On MFA page');

      if (MFA_CODE) {
        await page.locator('#code').fill(MFA_CODE);
        await sleep(PAUSE_MS);
        await page.getByRole('button', { name: 'Continue' }).click();
        await page.waitForURL((url) => isLoggedIn(url), { timeout: 30000 });
      } else if (fs.existsSync(AUTH_STATE_PATH)) {
        console.log('No MFA_CODE provided — restoring saved session to show dashboard');
        await context.close();
        const restoredContext = await browser.newContext({
          storageState: AUTH_STATE_PATH,
          viewport: { width: 1400, height: 900 },
        });
        const restoredPage = await restoredContext.newPage();
        await restoredPage.goto(`${BASE_URL}/app#dashboard`, {
          waitUntil: 'networkidle',
          timeout: 60000,
        });
        await sleep(PAUSE_MS * 2);
        await restoredPage.screenshot({
          path: path.join(OUTPUT_DIR, 'ui-demo-dashboard.png'),
          fullPage: false,
        });
        console.log(`Dashboard URL: ${restoredPage.url()}`);
        await sleep(PAUSE_MS * 2);
        await restoredContext.close();
        await browser.close();
        return;
      } else {
        throw new Error('MFA required. Provide MFA_CODE or a saved auth session.');
      }
    }

    console.log(`Login complete: ${page.url()}`);
    await sleep(PAUSE_MS * 2);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'ui-demo-dashboard.png'),
      fullPage: false,
    });
    await sleep(PAUSE_MS * 2);
  } finally {
    await browser.close().catch(() => {});
  }
}

runLoginUiDemo().catch((error) => {
  console.error('UI demo failed:', error.message);
  process.exit(1);
});
