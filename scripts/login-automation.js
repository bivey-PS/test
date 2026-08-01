const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'https://test.plansight.com';
const LOGIN_USERNAME = process.env.LOGIN_USERNAME || process.env.LOGIN_EMAIL;
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD;
const MFA_CODE = process.env.MFA_CODE;
const OUTPUT_DIR = path.join(__dirname, '..', 'automation-output');
const AUTH_STATE_PATH = path.join(OUTPUT_DIR, 'auth-state.json');

function requireCredentials() {
  if (!LOGIN_USERNAME || !LOGIN_PASSWORD) {
    console.error('Missing credentials. Set environment variables before running:');
    console.error('  LOGIN_USERNAME=your@email.com LOGIN_PASSWORD=yourpassword npm run automate:login');
    console.error('  MFA_CODE=123456 (required when SMS verification is enabled)');
    console.error('  BASE_URL=https://test.plansight.com (optional, this is the default)');
    process.exit(1);
  }

  if (!LOGIN_USERNAME.includes('@')) {
    console.error('LOGIN_USERNAME must be a full email address (Auth0 rejects usernames without @).');
    console.error(`Received: ${LOGIN_USERNAME}`);
    process.exit(1);
  }
}

function isLoggedIn(url) {
  return url.hostname.includes('plansight.com') && !url.hostname.includes('devauth');
}

async function getVisibleAuthError(page) {
  const errorLocator = page.locator(
    '[role="alert"], .ulp-input-error-message, .error-message',
  );
  const count = await errorLocator.count();
  if (count === 0) {
    return null;
  }

  const messages = await errorLocator.allTextContents();
  const cleaned = messages.map((text) => text.trim()).filter(Boolean);
  return cleaned[0] || null;
}

async function clickContinue(page) {
  await page.getByRole('button', { name: 'Continue' }).click();
}

async function waitForAuthStep(page, urlPattern, timeout = 15000) {
  const stepError = await Promise.race([
    page.waitForURL(urlPattern, { timeout }).then(() => null),
    getVisibleAuthError(page),
  ]);

  if (stepError) {
    throw new Error(stepError);
  }
}

async function completeMfa(page) {
  if (!page.url().includes('/u/mfa-sms-challenge')) {
    return;
  }

  console.log('On SMS MFA challenge page');

  if (!MFA_CODE) {
    throw new Error(
      'SMS verification required. Provide MFA_CODE=123456 to complete login.',
    );
  }

  await page.locator('#code').fill(MFA_CODE);
  await clickContinue(page);

  const mfaError = await Promise.race([
    page
      .waitForURL((url) => isLoggedIn(url), { timeout: 30000 })
      .then(() => null),
    getVisibleAuthError(page),
  ]);

  if (mfaError) {
    throw new Error(mfaError);
  }

  if (page.url().includes('/u/mfa-sms-challenge')) {
    throw new Error('MFA verification did not complete. Check the SMS code and try again.');
  }
}

async function login(page) {
  console.log(`Opening ${BASE_URL}`);
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60000 });

  await page.waitForURL(/\/u\/login\/identifier/, { timeout: 30000 });
  console.log('On login identifier page');

  await page.locator('#username').fill(LOGIN_USERNAME);
  await clickContinue(page);
  await waitForAuthStep(page, /\/u\/login\/password/);

  console.log('On login password page');

  await page.locator('#password').fill(LOGIN_PASSWORD);
  await clickContinue(page);

  if (page.url().includes('/u/login/password')) {
    await waitForAuthStep(page, /\/u\/(mfa-sms-challenge|login\/)/, 30000);
  }

  await completeMfa(page);

  if (!isLoggedIn(new URL(page.url()))) {
    await page.waitForURL((url) => isLoggedIn(url), { timeout: 30000 });
  }
}

async function runLoginAutomation() {
  requireCredentials();
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: process.env.HEADED !== '1',
    slowMo: process.env.HEADED === '1' ? 400 : 0,
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await login(page);

    const finalUrl = page.url();
    const title = await page.title();

    console.log('Login successful');
    console.log(`Final URL: ${finalUrl}`);
    console.log(`Page title: ${title}`);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'login-success.png'),
      fullPage: true,
    });

    await context.storageState({ path: AUTH_STATE_PATH });
    console.log(`Saved auth session: ${AUTH_STATE_PATH}`);

    const report = {
      baseUrl: BASE_URL,
      finalUrl,
      title,
      username: LOGIN_USERNAME,
      timestamp: new Date().toISOString(),
      success: true,
    };

    const reportPath = path.join(OUTPUT_DIR, 'login-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`Saved report: ${reportPath}`);
  } catch (error) {
    console.error('Login automation failed:', error.message);

    const errorScreenshot = path.join(OUTPUT_DIR, 'login-error.png');
    await page.screenshot({ path: errorScreenshot, fullPage: true }).catch(() => {});
    console.error(`Error screenshot saved: ${errorScreenshot}`);
    console.error(`Current URL: ${page.url()}`);

    const reportPath = path.join(OUTPUT_DIR, 'login-report.json');
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        {
          baseUrl: BASE_URL,
          finalUrl: page.url(),
          username: LOGIN_USERNAME,
          timestamp: new Date().toISOString(),
          success: false,
          error: error.message,
        },
        null,
        2,
      ),
    );

    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runLoginAutomation();
