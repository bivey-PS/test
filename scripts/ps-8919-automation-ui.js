/**
 * PS-8919 / PS-8882 UI automation
 *
 * Flow:
 *  1. Reuse auth state and open dashboard
 *  2. Navigate Employers -> Ace Testing
 *  3. (Optional) Configure new to-market RFP via wizard
 *  4. Open Market Response -> Quotes tab
 *  5. Assert quotes page is available (NOT "no quotes available")
 *
 * See automation-output/ps-8919-ui-exploration.md for full locator map.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const {
  OUTPUT_DIR,
  AUTH_STATE_PATH,
  authStateMatchesBaseUrl,
  sessionIsValid,
  navigateToEmployers,
  waitForPageReady,
} = require('./lib/plansight-login');

const BASE_URL = process.env.BASE_URL || 'https://jeff.plansight.com';
const RUN_WIZARD = process.env.RUN_WIZARD === '1';
const RFP_NAME = process.env.RFP_NAME || 'Shadybrook Lumber';

const ACE_TESTING_GROUP_ID = 'QJTbWHW9aoWhyKuwtGnBd8thjcs';
const DEFAULT_RFP_IDS = {
  'Shadybrook Lumber': 'vVi3pQjveGO4O7BIfu6YqyPcmsQ',
  'Laradon Hall - Test2': 'MSWuetXoCltq2duitykWFIjWA4s',
  'Fleet Master - Test 5': 'ehLrZwcsmN6l8h2U8xkXlD7iJIA',
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function openAceTestingEmployer(page) {
  const employerLink = page.locator('table').getByRole('link', {
    name: 'Ace Testing',
    exact: true,
  });
  await employerLink.first().waitFor({ timeout: 30000 });
  await employerLink.first().click();
  await page.waitForURL(/\/group\/.*#groupUpdate/, { timeout: 30000 });
  await waitForPageReady(page);
  await page.getByText('About This Employer').waitFor({ timeout: 60000 });
}

async function openMarketResponseRfp(page, rfpName) {
  const rfpTable = page.locator('#pending-active-pastDue-rfp-table');
  await rfpTable.waitFor({ timeout: 30000 });
  await rfpTable.locator('tbody tr').first().waitFor({ timeout: 30000 });

  const rfpLink = rfpTable.locator('a[href*="#marketResponse"]').filter({
    has: page.locator('.name', { hasText: rfpName }),
  });
  await rfpLink.first().waitFor({ timeout: 30000 });
  await rfpLink.first().scrollIntoViewIfNeeded();
  await rfpLink.first().click();

  await page.waitForURL(/#marketResponse/, { timeout: 30000 });
  await waitForPageReady(page);
  await page.getByText('Market Response').first().waitFor({ timeout: 15000 });
}

async function openQuotesTab(page) {
  const quotesTab = page
    .locator('.group-nav-tabs-container')
    .getByRole('link', { name: 'Quotes', exact: true });
  await quotesTab.waitFor({ timeout: 15000 });
  await quotesTab.click();
  await page.waitForURL(/#gridInit\//, { timeout: 30000 });
  await waitForPageReady(page);
  await page.locator('a[href*="#gridInit/medical"]').first().waitFor({ timeout: 30000 });
}

async function verifyQuotesAvailable(page) {
  const bodyText = await page.locator('body').innerText();
  const url = page.url();

  const noQuotesAvailable = /no quotes available/i.test(bodyText);
  const noPlanOptions = /no medical plan options found/i.test(bodyText);
  const hasQuoteSignals =
    /quote received|current plan|renewal plan/i.test(bodyText) ||
    (/carrier/i.test(bodyText) && /\$[\d,]+/.test(bodyText));

  const pass = !noQuotesAvailable && !noPlanOptions && (hasQuoteSignals || /#gridInit\//.test(url));

  return {
    pass,
    url,
    noQuotesAvailable,
    noPlanOptions,
    hasQuoteSignals,
    failReason: noQuotesAvailable
      ? 'Body contains "no quotes available"'
      : noPlanOptions
        ? 'No medical plan options / incomplete RFP builder state'
        : !hasQuoteSignals
          ? 'Quotes tab loaded but no carrier/quote content detected'
          : null,
  };
}

async function configureToMarketRfpWizard(page) {
  const rfpTable = page.locator('#pending-active-pastDue-rfp-table');
  const draftLink = rfpTable.locator('a[href*="#rfpBuilderBasics"]').first();
  await draftLink.click();
  await page.waitForURL(/#rfpBuilderBasics/, { timeout: 30000 });
  await waitForPageReady(page);

  // Step 2: Benefit Types — Marketing-only Medical + Dental
  await page.getByRole('link', { name: 'Benefit Types', exact: true }).click();
  await page.waitForURL(/#rfpBuilderPlanTypes/, { timeout: 30000 });

  await page.locator('input[name="planTypeMedicalIssued"]').uncheck();
  await page.locator('input[name="planTypeDentalIssued"]').uncheck();
  await page.locator('input[name="planTypeMedical"]').check();
  await page.locator('input[name="planTypeDental"]').check();

  // Step 5: Save benefit types
  await page.getByRole('button', { name: 'Save & Continue' }).click();
  await sleep(2000);

  // Step 3: Community Rated — non-ACA current, explore ACA/community rates
  const communityRatedLink = page.getByRole('link', { name: 'Community Rated', exact: true });
  if ((await communityRatedLink.count()) > 0) {
    await communityRatedLink.click();
    await page.waitForURL(/#rfpBuilderCommunityRatedPlans/, { timeout: 30000 });
    await page.locator('.medicalACACurrentPlans-container .option-label', { hasText: 'No' }).click();
    await page.locator('.medicalACAPlans-container .option-label', { hasText: 'Yes' }).click();
    await page.getByRole('button', { name: 'Save & Continue' }).click();
    await sleep(2000);
  }

  // Step 4: Skip census / documents upload
  await page.getByRole('link', { name: 'RFP Quoting Documents', exact: true }).click();
  await page.waitForURL(/#rfpBuilderDocuments/, { timeout: 30000 });
  await page.getByRole('button', { name: 'Save & Continue' }).click();
}

async function runPs8919Flow() {
  if (!authStateMatchesBaseUrl(BASE_URL)) {
    console.error(`Auth state at ${AUTH_STATE_PATH} does not match ${BASE_URL}`);
    process.exit(1);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: process.env.HEADED !== '1' });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    storageState: AUTH_STATE_PATH,
  });
  const page = await context.newPage();

  const report = {
    jiraTickets: ['PS-8882', 'PS-8919'],
    baseUrl: BASE_URL,
    rfpName: RFP_NAME,
    timestamp: new Date().toISOString(),
    steps: {},
  };

  try {
    const valid = await sessionIsValid(page, BASE_URL);
    if (!valid) {
      throw new Error('Saved auth session expired — re-run login automation for jeff');
    }
    report.steps.dashboard = { url: page.url(), pass: true };

    await navigateToEmployers(page);
    report.steps.employers = { url: page.url(), pass: true };

    await openAceTestingEmployer(page);
    report.steps.employer = { url: page.url(), pass: true };

    if (RUN_WIZARD) {
      await configureToMarketRfpWizard(page);
      report.steps.wizard = { url: page.url(), pass: true };
    }

    await openMarketResponseRfp(page, RFP_NAME);
    report.steps.marketResponse = { url: page.url(), pass: true };

    await openQuotesTab(page);
    report.steps.quotesTab = { url: page.url(), pass: true };

    const quotesCheck = await verifyQuotesAvailable(page);
    report.steps.quotesVerification = quotesCheck;
    report.pass = quotesCheck.pass;

    const screenshotPath = path.join(OUTPUT_DIR, 'ps-8919-quotes-verification.png');
    await page.screenshot({ path: screenshotPath, fullPage: false });
    report.screenshotPath = screenshotPath;

    const reportPath = path.join(OUTPUT_DIR, 'ps-8919-automation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`Quotes verification: ${quotesCheck.pass ? 'PASS' : 'FAIL'}`);
    if (quotesCheck.failReason) {
      console.log(`Reason: ${quotesCheck.failReason}`);
    }
    console.log(`URL: ${quotesCheck.url}`);
    console.log(`Report: ${reportPath}`);

    if (!quotesCheck.pass) {
      process.exit(1);
    }
  } finally {
    await browser.close();
  }
}

runPs8919Flow().catch((error) => {
  console.error('PS-8919 automation failed:', error.message);
  process.exit(1);
});

module.exports = {
  openAceTestingEmployer,
  openMarketResponseRfp,
  openQuotesTab,
  verifyQuotesAvailable,
  configureToMarketRfpWizard,
  ACE_TESTING_GROUP_ID,
  DEFAULT_RFP_IDS,
};
