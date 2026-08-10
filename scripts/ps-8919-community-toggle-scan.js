const { chromium } = require('playwright');
const { AUTH_STATE_PATH, sessionIsValid, waitForPageReady } = require('./lib/plansight-login');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ storageState: AUTH_STATE_PATH })).newPage();
  await sessionIsValid(page, 'https://jeff.plansight.com');
  await page.goto('https://jeff.plansight.com/group/QJTbWHW9aoWhyKuwtGnBd8thjcs/vVi3pQjveGO4O7BIfu6YqyPcmsQ#rfpBuilderCommunityRatedPlans?continue=1&noRedirect=1');
  await waitForPageReady(page, 90000);
  await page.waitForTimeout(4000);

  const toggles = await page.locator('button, label, .btn, .radio, .toggle, span').evaluateAll((els) =>
    els
      .filter((el) => el.offsetParent !== null && /^(Yes|No)$/i.test((el.textContent || '').trim()))
      .map((el) => ({
        tag: el.tagName,
        text: (el.textContent || '').trim(),
        id: el.id,
        classes: el.className,
        name: el.getAttribute('name'),
        aria: el.getAttribute('aria-pressed') || el.getAttribute('aria-checked'),
        parentText: (el.parentElement?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200),
      })),
  );

  const hiddenInputs = await page.locator('input[type="radio"], input[type="checkbox"]').evaluateAll((els) =>
    els.map((el) => ({
      name: el.name,
      id: el.id,
      value: el.value,
      checked: el.checked,
      label: (el.labels?.[0]?.textContent || document.querySelector(`label[for="${el.id}"]`)?.textContent || '').trim(),
    })),
  );

  console.log(JSON.stringify({ toggles, hiddenInputs }, null, 2));
  await browser.close();
}

main();
