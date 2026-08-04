const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const {
  OUTPUT_DIR,
  AUTH_STATE_PATH,
  authStateMatchesBaseUrl,
  sessionIsValid,
  navigateToEmployers,
  waitForPageReady,
} = require('./lib/plansight-login');

const BASE_URL = process.env.BASE_URL || 'https://jeff.plansight.com';
const REPORT_PATH = path.join(OUTPUT_DIR, 'ps-8919-ui-exploration.json');
const MARKDOWN_PATH = path.join(OUTPUT_DIR, 'ps-8919-ui-exploration.md');

const findings = {
  jiraTickets: ['PS-8882', 'PS-8919'],
  baseUrl: BASE_URL,
  timestamp: new Date().toISOString(),
  recommendedEnvironment: null,
  employer: null,
  rfp: null,
  steps: [],
  quotesVerification: null,
  blockers: [],
  selectors: {},
};

function recordStep(name, data) {
  findings.steps.push({ step: name, ...data });
  console.log(`\n=== ${name} ===`);
  console.log(JSON.stringify(data, null, 2));
}

async function capturePageStructure(page, label) {
  const url = page.url();
  const title = await page.title().catch(() => '');
  const headings = await page.locator('h1, h2, h3, h4, .ibox-title, .page-heading').allTextContents();
  const navLinks = await page
    .locator('.sidebar-collapse a, .group-nav-tabs-container a, .nav-tabs a')
    .evaluateAll((els) =>
      els.map((el) => ({
        text: (el.textContent || '').trim(),
        href: el.getAttribute('href'),
        classes: el.className,
      })),
    )
    .catch(() => []);

  const buttons = await page
    .locator('button, a.btn, input[type="submit"], .btn')
    .evaluateAll((els) =>
      els
        .filter((el) => el.offsetParent !== null)
        .slice(0, 40)
        .map((el) => ({
          tag: el.tagName,
          text: (el.textContent || el.value || '').trim().slice(0, 80),
          id: el.id,
          classes: el.className,
          href: el.getAttribute('href'),
        })),
    )
    .catch(() => []);

  return { label, url, title, headings: headings.map((h) => h.trim()).filter(Boolean), navLinks, buttons };
}

async function findEmployersWithRfpActions(page) {
  await page.getByRole('columnheader', { name: 'Employer' }).waitFor({ timeout: 30000 });
  await page.locator('table tbody tr').first().waitFor({ timeout: 30000 });

  const rows = await page.locator('table tbody tr').evaluateAll((trs) =>
    trs.slice(0, 30).map((tr) => {
      const link = tr.querySelector('a');
      const cells = Array.from(tr.querySelectorAll('td')).map((td) => (td.textContent || '').trim());
      return {
        employerName: link ? (link.textContent || '').trim() : cells[0] || '',
        href: link ? link.getAttribute('href') : null,
        rowText: (tr.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200),
      };
    }),
  );

  return rows.filter((r) => r.employerName);
}

