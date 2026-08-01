const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'https://test.plansight.com';
const LOGIN_USERNAME = process.env.LOGIN_USERNAME || process.env.LOGIN_EMAIL;
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD;
const OUTPUT_DIR = path.join(__dirname, '..', 'automation-output');
const AUTH_STATE_PATH = path.join(OUTPUT_DIR, 'auth-state.json');

function requireCredentials() {
  if (!LOGIN_USERNAME || !LOGIN_PASSWORD) {
    console.error('Missing credentials. Set environment variables before running:');
    console.error('  LOGIN_USERNAME=your@email.com LOGIN_PASSWORD=yourpassword npm run automate:login');
    console.error('  BASE_URL=https://test.plansight.com (optional, this is the default)');
    process.exit(1);
  }
}

async function login(page) {
  console.log(`Opening ${BASE_URL}`);
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60000 });

  // Auth0 redirects to the identifier step.
  await page.waitForURL(/\/u\/login\/identifier/, { timeout: 30000 });
  console.log('On login identifier page');

  await page.locator('#username').fill(LOGIN_USERNAME);
  await page.getByRole('button', { name: 'Continue' }).click();

  await page.waitForURL(/\/u\/login\/password/, { timeout: 30000 });
  console.log('On login password page');

  await page.locator('#password').fill(LOGIN_PASSWORD);
  await page.getByRole('button', { name: 'Continue' }).click();

  // Wait for redirect back to Plansight after successful authentication.
  await page.waitForURL(
    (url) => url.hostname.includes('plansight.com') && !url.hostname.includes('devauth'),
    { timeout: 60000 },
  );
}

async function runLoginAutomation() {
  requireCredentials();
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await login(page);

    const finalUrl = page.url();
    const title = await page.title();

    console.log(`Login successful`);
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
