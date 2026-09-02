const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
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
const JIRA_TICKET = process.env.JIRA_TICKET;
const { username: LOGIN_USERNAME, password: LOGIN_PASSWORD, mfaCode: MFA_CODE } =
  getLoginCredentials();
const RECORD_VIDEO = process.env.RECORD_VIDEO === '1';

function requireCredentials() {
  requireLoginPassword(
    { username: LOGIN_USERNAME, password: LOGIN_PASSWORD },
    'LOGIN_PASSWORD=yourpassword npm run automate:login',
  );
}

async function runLoginAutomation() {
  requireCredentials();
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: process.env.HEADED !== '1',
    slowMo: process.env.HEADED === '1' ? 400 : 0,
  });

  const contextOptions = {
    viewport: { width: 1400, height: 900 },
    recordVideo: RECORD_VIDEO
      ? { dir: OUTPUT_DIR, size: { width: 1400, height: 900 } }
      : undefined,
  };

  if (authStateMatchesBaseUrl(BASE_URL)) {
    contextOptions.storageState = AUTH_STATE_PATH;
    console.log(`Loading saved auth session for ${new URL(BASE_URL).hostname}`);
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  try {
    console.log(`Opening ${BASE_URL}${process.env.JIRA_TICKET ? ` (${process.env.JIRA_TICKET})` : ''}`);
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

    console.log('Login successful');

    const dashboard = await verifyDashboard(page, BASE_URL);
    const employers = await navigateToEmployers(page);
    const aceTesting = await openAceTestingEmployer(page);
    const shadybrookRfp = await openShadybrookLumberRfp(page);
    const quotes = await openQuotesTab(page);
    const cancer = await openCancerTab(page);
    const benefit = await verifyReconstructiveSurgeryBenefit(page);

    assertBenefitsVerified(benefit);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'login-success.png'),
      fullPage: true,
    });

    await saveAuthState(context, AUTH_STATE_PATH);

    const report = {
      jiraTicket: JIRA_TICKET || null,
      baseUrl: BASE_URL,
      finalUrl: page.url(),
      title: await page.title(),
      username: LOGIN_USERNAME,
      reusedSession: loginResult.reusedSession,
      welcomeText: dashboard.welcomeText,
      dashboardUrl: dashboard.dashboardUrl,
      employersUrl: employers.employersUrl,
      aceTestingUrl: aceTesting.employerUrl,
      shadybrookRfpUrl: shadybrookRfp.rfpUrl,
      quotesUrl: quotes.quotesUrl,
      cancerQuotesUrl: cancer.cancerQuotesUrl,
      benefitsVerification: {
        verified: benefit.verified,
        summary: benefit.summary,
        rows: benefit.rows,
        reportJson: path.join(OUTPUT_DIR, 'benefits-verification-report.json'),
        reportMarkdown: path.join(OUTPUT_DIR, 'benefits-verification-report.md'),
      },
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
          jiraTicket: JIRA_TICKET || null,
          baseUrl: BASE_URL,
          finalUrl: page.url(),
          username: LOGIN_USERNAME,
          timestamp: new Date().toISOString(),
          success: false,
          error: error.message,
          benefitsVerificationReport: path.join(
            OUTPUT_DIR,
            'benefits-verification-report.json',
          ),
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
