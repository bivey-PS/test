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
  openAccidentTab,
  verifyAccidentBenefitsPlanGroupRows,
} = require('./lib/plansight-login');

const BASE_URL = process.env.BASE_URL || 'https://jeff.plansight.com';
const JIRA_TICKET = process.env.JIRA_TICKET || 'PS-8909';
const LOGIN_USERNAME = process.env.LOGIN_USERNAME || process.env.LOGIN_EMAIL;
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD;
const MFA_CODE = process.env.MFA_CODE;

function requireCredentials() {
  if (!LOGIN_USERNAME || !LOGIN_PASSWORD) {
    console.error('Missing credentials. Set environment variables before running:');
    console.error(
      '  LOGIN_USERNAME=your@email.com LOGIN_PASSWORD=yourpassword npm run automate:ps8909',
    );
    console.error('  MFA_CODE=123456 (required on first login or when saved session expires)');
    console.error('  BASE_URL=https://jeff.plansight.com (optional, this is the default)');
    process.exit(1);
  }
}

async function runPs8909Automation() {
  requireCredentials();
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: process.env.HEADED !== '1',
    slowMo: process.env.HEADED === '1' ? 400 : 0,
  });

  const contextOptions = {
    viewport: { width: 1400, height: 900 },
  };

  if (authStateMatchesBaseUrl(BASE_URL)) {
    contextOptions.storageState = AUTH_STATE_PATH;
    console.log(`Loading saved auth session for ${new URL(BASE_URL).hostname}`);
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  try {
    console.log(`Running ${JIRA_TICKET} automation on ${BASE_URL}`);
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

    await verifyDashboard(page, BASE_URL);
    await navigateToEmployers(page);
    await openAceTestingEmployer(page);
    await openShadybrookLumberRfp(page);
    await openQuotesTab(page);
    const accident = await openAccidentTab(page);
    const benefit = await verifyAccidentBenefitsPlanGroupRows(page);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'ps-8909-accident-benefits.png'),
      fullPage: true,
    });

    await saveAuthState(context, AUTH_STATE_PATH);

    const report = {
      jiraTicket: JIRA_TICKET,
      baseUrl: BASE_URL,
      finalUrl: page.url(),
      accidentQuotesUrl: accident.accidentQuotesUrl,
      benefitsVerification: {
        verified: benefit.verified,
        summary: benefit.summary,
        rows: benefit.rows,
        reportJson: path.join(OUTPUT_DIR, 'ps-8909-benefits-verification-report.json'),
        reportMarkdown: path.join(OUTPUT_DIR, 'ps-8909-benefits-verification-report.md'),
      },
      timestamp: new Date().toISOString(),
      success: benefit.verified,
    };

    const reportPath = path.join(OUTPUT_DIR, 'ps-8909-automation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`Saved report: ${reportPath}`);
    console.log(
      `Benefits verification: ${benefit.summary.found}/${benefit.summary.total} rows found`,
    );

    if (!benefit.verified) {
      console.error(`Missing benefit rows: ${benefit.missingRows.join(', ')}`);
      process.exitCode = 1;
    } else {
      console.log(`${JIRA_TICKET} automation PASSED`);
    }
  } catch (error) {
    console.error(`${JIRA_TICKET} automation failed:`, error.message);
    await page.screenshot({
      path: path.join(OUTPUT_DIR, 'ps-8909-error.png'),
      fullPage: true,
    }).catch(() => {});
    console.error(`Current URL: ${page.url()}`);
    process.exitCode = 1;
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

runPs8909Automation();
