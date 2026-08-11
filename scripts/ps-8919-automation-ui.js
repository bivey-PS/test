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
  saveRecording,
} = require('./lib/plansight-login');
const { evaluateQuotesAvailability } = require('./lib/quotes-availability');
const { shouldRunWizard } = require('./lib/run-wizard');

const BASE_URL = process.env.BASE_URL || 'https://jeff.plansight.com';
const JIRA_TICKET = process.env.JIRA_TICKET || 'PS-8919';
// Opt-in only. Defaulting to on (RUN_WIZARD !== '0') permanently mutates the
// first draft RFP via Save & Continue — use automate:ps8919:wizard instead.
const RUN_WIZARD = shouldRunWizard(process.env.RUN_WIZARD);
const RFP_NAME = process.env.RFP_NAME || 'Shadybrook Lumber';
const PAUSE_MS = Number(process.env.PAUSE_MS || 1500);
const HEADED = process.env.HEADED === '1';

const ACE_TESTING_GROUP_ID = 'QJTbWHW9aoWhyKuwtGnBd8thjcs';
const DEFAULT_RFP_IDS = {
  'Shadybrook Lumber': 'vVi3pQjveGO4O7BIfu6YqyPcmsQ',
  'Laradon Hall - Test2': 'MSWuetXoCltq2duitykWFIjWA4s',
  'Fleet Master - Test 5': 'ehLrZwcsmN6l8h2U8xkXlD7iJIA',
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pauseForRecording(page, label) {
  console.log(label);
  await sleep(PAUSE_MS);
  if (HEADED) {
    await page.waitForTimeout(500);
  }
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
  return evaluateQuotesAvailability(bodyText, page.url());
}

async function configureToMarketRfpWizard(page) {
  const rfpTable = page.locator('#pending-active-pastDue-rfp-table');
  const draftLink = rfpTable.locator('a[href*="#rfpBuilderBasics"]').first();
  await pauseForRecording(page, 'Step 1: Opening RFP wizard (draft RFP)');
  await draftLink.click();
  await page.waitForURL(/#rfpBuilderBasics/, { timeout: 30000 });
  await waitForPageReady(page);
  await pauseForRecording(page, 'On RFP Basics page');

  await page.getByRole('link', { name: 'Benefit Types', exact: true }).click();
  await page.waitForURL(/#rfpBuilderPlanTypes/, { timeout: 30000 });
  await pauseForRecording(page, 'Step 2: Benefit Types — selecting Medical + Dental (market only)');

  await page.locator('input[name="planTypeMedicalIssued"]').uncheck();
  await page.locator('input[name="planTypeDentalIssued"]').uncheck();
  await page.locator('input[name="planTypeMedical"]').check();
  await page.locator('input[name="planTypeDental"]').check();
  await pauseForRecording(page, 'Medical and Dental benefit types selected');

  await page.getByRole('button', { name: 'Save & Continue' }).click();
  await waitForPageReady(page);
  await pauseForRecording(page, 'Step 5: Benefit types saved');

  const communityRatedLink = page.getByRole('link', { name: 'Community Rated', exact: true });
  if ((await communityRatedLink.count()) > 0) {
    await communityRatedLink.click();
    await page.waitForURL(/#rfpBuilderCommunityRatedPlans/, { timeout: 30000 });
    await pauseForRecording(page, 'Step 3: Community Rated — non-ACA current, explore ACA rates');
    await page.locator('.medicalACACurrentPlans-container .option-label', { hasText: 'No' }).click();
    await page.locator('.medicalACAPlans-container .option-label', { hasText: 'Yes' }).click();
    await pauseForRecording(page, 'ACA exploration options set');
    await page.getByRole('button', { name: 'Save & Continue' }).click();
    await waitForPageReady(page);
  }

  await page.getByRole('link', { name: 'RFP Quoting Documents', exact: true }).click();
  await page.waitForURL(/#rfpBuilderDocuments/, { timeout: 30000 });
  await pauseForRecording(page, 'Step 4: Skipping census upload');
  await page.getByRole('button', { name: 'Save & Continue' }).click();
  await waitForPageReady(page);
  await pauseForRecording(page, 'Documents step saved without census');
}

async function returnToEmployerRfpList(page) {
  const employerUrl = new URL(page.url());
  employerUrl.hash = 'groupUpdate';
  await page.goto(employerUrl.toString());
  await waitForPageReady(page);
  await page.locator('#pending-active-pastDue-rfp-table').waitFor({ timeout: 30000 });
}

async function runPs8919Flow() {
  if (!authStateMatchesBaseUrl(BASE_URL)) {
    console.error(`Auth state at ${AUTH_STATE_PATH} does not match ${BASE_URL}`);
    process.exit(1);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: !HEADED,
    slowMo: HEADED ? 300 : 0,
  });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    storageState: AUTH_STATE_PATH,
    recordVideo: HEADED
      ? { dir: OUTPUT_DIR, size: { width: 1400, height: 900 } }
      : undefined,
  });
  const page = await context.newPage();

  const report = {
    jiraTicket: JIRA_TICKET,
    jiraTickets: ['PS-8882', JIRA_TICKET],
    baseUrl: BASE_URL,
    rfpName: RFP_NAME,
    runWizard: RUN_WIZARD,
    timestamp: new Date().toISOString(),
    steps: {},
  };

  try {
    console.log(`Opening ${BASE_URL} (${JIRA_TICKET})`);
    const valid = await sessionIsValid(page, BASE_URL);
    if (!valid) {
      throw new Error('Saved auth session expired — re-run login automation for jeff');
    }
    report.steps.dashboard = { url: page.url(), pass: true };
    await pauseForRecording(page, 'Dashboard loaded');

    await navigateToEmployers(page);
    report.steps.employers = { url: page.url(), pass: true };
    await pauseForRecording(page, 'Employers page');

    await openAceTestingEmployer(page);
    report.steps.employer = { url: page.url(), pass: true };
    await pauseForRecording(page, 'Ace Testing employer page');

    if (RUN_WIZARD) {
      await configureToMarketRfpWizard(page);
      await returnToEmployerRfpList(page);
      report.steps.wizard = { url: page.url(), pass: true };
    }

    await pauseForRecording(page, 'Step 6: Opening Market Response');
    await openMarketResponseRfp(page, RFP_NAME);
    report.steps.marketResponse = { url: page.url(), pass: true };
    await pauseForRecording(page, 'Market Response page');

    await pauseForRecording(page, 'Step 7: Opening Quotes tab');
    await openQuotesTab(page);
    report.steps.quotesTab = { url: page.url(), pass: true };
    await pauseForRecording(page, 'Quotes tab loaded');

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

    if (HEADED) {
      await page.close();
      report.recordingPath = await saveRecording(page, 'ps-8919-ui-demo');
      console.log(`Saved UI recording: ${report.recordingPath}`);
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    }

    if (!quotesCheck.pass) {
      process.exit(1);
    }
  } catch (error) {
    if (HEADED) {
      await page.close().catch(() => {});
      await saveRecording(page, 'ps-8919-ui-demo-error').catch(() => {});
    }
    throw error;
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

module.exports = {
  openAceTestingEmployer,
  openMarketResponseRfp,
  openQuotesTab,
  evaluateQuotesAvailability,
  verifyQuotesAvailable,
  configureToMarketRfpWizard,
  returnToEmployerRfpList,
  ACE_TESTING_GROUP_ID,
  DEFAULT_RFP_IDS,
};

if (require.main === module) {
  runPs8919Flow().catch((error) => {
    console.error('PS-8919 automation failed:', error.message);
    process.exit(1);
  });
}
