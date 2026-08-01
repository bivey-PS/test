const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const {
  OUTPUT_DIR,
  login,
  verifyDashboard,
  navigateToEmployers,
  openAceTestingEmployer,
  openShadybrookLumberRfp,
  saveRecording,
} = require('./lib/plansight-login');

const BASE_URL = process.env.BASE_URL || 'https://test.plansight.com';
const LOGIN_USERNAME = process.env.LOGIN_USERNAME || process.env.LOGIN_EMAIL;
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD;
const MFA_CODE = process.env.MFA_CODE;
const AUTH_STATE_PATH = path.join(OUTPUT_DIR, 'auth-state.json');
const PAUSE_MS = 1500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    recordVideo: { dir: OUTPUT_DIR, size: { width: 1400, height: 900 } },
  });
  let page = await context.newPage();

  try {
    console.log(`Opening ${BASE_URL}`);
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await sleep(PAUSE_MS);

    if (MFA_CODE) {
      await login(page, {
        baseUrl: BASE_URL,
        username: LOGIN_USERNAME,
        password: LOGIN_PASSWORD,
        mfaCode: MFA_CODE,
      });
    } else if (fs.existsSync(AUTH_STATE_PATH)) {
      console.log('Running login steps through MFA, then restoring saved session for dashboard');
      await page.locator('#username').fill(LOGIN_USERNAME);
      await sleep(PAUSE_MS);
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.waitForURL(/\/u\/login\/password/, { timeout: 15000 });
      await sleep(PAUSE_MS);
      await page.locator('#password').fill(LOGIN_PASSWORD);
      await sleep(PAUSE_MS);
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.waitForURL(/mfa-sms-challenge/, { timeout: 15000 });
      await sleep(PAUSE_MS);

      await page.close();
      await context.close();

      const restoredContext = await browser.newContext({
        storageState: AUTH_STATE_PATH,
        viewport: { width: 1400, height: 900 },
        recordVideo: { dir: OUTPUT_DIR, size: { width: 1400, height: 900 } },
      });
      page = await restoredContext.newPage();
      await page.goto(`${BASE_URL}/app#dashboard`, {
        waitUntil: 'networkidle',
        timeout: 60000,
      });
      await sleep(PAUSE_MS * 2);

      const dashboard = await verifyDashboard(page, BASE_URL);
      const employers = await navigateToEmployers(page);
      const aceTesting = await openAceTestingEmployer(page);
      const shadybrookRfp = await openShadybrookLumberRfp(page);
      console.log(`Dashboard verified: ${dashboard.welcomeText}`);
      console.log(`Employers page: ${employers.employersUrl}`);
      console.log(`Ace Testing employer: ${aceTesting.employerUrl}`);
      console.log(`Shadybrook Lumber RFP: ${shadybrookRfp.rfpUrl}`);

      await page.close();
      const recordingPath = await saveRecording(page, 'login-ui-demo');
      console.log(`Saved UI demo recording: ${recordingPath}`);

      await restoredContext.close();
      await browser.close();
      return;
    } else {
      throw new Error('MFA required. Provide MFA_CODE or a saved auth session.');
    }

    await sleep(PAUSE_MS);
    const dashboard = await verifyDashboard(page, BASE_URL);
    const employers = await navigateToEmployers(page);
    const aceTesting = await openAceTestingEmployer(page);
    const shadybrookRfp = await openShadybrookLumberRfp(page);
    console.log(`Dashboard verified: ${dashboard.welcomeText}`);
    console.log(`Employers page: ${employers.employersUrl}`);
    console.log(`Ace Testing employer: ${aceTesting.employerUrl}`);
    console.log(`Shadybrook Lumber RFP: ${shadybrookRfp.rfpUrl}`);

    await page.close();
    const recordingPath = await saveRecording(page, 'login-ui-demo');
    console.log(`Saved UI demo recording: ${recordingPath}`);
  } catch (error) {
    await page.close().catch(() => {});
    await saveRecording(page, 'login-ui-demo-error').catch(() => {});
    throw error;
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

runLoginUiDemo().catch((error) => {
  console.error('UI demo failed:', error.message);
  process.exit(1);
});
