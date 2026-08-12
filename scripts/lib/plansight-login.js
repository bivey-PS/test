const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', '..', 'automation-output');
const AUTH_STATE_PATH = path.join(OUTPUT_DIR, 'auth-state.json');

function getAuthStatePathForBaseUrl(baseUrl) {
  const hostname = new URL(baseUrl).hostname.replace(/\./g, '-');
  return path.join(OUTPUT_DIR, `auth-state-${hostname}.json`);
}

function authStateMatchesBaseUrl(baseUrl, authStatePath = AUTH_STATE_PATH) {
  if (!fs.existsSync(authStatePath)) {
    return false;
  }

  try {
    const authState = JSON.parse(fs.readFileSync(authStatePath, 'utf8'));
    const baseHost = new URL(baseUrl).hostname;

    const originMatch = authState.origins?.some((origin) => {
      try {
        return new URL(origin.origin).hostname === baseHost;
      } catch {
        return false;
      }
    });

    if (originMatch) {
      return true;
    }

    return authState.cookies?.some((cookie) => {
      const domain = cookie.domain?.replace(/^\./, '');
      return domain === baseHost || baseHost.endsWith(`.${domain}`);
    });
  } catch {
    return false;
  }
}

async function saveAuthState(context, authStatePath = AUTH_STATE_PATH) {
  fs.mkdirSync(path.dirname(authStatePath), { recursive: true });
  await context.storageState({ path: authStatePath });
  console.log(`Saved auth session: ${authStatePath}`);
}

