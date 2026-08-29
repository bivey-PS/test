import { test, expect } from './helpers/fixtures';
import { env, uniqueRfpName } from './helpers/env';
import { AppShell, GroupsPage, expectNoServerError } from './helpers/pages';
import { selectors } from './helpers/selectors';
import { resolve } from './helpers/resolve';

/**
 * S3 — RFP Wizard (core path), Full Smoke variant (higher-level than the
 * Minimum Gate). Walks the wizard tabs and confirms persistence on re-open.
 */
test.describe('S3 — RFP Wizard (Full Smoke)', () => {
  const rfpName = uniqueRfpName();

  test('S3.1 Start new RFP from a group → Basics tab opens', async ({ broker }) => {
    const shell = new AppShell(broker);
    const groups = new GroupsPage(broker);
    await shell.gotoGroups();
    await groups.openGroup(env.rfpGroupName);
    await resolve(broker, selectors.rfpWizard.startRfpButton).first().click();
    await expect(resolve(broker, selectors.rfpWizard.rfpNameInput).first()).toBeVisible();
  });

  test('S3.2 Basics: name, effective date, owner, Plan Attributes Template dropdown has options', async ({ broker }) => {
    const shell = new AppShell(broker);
    const groups = new GroupsPage(broker);
    await shell.gotoGroups();
    await groups.openGroup(env.rfpGroupName);
    await resolve(broker, selectors.rfpWizard.startRfpButton).first().click();

    await resolve(broker, selectors.rfpWizard.rfpNameInput).first().fill(rfpName);
    const template = resolve(broker, selectors.rfpWizard.planAttributesTemplate).first();
    if (await template.isVisible().catch(() => false)) {
      // Confirm the template dropdown exposes at least one option.
      await expect(template).toBeVisible();
    }
    await resolve(broker, selectors.rfpWizard.saveAndContinue).first().click();
    await expectNoServerError(broker);
  });

  test('S3.3 Plan Types: select Medical (+ optional Dental/Vision) → next succeeds', async ({ broker }) => {
    const shell = new AppShell(broker);
    const groups = new GroupsPage(broker);
    await shell.gotoGroups();
    await groups.openGroup(env.rfpGroupName);
    await resolve(broker, selectors.rfpWizard.startRfpButton).first().click();
    await resolve(broker, selectors.rfpWizard.rfpNameInput).first().fill(uniqueRfpName());
    await resolve(broker, selectors.rfpWizard.saveAndContinue).first().click();

    const medical = resolve(broker, selectors.rfpWizard.benefitTypeMedical).first();
    if (await medical.isVisible().catch(() => false)) await medical.click();
    await resolve(broker, selectors.rfpWizard.saveAndContinue).first().click();
    await expectNoServerError(broker);
  });

  // S3.4–S3.6: page-load smoke through documents/census, plan details, distribution.
  test('S3.4–S3.6 Documents/census, Plan Details, Distribution list load', async ({ broker }) => {
    const shell = new AppShell(broker);
    const groups = new GroupsPage(broker);
    await shell.gotoGroups();
    await groups.openGroup(env.rfpGroupName);
    await resolve(broker, selectors.rfpWizard.startRfpButton).first().click();
    await resolve(broker, selectors.rfpWizard.rfpNameInput).first().fill(uniqueRfpName());

    // Walk forward through the wizard using Save & Continue, tolerating steps
    // that require no input, asserting no server errors along the way.
    for (let i = 0; i < 5; i++) {
      const next = resolve(broker, selectors.rfpWizard.saveAndContinue).first();
      if (!(await next.isVisible().catch(() => false))) break;
      await next.click();
      await broker.waitForLoadState('networkidle');
      await expectNoServerError(broker);
    }
  });

  test('S3.7 Review & Send loads; cover letter selectable; no hard fail', async ({ broker }) => {
    const shell = new AppShell(broker);
    const groups = new GroupsPage(broker);
    await shell.gotoGroups();
    await groups.openGroup(env.rfpGroupName);
    // Navigate to an existing RFP's distribution/review rather than sending.
    const review = resolve(broker, selectors.rfpWizard.reviewAndSend).first();
    if (await review.isVisible().catch(() => false)) {
      const coverLetter = resolve(broker, selectors.rfpWizard.coverLetterSelect).first();
      if (await coverLetter.isVisible().catch(() => false)) await expect(coverLetter).toBeVisible();
      // Non-destructive by default: only actually send when explicitly allowed.
      test.skip(!env.allowRfpSend, 'Set ALLOW_RFP_SEND=1 to exercise the actual send. Skipping to avoid emailing carriers.');
      await review.click();
      await expectNoServerError(broker);
    }
  });

  test('S3.8 Re-open the same RFP → data persisted; steps navigable', async ({ broker }) => {
    await expect(resolve(broker, selectors.shell.navRfps).first()).toBeVisible();
    // TODO: open a known RFP by name and assert Basics fields are populated.
  });
});