async function exploreEmployerRfps(page, employerName) {
  const employerLink = page.locator('table').getByRole('link', { name: employerName, exact: true });
  await employerLink.first().waitFor({ timeout: 15000 });
  await employerLink.first().scrollIntoViewIfNeeded();
  await employerLink.first().evaluate((el) => el.click());

  await page.waitForURL(/\/group\/.*#groupUpdate/, { timeout: 30000 });
  await waitForPageReady(page);

  const employerUrl = page.url();
  const aboutVisible = await page.getByText('About This Employer').isVisible().catch(() => false);

  const rfpTable = page.locator('#pending-active-pastDue-rfp-table');
  const hasRfpTable = (await rfpTable.count()) > 0;

  let rfps = [];
  if (hasRfpTable) {
    await rfpTable.locator('tbody tr').first().waitFor({ timeout: 15000 }).catch(() => {});
    rfps = await rfpTable.locator('tbody tr').evaluateAll((rows) =>
      rows.map((row) => {
        const nameEl = row.querySelector('.name');
        const link = row.querySelector('a[href*="#marketResponse"], a[href*="#rfp"], a');
        return {
          name: nameEl ? (nameEl.textContent || '').trim() : (row.textContent || '').trim().slice(0, 80),
          href: link ? link.getAttribute('href') : null,
          rowText: (row.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 250),
        };
      }),
    );
  }

  const createRfpButtons = await page
    .locator('a, button')
    .filter({ hasText: /create.*rfp|new.*rfp|add.*rfp|request.*proposal/i })
    .evaluateAll((els) =>
      els
        .filter((el) => el.offsetParent !== null)
        .map((el) => ({
          tag: el.tagName,
          text: (el.textContent || '').trim(),
          href: el.getAttribute('href'),
          id: el.id,
          classes: el.className,
        })),
    )
    .catch(() => []);

  return {
    employerName,
    employerUrl,
    aboutVisible,
    hasRfpTable,
    rfps,
    createRfpButtons,
  };
}

async function exploreCreateRfpFlow(page) {
  const createSelectors = [
    page.getByRole('link', { name: /create.*rfp/i }),
    page.getByRole('button', { name: /create.*rfp/i }),
    page.getByRole('link', { name: /new.*rfp/i }),
    page.getByRole('button', { name: /new.*rfp/i }),
    page.locator('a[href*="createRfp"], a[href*="create-rfp"], a[href*="#rfpCreate"]'),
    page.locator('.create-rfp, #create-rfp, [data-action="create-rfp"]'),
  ];

  for (const locator of createSelectors) {
    if ((await locator.count()) > 0 && (await locator.first().isVisible())) {
      const meta = await locator.first().evaluate((el) => ({
        tag: el.tagName,
        text: (el.textContent || '').trim(),
        href: el.getAttribute('href'),
        id: el.id,
        classes: el.className,
      }));
      await locator.first().click();
      await page.waitForTimeout(2000);
      await waitForPageReady(page);
      return { clicked: meta, urlAfterClick: page.url(), structure: await capturePageStructure(page, 'create-rfp') };
    }
  }

  return { clicked: null, urlAfterClick: page.url() };
}

async function exploreRfpWizard(page) {
  const structure = await capturePageStructure(page, 'rfp-wizard');
  const bodyText = await page.locator('body').innerText().catch(() => '');

  const marketOnlyOptions = await page
    .locator('label, .radio, .checkbox, button, a, span, div')
    .filter({ hasText: /market|to market|go to market|market only|market response/i })
    .evaluateAll((els) =>
      els
        .filter((el) => el.offsetParent !== null)
        .slice(0, 20)
        .map((el) => ({
          tag: el.tagName,
          text: (el.textContent || '').trim().slice(0, 120),
          id: el.id,
          classes: el.className,
          forAttr: el.getAttribute('for'),
          inputType: el.querySelector('input')?.type,
          inputName: el.querySelector('input')?.name,
        })),
    )
    .catch(() => []);

  const benefitTypeOptions = await page
    .locator('label, .checkbox, input[type="checkbox"]')
    .filter({ hasText: /medical|dental|vision|life|disability/i })
    .evaluateAll((els) =>
      els.slice(0, 30).map((el) => {
        const input = el.tagName === 'INPUT' ? el : el.querySelector('input');
        return {
          tag: el.tagName,
          text: (el.textContent || '').trim().slice(0, 80),
          id: el.id,
          classes: el.className,
          inputId: input?.id,
          inputName: input?.name,
          inputValue: input?.value,
          checked: input?.checked,
        };
      }),
    )
    .catch(() => []);

  const acaOptions = await page
    .locator('label, .radio, span, div')
    .filter({ hasText: /aca|non.?aca|current plan|explore.*rate/i })
    .evaluateAll((els) =>
      els
        .filter((el) => el.offsetParent !== null)
        .slice(0, 20)
        .map((el) => ({
          tag: el.tagName,
          text: (el.textContent || '').trim().slice(0, 150),
          id: el.id,
          classes: el.className,
        })),
    )
    .catch(() => []);

  const censusOptions = await page
    .locator('label, button, a, span')
    .filter({ hasText: /census|upload|skip|later|without census/i })
    .evaluateAll((els) =>
      els
        .filter((el) => el.offsetParent !== null)
        .slice(0, 20)
        .map((el) => ({
          tag: el.tagName,
          text: (el.textContent || '').trim().slice(0, 120),
          id: el.id,
          classes: el.className,
          href: el.getAttribute('href'),
        })),
    )
    .catch(() => []);

  const saveButtons = await page
    .locator('button, a.btn, input[type="submit"]')
    .filter({ hasText: /save|continue|next|submit/i })
    .evaluateAll((els) =>
      els
        .filter((el) => el.offsetParent !== null)
        .map((el) => ({
          tag: el.tagName,
          text: (el.textContent || el.value || '').trim(),
          id: el.id,
          classes: el.className,
        })),
    )
    .catch(() => []);

  return {
    structure,
    bodyTextSnippet: bodyText.slice(0, 3000),
    marketOnlyOptions,
    benefitTypeOptions,
    acaOptions,
    censusOptions,
    saveButtons,
  };
}

async function exploreQuotesPage(page) {
  const quotesTab = page
    .locator('.group-nav-tabs-container')
    .getByRole('link', { name: 'Quotes', exact: true });

  const quotesTabMeta = {
    selector: '.group-nav-tabs-container a[role="link"] with name Quotes',
    playwright: "page.locator('.group-nav-tabs-container').getByRole('link', { name: 'Quotes', exact: true })",
    count: await quotesTab.count(),
    visible: (await quotesTab.count()) > 0 ? await quotesTab.first().isVisible() : false,
  };

  if (quotesTabMeta.count > 0) {
    await quotesTab.first().click();
    await page.waitForURL(/#gridInit\//, { timeout: 30000 }).catch(() => {});
    await waitForPageReady(page);
  }

  const url = page.url();
  const bodyText = await page.locator('body').innerText().catch(() => '');

  const noQuotesPatterns = [
    'no quotes available',
    'No quotes available',
    'No Quotes Available',
    'no quote',
  ];

  const matchedNoQuotes = noQuotesPatterns.filter((p) => bodyText.toLowerCase().includes(p.toLowerCase()));

  const subnavTabs = await page
    .locator('.subnav-tab, a[href*="#gridInit/"]')
    .evaluateAll((els) =>
      els
        .filter((el) => el.offsetParent !== null)
        .map((el) => ({
          text: (el.textContent || '').trim(),
          href: el.getAttribute('href'),
          classes: el.className,
          active: el.classList.contains('active-tab') || el.classList.contains('active'),
        })),
    )
    .catch(() => []);

  const gridElements = await page
    .locator('.plansight-sub-row, .grid-row, table tbody tr, .quote-row, .carrier-row')
    .count()
    .catch(() => 0);

  const passIndicators = {
    hasMedicalTab: bodyText.toLowerCase().includes('medical') || url.includes('medical'),
    hasDentalTab: bodyText.toLowerCase().includes('dental') || url.includes('dental'),
    hasGridRows: gridElements > 0,
    hasCarrierContent: /carrier|premium|rate|plan/i.test(bodyText),
    urlHasGridInit: /#gridInit\//.test(url),
  };

  const failIndicators = {
    noQuotesTextFound: matchedNoQuotes,
    emptyGrid: gridElements === 0,
  };

  const pass = matchedNoQuotes.length === 0 && (passIndicators.urlHasGridInit || passIndicators.hasGridRows || passIndicators.hasCarrierContent);

  return {
    quotesTabMeta,
    url,
    pass,
    passIndicators,
    failIndicators,
    subnavTabs,
    gridRowCount: gridElements,
    bodyTextSnippet: bodyText.slice(0, 2000),
  };
}

async function tryNavigateToMarketResponse(page, rfpName) {
  const rfpTable = page.locator('#pending-active-pastDue-rfp-table');
  const shadybrookLink = rfpTable.locator('a[href*="#marketResponse"]').filter({
    has: page.locator('.name', { hasText: rfpName }),
  });

  if ((await shadybrookLink.count()) === 0) {
    const anyMarketLink = rfpTable.locator('a[href*="#marketResponse"]').first();
    if ((await anyMarketLink.count()) === 0) {
      return null;
    }
    await anyMarketLink.scrollIntoViewIfNeeded();
    await anyMarketLink.evaluate((el) => el.click());
  } else {
    await shadybrookLink.first().scrollIntoViewIfNeeded();
    await shadybrookLink.first().evaluate((el) => el.click());
  }

  await page.waitForURL(/#marketResponse/, { timeout: 30000 });
  await waitForPageReady(page);

  const structure = await capturePageStructure(page, 'market-response');
  const navTabs = await page
    .locator('.group-nav-tabs-container a')
    .evaluateAll((els) =>
      els.map((el) => ({
        text: (el.textContent || '').trim(),
        href: el.getAttribute('href'),
        classes: el.className,
      })),
    );

  return { url: page.url(), structure, navTabs };
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  if (!authStateMatchesBaseUrl(BASE_URL)) {
    findings.blockers.push(`Auth state at ${AUTH_STATE_PATH} does not match ${BASE_URL}`);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    storageState: AUTH_STATE_PATH,
  });
  const page = await context.newPage();

  try {
    const valid = await sessionIsValid(page, BASE_URL);
    recordStep('0-session-check', { valid, url: page.url() });

    if (!valid) {
      findings.blockers.push('Saved auth session expired or invalid — re-login required');
      throw new Error('Auth session invalid');
    }

    findings.recommendedEnvironment = BASE_URL.includes('jeff.') ? 'jeff' : 'test';

    const dashboardUrl = `${BASE_URL.replace(/\/$/, '')}/app#dashboard`;
    await page.goto(dashboardUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForPageReady(page);

    recordStep('1-dashboard', await capturePageStructure(page, 'dashboard'));

    await navigateToEmployers(page);
    recordStep('2-employers-list', {
      ...(await capturePageStructure(page, 'employers')),
      employers: await findEmployersWithRfpActions(page),
    });

    const targetEmployer = 'Ace Testing';
    const employerInfo = await exploreEmployerRfps(page, targetEmployer);
    findings.employer = employerInfo;
    recordStep('3-employer-detail', employerInfo);

    findings.selectors.employersSidebar = "page.locator('.sidebar-collapse li.employers a')";
    findings.selectors.employerLink = `page.locator('table').getByRole('link', { name: '${targetEmployer}', exact: true })`;
    findings.selectors.rfpTable = '#pending-active-pastDue-rfp-table';
    findings.selectors.marketResponseLink = "rfpTable.locator('a[href*=\"#marketResponse\"]')";

    const existingMarketRfp = employerInfo.rfps.find((r) => r.href?.includes('#marketResponse'));
    if (existingMarketRfp) {
      findings.rfp = {
        strategy: 'reuse-existing-to-market-rfp',
        name: existingMarketRfp.name,
        href: existingMarketRfp.href,
      };

      const marketResponse = await tryNavigateToMarketResponse(page, existingMarketRfp.name.split('\n')[0].trim());
      recordStep('6-market-response', marketResponse);

      const quotes = await exploreQuotesPage(page);
      findings.quotesVerification = quotes;
      recordStep('7-8-quotes-verification', quotes);

      await page.screenshot({ path: path.join(OUTPUT_DIR, 'ps-8919-quotes.png'), fullPage: false });
    } else {
      findings.blockers.push('No existing to-market RFP found on Ace Testing — exploring create flow');

      const createFlow = await exploreCreateRfpFlow(page);
      recordStep('4-create-rfp-entry', createFlow);

      const wizard = await exploreRfpWizard(page);
      recordStep('5-rfp-wizard-fields', wizard);
    }

    findings.selectors.quotesTab =
      "page.locator('.group-nav-tabs-container').getByRole('link', { name: 'Quotes', exact: true })";
    findings.selectors.passCondition = 'Page does NOT contain "no quotes available" (case-insensitive); URL matches #gridInit/medical or #gridInit/dental';
    findings.selectors.failCondition = 'Body text contains "no quotes available" OR quotes grid is empty with no carrier/rate content';

  } catch (error) {
    findings.blockers.push(error.message);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'ps-8919-error.png'), fullPage: true }).catch(() => {});
    console.error('Exploration error:', error);
  } finally {
    fs.writeFileSync(REPORT_PATH, JSON.stringify(findings, null, 2));
    writeMarkdownReport(findings);
    console.log(`\nWrote ${REPORT_PATH}`);
    console.log(`Wrote ${MARKDOWN_PATH}`);
    await browser.close();
  }
}