function isLoggedIn(url) {
  const hostname = typeof url === 'string' ? new URL(url).hostname : url.hostname;
  return hostname.includes('plansight.com') && !hostname.includes('devauth');
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

async function ensureRememberDeviceChecked(page) {
  const rememberDevice = page.locator('#rememberBrowser');
  await rememberDevice.waitFor({ state: 'visible', timeout: 15000 });

  if (!(await rememberDevice.isChecked())) {
    await rememberDevice.check({ force: true });
  }

  if (!(await rememberDevice.isChecked())) {
    const label = page.locator('label[for="rememberBrowser"]');
    if (await label.isVisible()) {
      await label.click({ force: true });
    }
  }

  if (!(await rememberDevice.isChecked())) {
    throw new Error(
      '"Remember this device for 30 days" checkbox is not checked — cannot skip MFA on future runs.',
    );
  }

  console.log('Verified "Remember this device for 30 days" is checked');
}

async function completeMfa(page, mfaCode) {
  if (!page.url().includes('/u/mfa-sms-challenge')) {
    return;
  }

  if (!mfaCode) {
    throw new Error(
      'SMS verification required. Provide MFA_CODE=123456 to complete login.',
    );
  }

  await page.locator('#code').fill(mfaCode);
  await ensureRememberDeviceChecked(page);

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

async function sessionIsValid(page, baseUrl) {
  const dashboardUrl = `${baseUrl.replace(/\/$/, '')}/app#dashboard`;

  try {
    await page.goto(dashboardUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    if (!isLoggedIn(page.url())) {
      return false;
    }

    await page.getByText(/Welcome .+/).waitFor({ timeout: 15000 });
    return true;
  } catch {
    return false;
  }
}

async function ensureLoggedIn(page, context, { baseUrl, username, password, mfaCode, authStatePath }) {
  if (await sessionIsValid(page, baseUrl)) {
    console.log('Reusing saved session — MFA not required');
    return { reusedSession: true };
  }

  console.log('Saved session unavailable or expired — performing login');
  await login(page, { baseUrl, username, password, mfaCode });

  if (context) {
    await saveAuthState(context, authStatePath || AUTH_STATE_PATH);
  }

  return { reusedSession: false };
}

async function login(page, { baseUrl, username, password, mfaCode }) {
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 60000 });

  await page.waitForURL(/\/u\/login\/identifier/, { timeout: 30000 });
  console.log('On login identifier page');

  await page.locator('#username').fill(username);
  await clickContinue(page);
  await waitForAuthStep(page, /\/u\/login\/password/);

  console.log('On login password page');

  await page.locator('#password').fill(password);
  await clickContinue(page);

  if (page.url().includes('/u/login/password')) {
    await waitForAuthStep(page, /\/u\/(mfa-sms-challenge|login\/)/, 30000);
  }

  if (page.url().includes('/u/mfa-sms-challenge')) {
    console.log('On SMS MFA challenge page');
    await completeMfa(page, mfaCode);
  }

  if (!isLoggedIn(page.url())) {
    await page.waitForURL((url) => isLoggedIn(url), { timeout: 30000 });
  }
}

async function verifyDashboard(page, baseUrl) {
  const dashboardUrl = `${baseUrl.replace(/\/$/, '')}/app#dashboard`;

  if (!page.url().includes('#dashboard')) {
    await page.goto(dashboardUrl, { waitUntil: 'networkidle', timeout: 60000 });
  }

  console.log('Verifying dashboard');

  const welcome = page.getByText(/Welcome .+/);
  await welcome.waitFor({ timeout: 30000 });
  const welcomeText = (await welcome.first().textContent())?.trim();

  for (const label of ['Renewals', 'Draft RFPs', 'Active RFPs', 'Past Due RFPs']) {
    await page.getByText(label, { exact: true }).first().waitFor({ timeout: 15000 });
  }

  const activeRfpsTab = page.getByText('Active RFPs', { exact: true }).first();
  await activeRfpsTab.click();

  await page.getByRole('button', { name: 'Add Filter' }).waitFor({ timeout: 15000 });

  const screenshotPath = path.join(OUTPUT_DIR, 'dashboard.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`Saved dashboard screenshot: ${screenshotPath}`);

  return {
    welcomeText,
    dashboardUrl: page.url(),
    screenshotPath,
  };
}

async function navigateToEmployers(page) {
  console.log('Clicking Employers in sidebar');

  const sidebar = page.locator('.sidebar-collapse');
  await sidebar.waitFor({ timeout: 15000 });

  const employersLink = sidebar.locator('li.employers a');
  await employersLink.click();

  await page.waitForURL(/#groupList/, { timeout: 30000 });
  await page.getByText('All Employers').waitFor({ timeout: 15000 });
  await page.getByRole('columnheader', { name: 'Employer' }).waitFor({ timeout: 30000 });
  await page.locator('table tbody tr').first().waitFor({ timeout: 30000 });

  const screenshotPath = path.join(OUTPUT_DIR, 'employers.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`Saved employers screenshot: ${screenshotPath}`);

  return {
    employersUrl: page.url(),
    screenshotPath,
  };
}

async function waitForPageReady(page, timeout = 60000) {
  const loading = page.getByText('Loading...');
  if ((await loading.count()) > 0) {
    await loading.first().waitFor({ state: 'hidden', timeout }).catch(() => {});
  }

  await page.waitForLoadState('networkidle', { timeout }).catch(() => {});
}

async function openAceTestingEmployer(page) {
  console.log('Waiting for employers table to populate');

  await page.getByRole('link', { name: 'Ace Testing', exact: true }).waitFor({
    timeout: 30000,
  });

  const employerLink = page.locator('table').getByRole('link', {
    name: 'Ace Testing',
    exact: true,
  });
  await employerLink.scrollIntoViewIfNeeded();
  await employerLink.evaluate((element) => element.click());

  await page.waitForURL(/\/group\/.*#groupUpdate/, { timeout: 30000 });
  await waitForPageReady(page);
  await page.getByText('About This Employer').waitFor({ timeout: 60000 });

  const screenshotPath = path.join(OUTPUT_DIR, 'ace-testing-employer.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`Saved Ace Testing employer screenshot: ${screenshotPath}`);

  return {
    employerUrl: page.url(),
    employerName: 'Ace Testing',
    screenshotPath,
  };
}

async function openEmployerGroup(page, employerName = 'Ace Testing') {
  console.log(`Opening employer group: ${employerName}`);

  await page.getByRole('link', { name: employerName, exact: true }).waitFor({
    timeout: 30000,
  });

  const employerLink = page.locator('table').getByRole('link', {
    name: employerName,
    exact: true,
  });
  await employerLink.scrollIntoViewIfNeeded();
  await employerLink.evaluate((element) => element.click());

  await page.waitForURL(/\/group\/.*#groupUpdate/, { timeout: 30000 });
  await waitForPageReady(page);
  await page.getByText('About This Employer').waitFor({ timeout: 60000 });

  const screenshotSlug = employerName.toLowerCase().replace(/\s+/g, '-');
  const screenshotPath = path.join(OUTPUT_DIR, `${screenshotSlug}-employer.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`Saved ${employerName} employer screenshot: ${screenshotPath}`);

  return {
    employerUrl: page.url(),
    employerName,
    screenshotPath,
  };
}

async function startNewRfpBasicsTab(page) {
  console.log('Starting new RFP from employer group');

  const rfpTable = page.locator('#pending-active-pastDue-rfp-table');
  await rfpTable.waitFor({ timeout: 30000 });
  await rfpTable.locator('tbody tr').first().waitFor({ timeout: 30000 });

  const startRfpButton = page
    .getByRole('button', { name: /Start RFP/i })
    .or(page.locator('button, a').filter({ hasText: /^Start RFP/i }));

  if (await startRfpButton.first().isVisible().catch(() => false)) {
    await startRfpButton.first().scrollIntoViewIfNeeded();
    await startRfpButton.first().click();

    const startNewRfp = page
      .getByRole('menuitem', { name: /Start New RFP/i })
      .or(page.getByRole('link', { name: /Start New RFP/i }))
      .or(page.locator('a, button, li').filter({ hasText: /^Start New RFP$/i }));

    await startNewRfp.first().waitFor({ state: 'visible', timeout: 10000 });
    await startNewRfp.first().click();
  } else {
    const openWizard = rfpTable.getByRole('link', { name: 'Open RFP Wizard', exact: true }).first();
    if ((await openWizard.count()) > 0) {
      await openWizard.scrollIntoViewIfNeeded();
      await openWizard.evaluate((element) => element.click());
    } else {
      const draftBasics = rfpTable.locator('a[href*="#rfpBuilderBasics"]').first();
      await draftBasics.waitFor({ state: 'attached', timeout: 30000 });
      await draftBasics.evaluate((element) => element.click());
    }
  }

  await page.waitForURL(/#rfpBuilderBasics/, { timeout: 60000 });
  await waitForPageReady(page, 120000);

  const loading = page.getByText('Loading...');
  if ((await loading.count()) > 0) {
    await loading.first().waitFor({ state: 'hidden', timeout: 120000 }).catch(() => {});
  }

  if (!page.url().includes('#rfpBuilderBasics')) {
    throw new Error('Basics wizard URL did not load after Start New RFP');
  }

  const basicsMarkers = [
    page.locator('label').filter({ hasText: /RFP Name/i }),
    page.locator('label').filter({ hasText: /Effective Date/i }),
    page.getByText(/Plan Design Attributes Template/i),
    page.locator('.wizard-nav, .rfp-wizard-nav, .nav-tabs, .sidebar-collapse').getByText(/RFP Basics/i),
  ];

  let basicsFound = page.url().includes('#rfpBuilderBasics');
  for (const marker of basicsMarkers) {
    if ((await marker.count()) > 0 && (await marker.first().isVisible().catch(() => false))) {
      basicsFound = true;
      break;
    }
  }

  if (!basicsFound) {
    throw new Error('Basics tab or Basics wizard fields did not appear after Start New RFP');
  }

  const screenshotPath = path.join(OUTPUT_DIR, 'ps-9250-rfp-wizard-basics.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`Saved RFP wizard Basics screenshot: ${screenshotPath}`);

  return {
    wizardUrl: page.url(),
    screenshotPath,
  };
}

async function clickSaveAndContinue(page, expectedUrlPattern) {
  const saveButton = page.getByRole('button', { name: 'Save & Continue' });
  await saveButton.waitFor({ state: 'visible', timeout: 30000 });
  await saveButton.scrollIntoViewIfNeeded();
  await saveButton.click();

  if (expectedUrlPattern) {
    await page.waitForURL(expectedUrlPattern, { timeout: 60000 });
  }

  await waitForPageReady(page);
}

async function saveRfpBasicsAndContinue(page) {
  console.log('Saving RFP Basics and continuing');

  if (!page.url().includes('#rfpBuilderBasics')) {
    throw new Error('Expected to be on RFP Basics wizard step');
  }

  await clickSaveAndContinue(page, /#rfpBuilderPlanTypes/);

  if (!page.url().includes('#rfpBuilderPlanTypes')) {
    throw new Error('Did not navigate to Choose Benefit Types after saving RFP Basics');
  }

  const screenshotPath = path.join(OUTPUT_DIR, 'ps-9250-rfp-wizard-benefit-types.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`Saved Benefit Types screenshot: ${screenshotPath}`);

  return {
    wizardUrl: page.url(),
    screenshotPath,
  };
}

async function selectMedicalMarketingBenefitType(page) {
  console.log('Selecting Medical in Marketing column on Benefit Types');

  if (!page.url().includes('#rfpBuilderPlanTypes')) {
    throw new Error('Expected to be on Choose Benefit Types wizard step');
  }

  const medicalMarketing = page.locator('input[name="planTypeMedical"]');
  await medicalMarketing.waitFor({ state: 'attached', timeout: 30000 });

  if (!(await medicalMarketing.isChecked())) {
    await medicalMarketing.check({ force: true });
  }

  if (!(await medicalMarketing.isChecked())) {
    throw new Error('Medical Marketing checkbox did not become checked');
  }

  console.log('Verified Medical Marketing checkbox is checked');
}

async function saveBenefitTypesAndContinue(page) {
  console.log('Saving Benefit Types and continuing');

  await selectMedicalMarketingBenefitType(page);
  await clickSaveAndContinue(page, /#rfpBuilderCommunityRatedPlans/);

  if (!page.url().includes('#rfpBuilderCommunityRatedPlans')) {
    throw new Error('Did not navigate to Community Rated Plans after saving Benefit Types');
  }

  const screenshotPath = path.join(OUTPUT_DIR, 'ps-9250-rfp-wizard-community-rated.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`Saved Community Rated Plans screenshot: ${screenshotPath}`);

  return {
    wizardUrl: page.url(),
    screenshotPath,
  };
}

async function saveCommunityRatedPlansAndContinue(page) {
  console.log('Saving Community Rated Plans and continuing');

  if (!page.url().includes('#rfpBuilderCommunityRatedPlans')) {
    throw new Error('Expected to be on Community Rated Plans wizard step');
  }

  await clickSaveAndContinue(page, /#rfpBuilderDocuments/);

  if (!page.url().includes('#rfpBuilderDocuments')) {
    throw new Error('Did not navigate to RFP Quoting Documents after saving Community Rated Plans');
  }

  const screenshotPath = path.join(OUTPUT_DIR, 'ps-9250-rfp-wizard-documents.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`Saved RFP Quoting Documents screenshot: ${screenshotPath}`);

  return {
    wizardUrl: page.url(),
    screenshotPath,
  };
}

async function saveDocumentsForCarrierQuotingAndContinue(page) {
  console.log('Saving Documents for Carrier Quoting and continuing');

  if (!page.url().includes('#rfpBuilderDocuments')) {
    throw new Error('Expected to be on Documents for Carrier Quoting wizard step');
  }

  await clickSaveAndContinue(page, /#rfpBuilderPlanDetails/);

  if (!page.url().includes('#rfpBuilderPlanDetails')) {
    throw new Error(
      'Did not navigate to Verify Plan Details after saving Documents for Carrier Quoting',
    );
  }

  const screenshotPath = path.join(OUTPUT_DIR, 'ps-9250-rfp-wizard-plan-details.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`Saved Verify Plan Details screenshot: ${screenshotPath}`);

  return {
    wizardUrl: page.url(),
    screenshotPath,
  };
}

async function openShadybrookLumberRfp(page) {
  console.log('Waiting for Request for Proposals section to load');

  const rfpTable = page.locator('#pending-active-pastDue-rfp-table');
  await rfpTable.waitFor({ timeout: 30000 });
  await rfpTable.locator('tbody tr').first().waitFor({ timeout: 30000 });

  const rfpHeader = page.getByText('Request for Proposals');
  if (await rfpHeader.count()) {
    await rfpHeader.first().waitFor({ timeout: 15000 });
  }

  const shadybrookLink = rfpTable.locator('a[href*="#marketResponse"]').filter({
    has: page.locator('.name', { hasText: 'Shadybrook Lumber' }),
  });
  await shadybrookLink.first().waitFor({ timeout: 30000 });
  await shadybrookLink.first().scrollIntoViewIfNeeded();
  await shadybrookLink.first().evaluate((element) => element.click());

  await page.waitForURL(/#marketResponse/, { timeout: 30000 });
  await page.getByText('Shadybrook Lumber').first().waitFor({ timeout: 15000 });
  await page.getByText('Market Response').first().waitFor({ timeout: 15000 });

  const screenshotPath = path.join(OUTPUT_DIR, 'shadybrook-lumber-rfp.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`Saved Shadybrook Lumber RFP screenshot: ${screenshotPath}`);

  return {
    rfpUrl: page.url(),
    rfpName: 'Shadybrook Lumber',
    screenshotPath,
  };
}

async function openQuotesTab(page) {
  console.log('Clicking Quotes tab');

  await page.getByText('Shadybrook Lumber').first().waitFor({ timeout: 15000 });

  const quotesTab = page
    .locator('.group-nav-tabs-container')
    .getByRole('link', { name: 'Quotes', exact: true });
  await quotesTab.waitFor({ timeout: 15000 });
  await quotesTab.click();

  await page.waitForURL(/#gridInit\/medical/, { timeout: 30000 });
  await page.locator('a[href*="#gridInit/medical"]').first().waitFor({ timeout: 30000 });

  const screenshotPath = path.join(OUTPUT_DIR, 'shadybrook-quotes.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`Saved Quotes tab screenshot: ${screenshotPath}`);

  return {
    quotesUrl: page.url(),
    screenshotPath,
  };
}

async function openCancerTab(page) {
  console.log('Clicking Cancer tab');

  const medicalTab = page.locator('a[href*="#gridInit/medical"]');
  await medicalTab.first().waitFor({ timeout: 30000 });

  const cancerTab = page.locator('a[href*="#gridInit/cancer"]');
  await cancerTab.first().waitFor({ state: 'visible', timeout: 90000 });
  await cancerTab.first().click();

  await page.waitForURL(/#gridInit\/cancer/, { timeout: 30000 });
  await page.locator('.subnav-tab.cancer.active-tab').waitFor({ timeout: 15000 });

  console.log('Waiting 3 seconds on Cancer page');
  await page.waitForTimeout(3000);

  const screenshotPath = path.join(OUTPUT_DIR, 'shadybrook-cancer-quotes.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`Saved Cancer tab screenshot: ${screenshotPath}`);

  return {
    cancerQuotesUrl: page.url(),
    screenshotPath,
  };
}

const BENEFITS_PLAN_GROUP_ROWS = [
  { label: 'Reconstructive Surgery', cssKey: 'reconstructiveSurgery' },
  { label: 'Experimental Treatment', cssKey: 'experimentalTreatment' },
  { label: 'ICU Benefit', cssKey: 'icuBenefit' },
  { label: 'Anti-Nausea Meds', cssKey: 'antiNauseaMeds' },
  { label: 'Transportation', cssKey: 'transportation' },
  { label: 'Ambulance', cssKey: 'ambulance' },
  { label: 'Lodging', cssKey: 'lodging', alternatives: ['Loging'] },
];

async function waitForCancerBenefitsGrid(page, timeout = 60000) {
  await page.locator('.ibox-title-plansight').filter({ hasText: 'Plan Group' }).first().waitFor({
    timeout,
  });
  await page.locator('.plansight-sub-row-benefits-reconstructiveSurgery').first().waitFor({
    timeout,
  });
}

async function findBenefitRow(page, { label, cssKey, alternatives = [] }) {
  const selector = `.plansight-sub-row-benefits-${cssKey}`;
  const row = page.locator(selector).first();

  if ((await row.count()) > 0) {
    await row.scrollIntoViewIfNeeded();
    const text = (await row.textContent())?.trim();
    if (text) {
      return text;
    }
  }

  const names = [label, ...alternatives];
  for (const name of names) {
    const textRow = page.getByText(name, { exact: true }).first();
    if ((await textRow.count()) > 0) {
      await textRow.scrollIntoViewIfNeeded();
      if (await textRow.isVisible()) {
        return name;
      }
    }
  }

  return null;
}

async function verifyBenefitsPlanGroupRows(page) {
  console.log('Verifying Benefits Plan Group rows');

  await page.waitForTimeout(2000);
  await waitForCancerBenefitsGrid(page);

  const rowResults = [];
  const verifiedRows = [];
  const missingRows = [];

  for (const row of BENEFITS_PLAN_GROUP_ROWS) {
    console.log(`Checking row: ${row.label}`);
    const foundAs = await findBenefitRow(page, row);

    const found = Boolean(foundAs);
    rowResults.push({
      rowName: row.label,
      found,
      matchedAs: foundAs,
      searchedNames: [row.label, ...(row.alternatives || [])],
      cssSelector: `.plansight-sub-row-benefits-${row.cssKey}`,
    });

    if (found) {
      verifiedRows.push(foundAs);
      console.log(`Verified row: ${foundAs}`);
    } else {
      missingRows.push(row.label);
      console.log(`Missing row: ${row.label}`);
    }
  }

  const report = {
    verified: missingRows.length === 0,
    summary: {
      total: rowResults.length,
      found: verifiedRows.length,
      missing: missingRows.length,
    },
    rows: rowResults,
    verifiedRows,
    missingRows,
  };

  saveBenefitsVerificationReport(report, page.url());

  return report;
}

function saveBenefitsVerificationReport(report, pageUrl, baseUrl = process.env.BASE_URL) {
  const timestamp = new Date().toISOString();
  const jsonReport = {
    jiraTicket: process.env.JIRA_TICKET || null,
    baseUrl: baseUrl || null,
    pageUrl,
    timestamp,
    summary: report.summary,
    verified: report.verified,
    rows: report.rows,
  };

  const jsonPath = path.join(OUTPUT_DIR, 'benefits-verification-report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
  console.log(`Saved benefits verification report: ${jsonPath}`);

  const markdownLines = [
    '# Benefits Plan Group Verification Report',
    '',
    `- **Jira Ticket:** ${process.env.JIRA_TICKET || 'n/a'}`,
    `- **Base URL:** ${baseUrl || 'n/a'}`,
    `- **Page URL:** ${pageUrl}`,
    `- **Timestamp:** ${timestamp}`,
    `- **Result:** ${report.verified ? 'PASS' : 'FAIL'}`,
    `- **Summary:** ${report.summary.found}/${report.summary.total} rows found`,
    '',
    '| Row | Status | Matched As | Searched Names |',
    '| --- | --- | --- | --- |',
  ];

  for (const row of report.rows) {
    markdownLines.push(
      `| ${row.rowName} | ${row.found ? 'FOUND' : 'NOT FOUND'} | ${row.matchedAs || '-'} | ${row.searchedNames.join(', ')} |`,
    );
  }

  if (report.missingRows.length > 0) {
    markdownLines.push('', '## Missing Rows', '');
    for (const rowName of report.missingRows) {
      markdownLines.push(`- ${rowName}`);
    }
  }

  const markdownPath = path.join(OUTPUT_DIR, 'benefits-verification-report.md');
  fs.writeFileSync(markdownPath, `${markdownLines.join('\n')}\n`);
  console.log(`Saved benefits verification report: ${markdownPath}`);

  return {
    jsonPath,
    markdownPath,
  };
}

async function verifyReconstructiveSurgeryBenefit(page) {
  return verifyBenefitsPlanGroupRows(page);
}

async function saveRecording(page, outputName = 'login-recording') {
  const video = page.video();
  if (!video) {
    return null;
  }

  if (!page.isClosed()) {
    await page.close();
  }

  const webmPath = await video.path();
  const mp4Path = path.join(OUTPUT_DIR, `${outputName}.mp4`);

  const { execSync } = require('child_process');
  execSync(
    `ffmpeg -y -i "${webmPath}" -c:v libx264 -pix_fmt yuv420p "${mp4Path}"`,
    { stdio: 'ignore' },
  );

  console.log(`Saved recording: ${mp4Path}`);
  return mp4Path;
}

module.exports = {
  OUTPUT_DIR,
  AUTH_STATE_PATH,
  getAuthStatePathForBaseUrl,
  isLoggedIn,
  authStateMatchesBaseUrl,
  saveAuthState,
  ensureRememberDeviceChecked,
  sessionIsValid,
  ensureLoggedIn,
  login,
  verifyDashboard,
  navigateToEmployers,
  openAceTestingEmployer,
  openEmployerGroup,
  startNewRfpBasicsTab,
  saveRfpBasicsAndContinue,
  selectMedicalMarketingBenefitType,
  saveBenefitTypesAndContinue,
  saveCommunityRatedPlansAndContinue,
  saveDocumentsForCarrierQuotingAndContinue,
  openShadybrookLumberRfp,
  openQuotesTab,
  openCancerTab,
  verifyBenefitsPlanGroupRows,
  verifyReconstructiveSurgeryBenefit,
  saveBenefitsVerificationReport,
  saveRecording,
};
