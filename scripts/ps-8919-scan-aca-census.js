const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { AUTH_STATE_PATH, sessionIsValid, waitForPageReady } = require('./lib/plansight-login');

const BASE_URL = 'https://jeff.plansight.com';
const GROUP = 'QJTbWHW9aoWhyKuwtGnBd8thjcs';

const RFPS = [
  { id: 'vVi3pQjveGO4O7BIfu6YqyPcmsQ', name: 'Shadybrook Lumber', hash: '#rfpBuilderPlanDetails?planType=medical' },
  { id: 'MSWuetXoCltq2duitykWFIjWA4s', name: 'Laradon Hall - Test2', hash: '#rfpBuilderPlanDetails?planType=medical' },
  { id: 'ehLrZwcsmN6l8h2U8xkXlD7iJIA', name: 'Fleet Master - Test 5', hash: '#rfpBuilderPlanDetails?planType=medical' },
  { id: 'CixRn3-IhGlvJJqkgQiWlMRsMSA', name: 'Ace Testing draft', hash: '#rfpBuilderPlanDetails?planType=medical' },
];

async function scanPage(page, label) {
  await waitForPageReady(page);
  await page.waitForTimeout(2000);
  const bodyText = await page.locator('body').innerText();
  const acaMatches = [...bodyText.matchAll(/[^\n]{0,80}(aca|non.?aca|grandfather|explore.{0,20}rate|current non)[^\n]{0,80}/gi)].map((m) => m[0].trim());
  const censusMatches = [...bodyText.matchAll(/[^\n]{0,80}(census|upload census|skip|without census|employee data)[^\n]{0,80}/gi)].map((m) => m[0].trim());

  const radios = await page.locator('input[type="radio"], input[type="checkbox"]').evaluateAll((els) =>
    els
      .filter((el) => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && el.offsetParent !== null;
      })
      .map((el) => {
        const label =
          el.labels?.[0]?.textContent ||
          document.querySelector(`label[for="${el.id}"]`)?.textContent ||
          el.closest('label')?.textContent ||
          '';
        return {
          type: el.type,
          name: el.name,
          id: el.id,
          value: el.value,
          checked: el.checked,
          label: (label || '').replace(/\s+/g, ' ').trim().slice(0, 120),
        };
      }),
  );

  const selects = await page.locator('select').evaluateAll((els) =>
    els.map((el) => ({
      name: el.name,
      id: el.id,
      value: el.value,
      options: Array.from(el.options)
        .slice(0, 20)
        .map((o) => o.textContent.trim()),
    })),
  );

  return {
    label,
    url: page.url(),
    acaMatches: [...new Set(acaMatches)].slice(0, 20),
    censusMatches: [...new Set(censusMatches)].slice(0, 20),
    acaRadios: radios.filter((r) => /aca|non.?aca|grandfather|explore|current non/i.test(r.label + r.name)),
    censusRadios: radios.filter((r) => /census|upload|skip|employee/i.test(r.label + r.name)),
    allRadiosSample: radios.slice(0, 30),
    selects,
    bodySnippet: bodyText.slice(0, 5000),
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 }, storageState: AUTH_STATE_PATH });
  const page = await context.newPage();
  const report = { pages: [] };

  if (!(await sessionIsValid(page, BASE_URL))) throw new Error('invalid session');

  for (const rfp of RFPS) {
    const url = `${BASE_URL}/group/${GROUP}/${rfp.id}${rfp.hash}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    report.pages.push(await scanPage(page, `${rfp.name} medical plan details`));
    await page.screenshot({ path: path.join('/workspace/automation-output', `ps-8919-aca-${rfp.id.slice(0, 8)}.png`), fullPage: true });
  }

  const censusUrl = `${BASE_URL}/group/${GROUP}/vVi3pQjveGO4O7BIfu6YqyPcmsQ#rfpBuilderDocuments?continue=1&noRedirect=1`;
  await page.goto(censusUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  report.pages.push(await scanPage(page, 'Shadybrook documents/census'));

  const groupUpdate = `${BASE_URL}/group/${GROUP}/none#groupUpdate`;
  await page.goto(groupUpdate, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForPageReady(page);
  const noQuotesRfps = await page.locator('#pending-active-pastDue-rfp-table tbody tr').evaluateAll((rows) =>
    rows.map((row) => ({
      name: row.querySelector('.name')?.textContent?.trim(),
      href: row.querySelector('a[href*="#marketResponse"]')?.getAttribute('href'),
      text: (row.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 120),
    })),
  );
  report.availableMarketRfps = noQuotesRfps.filter((r) => r.href);

  fs.writeFileSync('/workspace/automation-output/ps-8919-aca-census-scan.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

main();
