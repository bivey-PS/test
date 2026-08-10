const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { AUTH_STATE_PATH, sessionIsValid, waitForPageReady } = require('./lib/plansight-login');

const BASE_URL = 'https://jeff.plansight.com';
const SHADYBROOK = `${BASE_URL}/group/QJTbWHW9aoWhyKuwtGnBd8thjcs/vVi3pQjveGO4O7BIfu6YqyPcmsQ`;

async function extractFields(page) {
  return page.evaluate(() => {
    const out = [];
    document.querySelectorAll('input, select, textarea, label, button, a').forEach((el) => {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0 && el.tagName !== 'INPUT') return;
      const text = (el.textContent || el.value || '').replace(/\s+/g, ' ').trim();
      if (!text && el.tagName !== 'INPUT') return;
      if (/aca|community|census|market|medical|dental|skip|upload|save|continue|non/i.test(text + (el.name || '') + (el.id || ''))) {
        out.push({
          tag: el.tagName,
          text: text.slice(0, 150),
          name: el.name,
          id: el.id,
          type: el.type,
          href: el.getAttribute('href'),
          classes: (el.className || '').slice(0, 80),
          checked: el.checked,
        });
      }
    });
    return out;
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 }, storageState: AUTH_STATE_PATH });
  const page = await context.newPage();
  const report = {};

  await sessionIsValid(page, BASE_URL);

  await page.goto(`${SHADYBROOK}#rfpBuilderPlanDetails?planType=medical`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForPageReady(page, 90000);
  await page.waitForTimeout(5000);

  report.entry = {
    url: page.url(),
    sidebar: await page.locator('a').evaluateAll((els) =>
      els
        .filter((el) => /rfpBuilder|Community|Benefit|Census|Review|Distribution/i.test(el.textContent + el.getAttribute('href')))
        .map((el) => ({ text: (el.textContent || '').trim(), href: el.getAttribute('href') })),
    ),
    bodySnippet: (await page.locator('body').innerText()).slice(0, 3000),
  };

  const communityRatedLink = page.getByRole('link', { name: 'Community Rated', exact: true });
  report.communityRatedLinkCount = await communityRatedLink.count();

  if ((await communityRatedLink.count()) > 0) {
    await communityRatedLink.click();
    await waitForPageReady(page, 90000);
    await page.waitForTimeout(5000);
    report.communityRated = {
      url: page.url(),
      fields: await extractFields(page),
      bodySnippet: (await page.locator('body').innerText()).slice(0, 8000),
    };
    await page.screenshot({ path: '/workspace/automation-output/ps-8919-community-rated-page.png', fullPage: true });
  }

  await page.goto(`${SHADYBROOK}#rfpBuilderPlanTypes?continue=1&noRedirect=1`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForPageReady(page, 90000);
  await page.waitForTimeout(3000);
  report.benefitTypes = {
    url: page.url(),
    sidebar: await page.locator('a').evaluateAll((els) =>
      els
        .filter((el) => /rfpBuilder|Community|Benefit|Census|Review|Distribution/i.test(el.textContent + el.getAttribute('href')))
        .map((el) => ({ text: (el.textContent || '').trim(), href: el.getAttribute('href') })),
    ),
    bodySnippet: (await page.locator('body').innerText()).slice(0, 4000),
  };

  fs.writeFileSync('/workspace/automation-output/ps-8919-community-rated-nav.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

main();
