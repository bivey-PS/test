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
const REPORT_PATH = path.join(OUTPUT_DIR, 'ps-8919-rfp-wizard-exploration.json');

async function dumpVisibleText(page, filterRe) {
  return page
    .locator('label, button, a, h1, h2, h3, h4, .ibox-title, .control-label, .radio, .checkbox, span, p')
    .filter({ hasText: filterRe })
    .evaluateAll((els) =>
      els
        .filter((el) => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
        })
        .slice(0, 40)
        .map((el) => {
          const input = el.tagName === 'INPUT' ? el : el.querySelector('input, select, textarea');
          return {
            tag: el.tagName,
            text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160),
            id: el.id,
            classes: el.className?.slice?.(0, 120) || el.className,
            inputType: input?.type,
            inputName: input?.name,
            inputId: input?.id,
            inputValue: input?.value,
            checked: input?.checked,
            forAttr: el.getAttribute('for'),
          };
        }),
    );
}

async function captureStep(page, stepName) {
  await waitForPageReady(page);
  const url = page.url();
  const hash = url.split('#')[1] || '';
  const screenshot = path.join(OUTPUT_DIR, `ps-8919-wizard-${stepName.replace(/\W+/g, '-')}.png`);
  await page.screenshot({ path: screenshot, fullPage: false });

  const navTabs = await page.locator('.nav-tabs a, .wizard-nav a, .rfp-wizard-nav a, .steps a').evaluateAll((els) =>
    els.map((el) => ({ text: (el.textContent || '').trim(), href: el.getAttribute('href'), classes: el.className })),
  );

  const iboxTitles = await page.locator('.ibox-title, .page-heading, h2, h3').allTextContents();

  return {
    stepName,
    url,
    hash,
    screenshot,
    iboxTitles: iboxTitles.map((t) => t.trim()).filter(Boolean).slice(0, 20),
    navTabs,
    marketText: await dumpVisibleText(page, /market|to market|renewal|enrollment|go to market/i),
    benefitText: await dumpVisibleText(page, /medical|dental|vision|benefit type/i),
    acaText: await dumpVisibleText(page, /aca|non.?aca|current plan|explore.*rate|grandfather/i),
    censusText: await dumpVisibleText(page, /census|upload|skip|without census|employee data/i),
    saveButtons: await page
      .locator('button, a.btn, input[type="submit"]')
      .filter({ hasText: /save|continue|next|submit|finish|send to market/i })
      .evaluateAll((els) =>
        els
          .filter((el) => el.offsetParent !== null)
          .map((el) => ({
            tag: el.tagName,
            text: (el.textContent || el.value || '').trim(),
            id: el.id,
            classes: el.className,
          })),
      ),
  };
}

async function main() {
  const report = { steps: [], blockers: [] };
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    storageState: AUTH_STATE_PATH,
  });
  const page = await context.newPage();

  try {
    if (!(await sessionIsValid(page, BASE_URL))) {
      throw new Error('Auth session invalid');
    }

    await navigateToEmployers(page);
    const employerLink = page.locator('table').getByRole('link', { name: 'Ace Testing', exact: true });
    await employerLink.first().click();
    await page.waitForURL(/#groupUpdate/, { timeout: 30000 });
    await waitForPageReady(page);

    report.steps.push(await captureStep(page, 'employer-profile'));

    const rfpTable = page.locator('#pending-active-pastDue-rfp-table');
    await rfpTable.waitFor({ timeout: 30000 });

    const wizardLink = rfpTable.getByRole('link', { name: 'Open RFP Wizard', exact: true }).first();
    const wizardCount = await wizardLink.count();

    report.openRfpWizard = {
      count: wizardCount,
      playwright: "rfpTable.getByRole('link', { name: 'Open RFP Wizard', exact: true })",
    };

    if (wizardCount === 0) {
      const draftRfp = rfpTable.locator('a[href*="#rfpBuilderBasics"]').first();
      report.blockers.push('No Open RFP Wizard link — trying draft RFP basics link');
      await draftRfp.click();
    } else {
      await wizardLink.scrollIntoViewIfNeeded();
      await wizardLink.click();
    }

    await page.waitForTimeout(3000);
    await waitForPageReady(page);
    report.steps.push(await captureStep(page, 'wizard-entry'));

    const wizardHashes = ['#rfpBuilderBasics', '#rfpBuilderBenefitTypes', '#rfpBuilderCensus', '#rfpBuilderBenefits'];
    for (const hash of wizardHashes) {
      const link = page.locator(`a[href*="${hash}"]`).first();
      if ((await link.count()) > 0 && (await link.isVisible())) {
        await link.click();
        await page.waitForTimeout(2000);
        report.steps.push(await captureStep(page, hash.replace('#', '')));
      }
    }

    const allWizardLinks = await page
      .locator('a[href*="rfpBuilder"], a[href*="RfpBuilder"], .wizard-nav a, .nav-tabs a')
      .evaluateAll((els) =>
        els
          .filter((el) => el.offsetParent !== null)
          .map((el) => ({ text: (el.textContent || '').trim(), href: el.getAttribute('href'), classes: el.className })),
      );
    report.allWizardLinks = allWizardLinks;

    const bodyText = await page.locator('body').innerText();
    report.bodyKeywords = {
      toMarket: /to market|go to market|market only|send to market/i.test(bodyText),
      medical: /medical/i.test(bodyText),
      dental: /dental/i.test(bodyText),
      aca: /aca|non.?aca|explore.*rate/i.test(bodyText),
      census: /census|upload census|skip/i.test(bodyText),
    };

  } catch (err) {
    report.blockers.push(err.message);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'ps-8919-wizard-error.png'), fullPage: true }).catch(() => {});
  } finally {
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    await browser.close();
  }
}

main();
