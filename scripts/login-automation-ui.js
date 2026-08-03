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

const BASE_URL = process.env.BASE_URL || 'https://jeff.plansight.com';
const JIRA_TICKET = process.env.JIRA_TICKET || 'PS-8910';
const LOGIN_USERNAME = process.env.LOGIN_USERNAME || process.env.LOGIN_EMAIL;
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD;
const MFA_CODE = process.env.MFA_CODE;
const PAUSE_MS = Number(process.env.PAUSE_MS || 2000);
const RECORDING_NAME = process.env.RECORDING_NAME || `${JIRA_TICKET.toLowerCase()}-ui-demo`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pauseStep(page, label) {
  console.log(`\n=== ${label} ===`);
  await sleep(PAUSE_MS);
  await page.waitForTimeout(300);
}

async function scrollBenefitRowsForDisplay(page, rows) {
  for (const row of rows) {
    const selector = `.plansight-sub-row-benefits-${row.cssKey}`;
    const locator = page.locator(selector).first();
    if ((await locator.count()) > 0) {
      await locator.scrollIntoViewIfNeeded();
      await sleep(800);
    }
  }
}

function printTestResults(benefit) {
  const lines = [
    '',
    '='.repeat(72),
    `${JIRA_TICKET} — Cancer Benefits Verification Results`,
    '='.repeat(72),
    `Result: ${benefit.verified ? 'PASS' : 'FAIL'}`,
    `Summary: ${benefit.summary.found}/${benefit.summary.total} rows found`,
    '',
    '| Row | Status | Matched As |',
    '| --- | --- | --- |',
  ];

  for (const row of benefit.rows) {
    lines.push(
      `| ${row.rowName} | ${row.found ? 'FOUND' : 'NOT FOUND'} | ${row.matchedAs || '-'} |`,
    );
  }

  if (benefit.missingRows.length > 0) {
    lines.push('', 'Missing rows:', ...benefit.missingRows.map((r) => `- ${r}`));
  }

  lines.push('='.repeat(72));
  console.log(lines.join('\n'));
}

async function displayTestResultsInBrowser(page, benefit) {
  const rowsHtml = benefit.rows
    .map(
      (row) =>
        `<tr><td>${row.rowName}</td><td style="color:${row.found ? 'green' : 'red'};font-weight:bold">${row.found ? 'FOUND' : 'NOT FOUND'}</td><td>${row.matchedAs || '-'}</td></tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${JIRA_TICKET} Results</title>
<style>
body{font-family:system-ui,sans-serif;margin:40px;background:#f5f5f5}
.card{background:#fff;border-radius:8px;padding:24px;max-width:720px;box-shadow:0 2px 8px rgba(0,0,0,.1)}
h1{margin-top:0} .pass{color:green}.fail{color:red}
table{width:100%;border-collapse:collapse;margin-top:16px}
th,td{border:1px solid #ddd;padding:10px;text-align:left}
th{background:#1a7f7f;color:#fff}
</style></head><body>
<div class="card">
<h1>${JIRA_TICKET} Test Results</h1>
<p><strong>Ticket:</strong> Plan Attributes — Add Cancer benefits (7 items)</p>
<p><strong>Environment:</strong> ${BASE_URL}</p>
<p><strong>Result:</strong> <span class="${benefit.verified ? 'pass' : 'fail'}">${benefit.verified ? 'PASS' : 'FAIL'}</span></p>
<p><strong>Summary:</strong> ${benefit.summary.found}/${benefit.summary.total} benefit rows found</p>
<table><thead><tr><th>Benefit Row</th><th>Status</th><th>Matched As</th></tr></thead>
<tbody>${rowsHtml}</tbody></table>
<p style="margin-top:20px;color:#666;font-size:14px">Generated ${new Date().toISOString()}</p>
</div></body></html>`;

  const resultsPath = path.join(OUTPUT_DIR, `${JIRA_TICKET.toLowerCase()}-test-results.html`);
  fs.writeFileSync(resultsPath, html);
  await page.goto(`file://${resultsPath}`);
  await pauseStep(page, 'Displaying test results summary');
  console.log(`Results page: ${resultsPath}`);
  return resultsPath;
}

async function runPostLoginFlow(page) {
  await pauseStep(page, 'Step 3: Verifying dashboard after login');
  const dashboard = await verifyDashboard(page, BASE_URL);

  await pauseStep(page, 'Step 4: Navigating to Employers');
  const employers = await navigateToEmployers(page);

  await pauseStep(page, 'Step 5: Opening Ace Testing employer');
  const aceTesting = await openAceTestingEmployer(page);

  await pauseStep(page, 'Step 6: Opening Shadybrook Lumber RFP');
  const shadybrookRfp = await openShadybrookLumberRfp(page);

  await pauseStep(page, 'Step 7: Loading Quotes tab');
  const quotes = await openQuotesTab(page);

  await pauseStep(page, 'Step 8: Loading Cancer quotes and benefit data');
  const cancer = await openCancerTab(page);

  await scrollBenefitRowsForDisplay(page, [
    { cssKey: 'reconstructiveSurgery' },
    { cssKey: 'experimentalTreatment' },
    { cssKey: 'icuBenefit' },
    { cssKey: 'antiNauseaMeds' },
    { cssKey: 'transportation' },
    { cssKey: 'ambulance' },
    { cssKey: 'lodging' },
  ]);

  await pauseStep(page, 'Step 9: Verifying Cancer benefit rows (PS-8910)');
  const benefit = await verifyReconstructiveSurgeryBenefit(page);

  printTestResults(benefit);
  const resultsPath = await displayTestResultsInBrowser(page, benefit);

  const report = {
    jiraTicket: JIRA_TICKET,
    baseUrl: BASE_URL,
    timestamp: new Date().toISOString(),
    success: benefit.verified,
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
    },
    resultsHtml: resultsPath,
    reportJson: path.join(OUTPUT_DIR, 'benefits-verification-report.json'),
    reportMarkdown: path.join(OUTPUT_DIR, 'benefits-verification-report.md'),
  };

  const reportPath = path.join(OUTPUT_DIR, 'login-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Saved report: ${reportPath}`);

  return benefit;
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
    console.log(`\n=== Step 1: Opening application (${BASE_URL}) — ${JIRA_TICKET} ===`);
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await pauseStep(page, 'Application loaded');

    console.log('\n=== Step 2: Performing login / session validation ===');
    const loginResult = await ensureLoggedIn(page, context, {
      baseUrl: BASE_URL,
      username: LOGIN_USERNAME,
      password: LOGIN_PASSWORD,
      mfaCode: MFA_CODE,
      authStatePath: AUTH_STATE_PATH,
    });

    console.log(
      loginResult.reusedSession
        ? 'Login: reused saved session (MFA not required)'
        : 'Login: fresh login completed — auth session saved',
    );
    await pauseStep(page, loginResult.reusedSession ? 'Logged in via saved session' : 'Login completed with MFA');

    const benefit = await runPostLoginFlow(page);
    await saveAuthState(context, AUTH_STATE_PATH);

    await page.close();
    const recordingPath = await saveRecording(page, RECORDING_NAME);
    console.log(`\nSaved UI recording: ${recordingPath}`);

    if (!benefit.verified) {
      process.exitCode = 1;
    }
  } catch (error) {
    await page.close().catch(() => {});
    await saveRecording(page, `${RECORDING_NAME}-error`).catch(() => {});
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
