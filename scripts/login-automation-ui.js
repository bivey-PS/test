const { chromium } = require('playwright');
const fs = require('fs');
const {
  OUTPUT_DIR,
  AUTH_STATE_PATH,
  authStateMatchesBaseUrl,
  ensureLoggedIn,
  saveAuthState,
  verifyDashboard,
  navigateToEmployers,
  openAceTestingEmployer,
  openShadybrookLumberRfp,
  openQuotesTab,
  openCancerTab,
  verifyReconstructiveSurgeryBenefit,
  saveRecording,
} = require('./lib/plansight-login');
const { getLoginCredentials, requireLoginPassword } = require('./lib/plansight-credentials');
const { assertBenefitsVerified } = require('./lib/assert-benefits-verified');

const BASE_URL = process.env.BASE_URL || 'https://test.plansight.com';
const { username: LOGIN_USERNAME, password: LOGIN_PASSWORD, mfaCode: MFA_CODE } =
  getLoginCredentials();
const PAUSE_MS = 1500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runPostLoginFlow(page) {
  await sleep(PAUSE_MS);
  const dashboard = await verifyDashboard(page, BASE_URL);
  const employers = await navigateToEmployers(page);
  const aceTesting = await openAceTestingEmployer(page);
  const shadybrookRfp = await openShadybrookLumberRfp(page);
  const quotes = await openQuotesTab(page);
  const cancer = await openCancerTab(page);
  const benefit = await verifyReconstructiveSurgeryBenefit(page);

  console.log(`Dashboard verified: ${dashboard.welcomeText}`);
  console.log(`Employers page: ${employers.employersUrl}`);
  console.log(`Ace Testing employer: ${aceTesting.employerUrl}`);
  console.log(`Shadybrook Lumber RFP: ${shadybrookRfp.rfpUrl}`);
  console.log(`Quotes tab: ${quotes.quotesUrl}`);
  console.log(`Cancer tab: ${cancer.cancerQuotesUrl}`);
  console.log(`Reconstructive Surgery verified: ${benefit.verified}`);
  console.log(`Verified benefit rows: ${benefit.verifiedRows.join(', ')}`);
  console.log(
    `Benefits report: ${benefit.summary.found}/${benefit.summary.total} rows found`,
  );
  if (!benefit.verified) {
    console.log(`Missing benefit rows: ${benefit.missingRows.join(', ')}`);
  }

  assertBenefitsVerified(benefit);
  return benefit;
}

async function runLoginUiDemo() {
  requireLoginPassword(
    { username: LOGIN_USERNAME, password: LOGIN_PASSWORD },
    'LOGIN_PASSWORD=yourpassword npm run automate:login:ui',
  );

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300,
  });

  const contextOptions = {
    viewport: { width: 1400, height: 900 },
    recordVideo: { dir: OUTPUT_DIR, size: { width: 1400, height: 900 } },
  };

  if (authStateMatchesBaseUrl(BASE_URL)) {
    contextOptions.storageState = AUTH_STATE_PATH;
    console.log(`Loading saved auth session for ${new URL(BASE_URL).hostname}`);
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  try {
    console.log(`Opening ${BASE_URL}`);

    const loginResult = await ensureLoggedIn(page, context, {
      baseUrl: BASE_URL,
      username: LOGIN_USERNAME,
      password: LOGIN_PASSWORD,
      mfaCode: MFA_CODE,
      authStatePath: AUTH_STATE_PATH,
    });

    console.log(
      loginResult.reusedSession
        ? 'Session reused — skipped login and MFA'
        : 'Fresh login completed — auth session saved for future runs',
    );

    await runPostLoginFlow(page);
    await saveAuthState(context, AUTH_STATE_PATH);

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
