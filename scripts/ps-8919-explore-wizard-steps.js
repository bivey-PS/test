const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const {
  OUTPUT_DIR,
  AUTH_STATE_PATH,
  sessionIsValid,
  navigateToEmployers,
  waitForPageReady,
} = require('./lib/plansight-login');

const BASE_URL = process.env.BASE_URL || 'https://jeff.plansight.com';
const GROUP_ID = 'QJTbWHW9aoWhyKuwtGnBd8thjcs';
const DRAFT_RFP_ID = 'CixRn3-IhGlvJJqkgQiWlMRsMSA';

async function extractFormFields(page) {
  return page.evaluate(() => {
    const results = [];
    const inputs = document.querySelectorAll('input, select, textarea, label, .checkbox, .radio');
    inputs.forEach((el) => {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      const label =
        el.tagName === 'LABEL'
          ? el.textContent
          : el.labels?.[0]?.textContent ||
            document.querySelector(`label[for="${el.id}"]`)?.textContent ||
            el.closest('label')?.textContent ||
            el.getAttribute('aria-label') ||
            '';

      results.push({
        tag: el.tagName,
        type: el.type || el.tagName.toLowerCase(),
        name: el.name,
        id: el.id,
        value: el.value,
        checked: el.checked,
        label: (label || '').replace(/\s+/g, ' ').trim().slice(0, 150),
        classes: (el.className || '').slice(0, 100),
      });
    });
    return results.slice(0, 100);
  });
}

async function exploreWizardStep(page, hash, stepName) {
  const url = `${BASE_URL}/group/${GROUP_ID}/${DRAFT_RFP_ID}${hash}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForPageReady(page);
  await page.waitForTimeout(2500);

  const screenshot = path.join(OUTPUT_DIR, `ps-8919-step-${stepName}.png`);
  await page.screenshot({ path: screenshot, fullPage: true });

  const bodyText = await page.locator('body').innerText();
  const fields = await extractFormFields(page);

  const sidebarLinks = await page.locator('a[href*="rfpBuilder"]').evaluateAll((els) =>
    els.map((el) => ({ text: (el.textContent || '').trim(), href: el.getAttribute('href') })),
  );

  const buttons = await page
    .locator('button, a.btn, input[type="submit"]')
    .filter({ hasText: /.+/ })
    .evaluateAll((els) =>
      els
        .filter((el) => el.offsetParent !== null)
        .map((el) => ({
          text: (el.textContent || el.value || '').trim(),
          id: el.id,
          classes: el.className,
        })),
    );

  return {
    stepName,
    url: page.url(),
    screenshot,
    sidebarLinks,
    buttons,
    fields,
    bodyTextSnippet: bodyText.slice(0, 4000),
    keywordHits: {
      toMarket: bodyText.match(/to market|go to market|market only|send to market|market response only/gi),
      medical: bodyText.match(/\bmedical\b/gi)?.length || 0,
      dental: bodyText.match(/\bdental\b/gi)?.length || 0,
      aca: bodyText.match(/aca|non.?aca|explore.*rate|grandfather|current non/gi),
      census: bodyText.match(/census|upload|skip|without census|employee data/gi),
      noQuotes: bodyText.match(/no quotes available/gi),
    },
  };
}

async function exploreStartNewRfp(page) {
  await navigateToEmployers(page);
  const employerLink = page.locator('table').getByRole('link', { name: 'Ace Testing', exact: true });
  await employerLink.first().click();
  await page.waitForURL(/#groupUpdate/, { timeout: 30000 });
  await waitForPageReady(page);

  const select2Container = page.locator('#select2-select_benefit-history-active-table-action-type-container');
  const startNewRfpText = page.getByText('Start New RFP', { exact: true });

  return {
    note: 'Start New RFP lives in Plans section select2 dropdown (#select_benefit-history-active-table-action-type)',
    select2Container: '#select2-select_benefit-history-active-table-action-type-container',
    hiddenSelect: '#select_benefit-history-active-table-action-type',
    playwrightOpenDropdown: "page.locator('#select2-select_benefit-history-active-table-action-type-container').click()",
    playwrightChooseOption: "page.getByRole('option', { name: 'Start New RFP' }).click()",
    visible: (await select2Container.count()) > 0,
    startNewRfpVisible: (await startNewRfpText.count()) > 0,
  };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    storageState: AUTH_STATE_PATH,
  });
  const page = await context.newPage();
  const report = {};

  try {
    if (!(await sessionIsValid(page, BASE_URL))) throw new Error('Auth session invalid');

    report.startNewRfp = await exploreStartNewRfp(page);

    const wizardSteps = [
      ['#rfpBuilderBasics?continue=1&noRedirect=1', 'basics'],
      ['#rfpBuilderPlanTypes?continue=1&noRedirect=1', 'benefit-types'],
      ['#rfpBuilderDocuments?continue=1&noRedirect=1', 'documents'],
      ['#rfpBuilderPlanDetails?continue=1&noRedirect=1', 'plan-details'],
      ['#rfpBuilderDistributionList?continue=1&noRedirect=1', 'distribution'],
      ['#rfpBuilderReviewAndSend?continue=1&noRedirect=1', 'review-send'],
    ];

    report.wizardSteps = [];
    for (const [hash, name] of wizardSteps) {
      report.wizardSteps.push(await exploreWizardStep(page, hash, name));
    }

    report.quotesCheck = await (async () => {
      const shadybrookUrl = `${BASE_URL}/group/${GROUP_ID}/vVi3pQjveGO4O7BIfu6YqyPcmsQ#marketResponse`;
      await page.goto(shadybrookUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await waitForPageReady(page);

      const quotesTab = page.locator('.group-nav-tabs-container').getByRole('link', { name: 'Quotes', exact: true });
      await quotesTab.click();
      await page.waitForURL(/#gridInit\//, { timeout: 30000 });
      await waitForPageReady(page);

      const bodyText = await page.locator('body').innerText();
      return {
        url: page.url(),
        pass: !/no quotes available/i.test(bodyText),
        hasQuoteReceived: /quote received|current plan|renewal plan/i.test(bodyText),
        noQuotesText: bodyText.match(/no quotes available/gi),
        subnavTabs: await page.locator('a[href*="#gridInit/"]').evaluateAll((els) =>
          els.filter((el) => el.offsetParent !== null).map((el) => ({
            text: (el.textContent || '').trim(),
            href: el.getAttribute('href'),
            active: el.classList.contains('active-tab'),
          })),
        ),
      };
    })();

  } catch (error) {
    report.error = error.message;
  } finally {
    const out = path.join(OUTPUT_DIR, 'ps-8919-wizard-steps-detailed.json');
    fs.writeFileSync(out, JSON.stringify(report, null, 2));
    console.log(`Wrote ${out}`);
    await browser.close();
  }
}

main();