function writeMarkdownReport(data) {
  const lines = [
    '# PS-8919 / PS-8882 UI Exploration Report',
    '',
    `- **Timestamp:** ${data.timestamp}`,
    `- **Base URL:** ${data.baseUrl}`,
    `- **Recommended environment:** ${data.recommendedEnvironment || 'jeff (auth state saved for jeff.plansight.com)'}`,
    '',
    '## Employer / RFP Strategy',
    '',
  ];

  if (data.employer) {
    lines.push(`- **Employer:** ${data.employer.employerName}`);
    lines.push(`- **Employer URL pattern:** \`/group/{groupId}#groupUpdate\``);
    lines.push(`- **Actual URL:** ${data.employer.employerUrl}`);
    lines.push(`- **RFP table present:** ${data.employer.hasRfpTable}`);
    if (data.employer.createRfpButtons?.length) {
      lines.push('- **Create RFP controls:**');
      for (const btn of data.employer.createRfpButtons) {
        lines.push(`  - \`${btn.text}\` (${btn.tag}, href=${btn.href || 'n/a'})`);
      }
    }
    if (data.employer.rfps?.length) {
      lines.push('- **Existing RFPs:**');
      for (const rfp of data.employer.rfps.slice(0, 10)) {
        lines.push(`  - ${rfp.name} → ${rfp.href || 'no link'}`);
      }
    }
  }

  if (data.rfp) {
    lines.push('', '### Recommended RFP', '');
    lines.push(`- **Strategy:** ${data.rfp.strategy}`);
    lines.push(`- **RFP name:** ${data.rfp.name}`);
    lines.push(`- **Link pattern:** \`a[href*="#marketResponse"]\``);
  }

  lines.push('', '## Step-by-Step Locators', '');

  const locatorSteps = [
    ['1. Login / Dashboard', "Navigate to `${BASE_URL}/app#dashboard`; verify `page.getByText(/Welcome .+/)`"],
    ['2. Employers', "`.sidebar-collapse li.employers a` → wait for `#groupList` and `All Employers`"],
    ['3. Open employer', "`page.locator('table').getByRole('link', { name: 'Ace Testing', exact: true })`"],
    ['4. RFP table', '`#pending-active-pastDue-rfp-table`'],
    ['5. Market response link', "`rfpTable.locator('a[href*=\"#marketResponse\"]').filter({ has: page.locator('.name', { hasText: '<RFP name>' }) })`"],
    ['6. Quotes tab', "`.group-nav-tabs-container` → `getByRole('link', { name: 'Quotes', exact: true })`"],
    ['7. Quotes subnav', "`a[href*='#gridInit/medical']`, `a[href*='#gridInit/dental']`"],
  ];

  for (const [step, locator] of locatorSteps) {
    lines.push(`### ${step}`, '', '```javascript', locator, '```', '');
  }

  if (data.quotesVerification) {
    lines.push('## Quotes Page Pass / Fail', '');
    lines.push(`- **Result:** ${data.quotesVerification.pass ? 'PASS' : 'FAIL'}`);
    lines.push(`- **URL:** ${data.quotesVerification.url}`);
    lines.push(`- **Pass indicators:** ${JSON.stringify(data.quotesVerification.passIndicators)}`);
    lines.push(`- **Fail indicators:** ${JSON.stringify(data.quotesVerification.failIndicators)}`);
    lines.push('- **Pass:** Quotes grid/tab loads; no "no quotes available" message');
    lines.push('- **Fail:** Body contains "no quotes available" (any casing)');
  }

  if (data.blockers.length) {
    lines.push('', '## Blockers', '');
    for (const b of data.blockers) {
      lines.push(`- ${b}`);
    }
  }

  fs.writeFileSync(MARKDOWN_PATH, `${lines.join('\n')}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
