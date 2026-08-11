const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { AUTH_STATE_PATH, sessionIsValid, waitForPageReady } = require('./lib/plansight-login');

const BASE_URL = 'https://jeff.plansight.com';
const GROUP = 'QJTbWHW9aoWhyKuwtGnBd8thjcs';

const RFPS = [
  'CixRn3-IhGlvJJqkgQiWlMRsMSA',
  'VHjGevgEGjyPpegZRg65x4R-Qck',
  'NOOBHYwxep0dUtjQjJFBvmTqcyg',
  'oQz74xh8-2wsPaaA0518w6vWvzU',
];

async function checkQuotes(page, rfpId) {
  await page.goto(`${BASE_URL}/group/${GROUP}/${rfpId}#gridInit/medical`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForPageReady(page);
  await page.waitForTimeout(3000);
  const bodyText = await page.locator('body').innerText();
  return {
    rfpId,
    url: page.url(),
    hasNoQuotes: /no quotes available/i.test(bodyText),
    noQuotesMatch: bodyText.match(/no quotes available[^\n]*/i)?.[0] || null,
    hasQuoteContent: /quote received|current plan|renewal plan|carrier/i.test(bodyText),
    snippet: bodyText.slice(0, 1500),
  };
}

async function getCommunityRatedRadios(page) {
  await page.goto(`${BASE_URL}/group/${GROUP}/vVi3pQjveGO4O7BIfu6YqyPcmsQ#rfpBuilderCommunityRatedPlans?continue=1&noRedirect=1`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await waitForPageReady(page, 90000);
  await page.waitForTimeout(4000);

  return page.locator('input[type="radio"]').evaluateAll((els) =>
    els.map((el) => {
      const label =
        el.labels?.[0]?.textContent ||
        document.querySelector(`label[for="${el.id}"]`)?.textContent ||
        el.closest('label')?.textContent ||
        '';
      return {
        name: el.name,
        id: el.id,
        value: el.value,
        checked: el.checked,
        label: (label || '').replace(/\s+/g, ' ').trim(),
      };
    }),
  );
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 }, storageState: AUTH_STATE_PATH });
  const page = await context.newPage();
  const report = {};

  await sessionIsValid(page, BASE_URL);
  report.communityRatedRadios = await getCommunityRatedRadios(page);
  report.quotesChecks = [];
  for (const id of RFPS) {
    report.quotesChecks.push(await checkQuotes(page, id));
  }

  fs.writeFileSync('/workspace/automation-output/ps-8919-quotes-fail-scan.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

main();
