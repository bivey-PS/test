const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', '..', 'automation-output');

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

  const rememberDevice = page.locator('#rememberBrowser');
  if (await rememberDevice.isVisible()) {
    await rememberDevice.check({ force: true });
    console.log('Checked "Remember this device for 30 days"');
  }

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
  await page.getByText('About This Employer').waitFor({ timeout: 15000 });

  const screenshotPath = path.join(OUTPUT_DIR, 'ace-testing-employer.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`Saved Ace Testing employer screenshot: ${screenshotPath}`);

  return {
    employerUrl: page.url(),
    employerName: 'Ace Testing',
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
  await cancerTab.first().waitFor({ state: 'visible', timeout: 30000 });
  await cancerTab.first().click();

  await page.waitForURL(/#gridInit\/cancer/, { timeout: 30000 });
  await page.locator('.subnav-tab.cancer.active-tab').waitFor({ timeout: 15000 });

  console.log('Waiting 10 seconds on Cancer page');
  await page.waitForTimeout(10000);

  const screenshotPath = path.join(OUTPUT_DIR, 'shadybrook-cancer-quotes.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`Saved Cancer tab screenshot: ${screenshotPath}`);

  return {
    cancerQuotesUrl: page.url(),
    screenshotPath,
  };
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
  isLoggedIn,
  login,
  verifyDashboard,
  navigateToEmployers,
  openAceTestingEmployer,
  openShadybrookLumberRfp,
  openQuotesTab,
  openCancerTab,
  saveRecording,
};
