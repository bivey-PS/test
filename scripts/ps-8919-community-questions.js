const { chromium } = require('playwright');
const { AUTH_STATE_PATH, sessionIsValid, waitForPageReady } = require('./lib/plansight-login');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ storageState: AUTH_STATE_PATH })).newPage();
  await sessionIsValid(page, 'https://jeff.plansight.com');
  await page.goto('https://jeff.plansight.com/group/QJTbWHW9aoWhyKuwtGnBd8thjcs/vVi3pQjveGO4O7BIfu6YqyPcmsQ#rfpBuilderCommunityRatedPlans?continue=1&noRedirect=1');
  await waitForPageReady(page, 90000);
  await page.waitForTimeout(4000);

  const questions = await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll('h2, h3, h4, p, label, .control-label, .question, .form-group')).filter((el) =>
      /community rated|explore community/i.test(el.textContent),
    );
    return headings.map((el) => {
      const container = el.closest('.form-group, .ibox-content, .panel, div') || el.parentElement;
      const options = container
        ? Array.from(container.querySelectorAll('.option-label, button, label, input')).map((opt) => ({
            tag: opt.tagName,
            text: (opt.textContent || opt.value || '').trim(),
            classes: opt.className,
            name: opt.name,
            type: opt.type,
            checked: opt.checked,
            selected: opt.classList.contains('selected') || opt.classList.contains('active'),
          }))
        : [];
      return {
        question: (el.textContent || '').replace(/\s+/g, ' ').trim(),
        containerClass: container?.className,
        options,
      };
    });
  });

  console.log(JSON.stringify(questions, null, 2));
  await browser.close();
}

main();
