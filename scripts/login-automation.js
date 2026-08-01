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
  openQuotesTab,
  saveRecording,
} = require('./lib/plansight-login');

const BASE_URL = process.env.BASE_URL || 'https://test.plansight.com';
const LOGIN_USERNAME = process.env.LOGIN_USERNAME || process.env.LOGIN_EMAIL;
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD;
const MFA_CODE = process.env.MFA_CODE;
const AUTH_STATE_PATH = path.join(OUTPUT_DIR, 'auth-state.json');
const RECORD_VIDEO = process.env.RECORD_VIDEO === '1';

function requireCredentials() {
  if (!LOGIN_USERNAME || !LOGIN_PASSWORD) {
    console.error('Missing credentials. Set environment variables before running:');
    console.error('  LOGIN_USERNAME=your@email.com LOGIN_PASSWORD=yourpassword npm run automate:login');
    console.error('  MFA_CODE=123456 (required when SMS verification is enabled)');
    console.error('  RECORD_VIDEO=1 (optional, saves automation-output/login-recording.mp4)');
    console.error('  BASE_URL=https://test.plansight.com (optional, this is the default)');
    process.exit(1);
  }

  if (!LOGIN_USERNAME.includes('@')) {
    console.error('LOGIN_USERNAME must be a full email address (Auth0 rejects usernames without @).');
    console.error(`Received: ${LOGIN_USERNAME}`);
    process.exit(1);
  }
}

async function runLoginAutomation() {
  requireCredentials();
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: process.env.HEADED !== '1',
    slowMo: process.env.HEADED === '1' ? 400 : 0,
  });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    recordVideo: RECORD_VIDEO
      ? { dir: OUTPUT_DIR, size: { width: 1400, height: 900 } }
      : undefined,
  });
  const page = await context.newPage();

  try {
    console.log(`Opening ${BASE_URL}`);
    await login(page, {
      baseUrl: BASE_URL,
      username: LOGIN_USERNAME,
      password: LOGIN_PASSWORD,
      mfaCode: MFA_CODE,
    });

    console.log('Login successful');

    const dashboard = await verifyDashboard(page, BASE_URL);
    const employers = await navigateToEmployers(page);
    const aceTesting = await openAceTestingEmployer(page);
    const shadybrookRfp = await openShadybrookLumberRfp(page);
    const quotes = await openQuotesTab(page);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'login-success.png'),
      fullPage: true,
    });

    await context.storageState({ path: AUTH_STATE_PATH });
    console.log(`Saved auth session: ${AUTH_STATE_PATH}`);

    const report = {
      baseUrl: BASE_URL,
      finalUrl: page.url(),
      title: await page.title(),
      username: LOGIN_USERNAME,
      welcomeText: dashboard.welcomeText,
      dashboardUrl: dashboard.dashboardUrl,
      employersUrl: employers.employersUrl,
      aceTestingUrl: aceTesting.employerUrl,
      shadybrookRfpUrl: shadybrookRfp.rfpUrl,
      quotesUrl: quotes.quotesUrl,
      timestamp: new Date().toISOString(),
      success: true,
    };

    if (RECORD_VIDEO) {
      await page.close();
      report.recordingPath = await saveRecording(page);
    }

    const reportPath = path.join(OUTPUT_DIR, 'login-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`Saved report: ${reportPath}`);
    console.log(`Final URL: ${report.finalUrl}`);
  } catch (error) {
    console.error('Login automation failed:', error.message);

    const errorScreenshot = path.join(OUTPUT_DIR, 'login-error.png');
    await page.screenshot({ path: errorScreenshot, fullPage: true }).catch(() => {});
    console.error(`Error screenshot saved: ${errorScreenshot}`);
    console.error(`Current URL: ${page.url()}`);

    if (RECORD_VIDEO) {
      await page.close().catch(() => {});
      await saveRecording(page, 'login-recording-error').catch(() => {});
    }

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'login-report.json'),
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
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

runLoginAutomation();
