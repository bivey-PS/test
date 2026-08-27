import * as fs from 'fs';
import { test, expect } from './helpers/fixtures';
import { env, uniqueRfpName } from './helpers/env';
import { AppShell, GroupsPage, expectNoServerError } from './helpers/pages';
import { selectors } from './helpers/selectors';
import { resolve } from './helpers/resolve';

/**
 * PS-9250 Minimum Gate (must pass).
 *
 * A single ordered end-to-end flow mirroring the "Minimum Gate" checklist:
 * S1.2 login -> S2.1/S2.2 groups -> S3.1..S3.16 create RFP, add a Medical quote,
 * upload the SBC doc, let AI process, and confirm it lands in the Medical grid.
 *
 * Selectors are best-guess (see helpers/selectors.ts). Confirm against
 * test.plansight.com with `npm run codegen` and update selectors.ts.
 */
test.describe('PS-9250 Minimum Gate', () => {
  test('Broker can create an RFP and add a Medical quote end-to-end', { tag: '@min-gate' }, async ({ broker }) => {
    const page = broker;
    const shell = new AppShell(page);
    const groups = new GroupsPage(page);
    const rfpName = uniqueRfpName();

    await test.step('S1.2 Broker is logged in and in the app', async () => {
      await shell.expectInApp();
    });

    await test.step('S2.1 Group List loads', async () => {
      await shell.gotoGroups();
      await groups.expectListLoaded();
    });

    await test.step('S2.2 Open an existing group', async () => {
      await groups.openGroup(env.rfpGroupName);
      await expectNoServerError(page);
      await groups.expectGroupHomeLoaded();
    });

    await test.step('S3.1 Start Marketing Event → set RFP Name → Save & Continue', async () => {
      await resolve(page, selectors.rfpWizard.startRfpButton).first().click();
      await resolve(page, selectors.rfpWizard.rfpNameInput).first().fill(rfpName);
      await resolve(page, selectors.rfpWizard.saveAndContinue).first().click();
      await page.waitForLoadState('networkidle');
    });

    await test.step('S3.3 Choose Benefit Types → Medical, Vision, Dental → Save & Continue', async () => {
      for (const bt of [selectors.rfpWizard.benefitTypeMedical, selectors.rfpWizard.benefitTypeVision, selectors.rfpWizard.benefitTypeDental]) {
        const el = resolve(page, bt).first();
        // Minimum Gate must fail closed — soft-skipping missing benefit types
        // produced false PASSes with no Medical/Vision/Dental selected.
        await expect(el).toBeVisible();
        await el.click();
      }
      await resolve(page, selectors.rfpWizard.saveAndContinue).first().click();
      await page.waitForLoadState('networkidle');
    });

    await test.step('S3.3.1 Community Rated Plans → No on both → skip census → Save & Continue', async () => {
      const noButtons = resolve(page, selectors.rfpWizard.communityRatedNo);
      // Expect both Community Rated answers; zero matches used to no-op PASS.
      await expect
        .poll(async () => noButtons.count(), { timeout: 30_000 })
        .toBeGreaterThanOrEqual(2);
      await noButtons.nth(0).click();
      await noButtons.nth(1).click();
      const skip = resolve(page, selectors.rfpWizard.skipCensus).first();
      if (await skip.isVisible().catch(() => false)) await skip.click();
      await resolve(page, selectors.rfpWizard.saveAndContinue).first().click();
      await page.waitForLoadState('networkidle');
    });

    await test.step('S3.4 Documents for Carrier Quoting → Save & Continue', async () => {
      await resolve(page, selectors.rfpWizard.saveAndContinue).first().click();
      await page.waitForLoadState('networkidle');
    });

    await test.step('S3.5 Medical Plan Details → Save & go to Distribution', async () => {
      await resolve(page, selectors.rfpWizard.saveAndContinue).first().click();
      await page.waitForLoadState('networkidle');
      await expectNoServerError(page);
    });

    await test.step('S3.6 Who Gets the RFP? → ellipsis → Medical → Quotes tab (Vision, Dental tabs present)', async () => {
      const ellipsis = resolve(page, selectors.rfpWizard.distributionEllipsis).first();
      if (await ellipsis.isVisible().catch(() => false)) await ellipsis.click();
      // Expect the Medical/Vision/Dental quote tabs to be reachable.
      await expect(resolve(page, selectors.quotes.medicalTab).first()).toBeVisible();
    });

    await test.step('S3.7 Back to employer profile link loads employer profile', async () => {
      const back = resolve(page, selectors.rfpWizard.backToEmployerProfile).first();
      await expect(back).toBeVisible();
      await back.click();
      await page.waitForLoadState('networkidle');
      await expectNoServerError(page);
      await expect(resolve(page, selectors.groups.groupHome).first()).toBeVisible();
    });

    await test.step('S3.8 Request for Proposals shows a row for the created RFP', async () => {
      await expect(resolve(page, selectors.rfpList.nameLink(rfpName)).first()).toBeVisible();
    });

    await test.step('S3.9 Open the RFP via its Name link', async () => {
      await resolve(page, selectors.rfpList.nameLink(rfpName)).first().click();
      await page.waitForLoadState('networkidle');
      await expectNoServerError(page);
    });

    await test.step('S3.10 RFP Basics → ellipsis → Medical row', async () => {
      const ellipsis = resolve(page, selectors.rfpWizard.distributionEllipsis).first();
      await expect(ellipsis).toBeVisible();
      await ellipsis.click();
      const medical = resolve(page, selectors.quotes.medicalTab).first();
      await expect(medical).toBeVisible();
      await medical.click();
    });

    await test.step('S3.11 Medical Quotes → Add Quote (+)', async () => {
      await resolve(page, selectors.quotes.addQuoteButton).first().click();
    });

    await test.step('S3.12 Create New Quote → Carrier dropdown → type "a" → Enter', async () => {
      const carrier = resolve(page, selectors.quotes.carrierCombobox).first();
      await carrier.click();
      await carrier.fill('a').catch(async () => {
        await page.keyboard.type('a');
      });
      await page.keyboard.press('Enter');
    });

    await test.step('S3.13 Create New Quote → upload SBC PDF', async () => {
      test.skip(!fs.existsSync(env.sbcPdfPath), `SBC fixture not found at ${env.sbcPdfPath}; set SBC_PDF_PATH.`);
      await resolve(page, selectors.quotes.fileInput).first().setInputFiles(env.sbcPdfPath);
    });

    await test.step('S3.14 Create New Quote → submit → Quote - Medical opens', async () => {
      await resolve(page, selectors.quotes.submitQuote).first().click();
      await page.waitForLoadState('networkidle');
      await expectNoServerError(page);
    });

    await test.step('S3.15 Quote - Medical → wait for AI processing → select document → Save Changes → close', async () => {
      // AI/Planfacts processing can take a while; wait for a Save Changes affordance.
      // Swallowing the wait used to leave Save unclicked while the step PASSed.
      const save = resolve(page, selectors.quotes.saveChanges).first();
      await save.waitFor({ state: 'visible', timeout: 60_000 });
      await save.click();
    });

    await test.step('S3.16 Medical quotes grid → Aetna National column → 1 - Silver 5000 ValueCare', async () => {
      const grid = resolve(page, selectors.quotes.grid).first();
      await expect(grid).toBeVisible();
      // Require the plan fragment inside the grid — a bare grid visibility check
      // false-PASSed when the quote/plan never landed.
      await expect(grid.getByText(/Silver\s*5000\s*ValueCare/i).first()).toBeVisible();
      await expect(grid.getByText(/Aetna/i).first()).toBeVisible();
    });
  });
});
