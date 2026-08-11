const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { AUTH_STATE_PATH, sessionIsValid, waitForPageReady } = require('./lib/plansight-login');

const BASE_URL = 'https://jeff.plansight.com';
const SHADYBROOK = `${BASE_URL}/group/QJTbWHW9aoWhyKuwtGnBd8thjcs/vVi3pQjveGO4O7BIfu6YqyPcmsQ`;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 }, storageState: AUTH_STATE_PATH });
  const page = await context.newPage();

  await sessionIsValid(page, BASE_URL);

  const hashes = [
    '#rfpBuilderCommunityRated?continue=1&noRedirect=1',
    '#rfpBuilderCommunityRated',
    '#rfpBuilderCensus?continue=1&noRedirect=1',
    '#rfpBuilderCensus',
    '#communityRated',
    '#census',
  ];

  const report = [];
  for (const hash of hashes) {
    await page.goto(`${SHADYBROOK}${hash}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForPageReady(page);
    await page.waitForTimeout(2500);
    const bodyText = await page.locator('body').innerText();
    const sidebar = await page.locator('a[href*="rfpBuilder"], a[href*="Community"], a[href*="Census"]').evaluateAll((els) =>
      els.map((el) => ({ text: (el.textContent || '').trim(), href: el.getAttribute('href') })),
    );
    report.push({
      hash,
      finalUrl: page.url(),
      sidebar,
      bodySnippet: bodyText.slice(0, 6000),
      acaHits: bodyText.match(/aca|non.?aca|community rated|explore.*rate|grandfather|current non/gi),
    });
    await page.screenshot({ path: path.join('/workspace/automation-output', `ps-8919-hash-${hash.replace(/\W+/g, '-')}.png`), fullPage: true });
  }

  fs.writeFileSync('/workspace/automation-output/ps-8919-community-rated-scan.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

main();
